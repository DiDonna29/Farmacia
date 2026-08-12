"""Views de despacho de medicamentos con lógica FEFO."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db import connection, transaction
from django.utils import timezone
from api.permissions import IsFarmaceuticoOrAbove
from api.serializers.despacho_serializer import ProcesarDespachoSerializer, HistorialDespachoSerializer
from api.utils import fetch_bienestar_data
from api.utils.auditoria import registrar_evento, log_descarga


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class HistorialPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 50


class BuscarMedicamentoDespachoView(APIView):
    """
    Busca medicamentos disponibles para despacho.
    Solo retorna lotes con existencia > 0 y no vencidos.
    Aplica criterio FEFO: ordena por fecha de vencimiento más próxima.
    """
    permission_classes = [IsFarmaceuticoOrAbove]

    def get(self, request):
        try:
            query = request.query_params.get('q', '')
            
            with connection.cursor() as cursor:
                sql = """
                    SELECT 
                        v.id_lote, mb.nombre_generico, v.numero_lote, 
                        v.cantidad_actual, v.fecha_vencimiento, v.nombre_presentacion,
                        v.estado_logico, v.color_clase, v.medicamento_detallado,
                        v.componentes_json
                    FROM farmacia.vista_semaforo_inventario v
                    JOIN farmacia.lotes l ON v.id_lote = l.id_lote
                    JOIN farmacia.medicamentos_base mb ON l.id_med_base = mb.id_med_base
                    WHERE (
                        unaccent(v.medicamento_detallado) ILIKE unaccent(%s) 
                        OR unaccent(v.numero_lote) ILIKE unaccent(%s)
                        OR EXISTS (
                            SELECT 1 FROM farmacia.medicamento_componentes mc 
                            JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio 
                            WHERE mc.id_med_base = l.id_med_base AND unaccent(pa.nombre_principio) ILIKE unaccent(%s)
                        )
                      )
                      AND v.cantidad_actual > 0
                      AND v.fecha_vencimiento >= CURRENT_DATE
                      AND v.activo = TRUE
                    ORDER BY v.fecha_vencimiento ASC
                """
                search_param = f'%{query}%'
                cursor.execute(sql, [search_param, search_param, search_param])
                rows = cursor.fetchall()

            results = [
                {
                    'id_lote': r[0],
                    'nombre_generico': r[1],
                    'numero_lote': r[2],
                    'existencia': r[3],
                    'fecha_vencimiento': r[4].isoformat() if r[4] else '',
                    'presentacion': r[5] or 'N/A',
                    'estado_logico': r[6],
                    'color_clase': r[7],
                    'display': f"{r[8]} (Lote: {r[2]}) - Existencia: {r[3]}",
                    'medicamento_detallado': r[8],
                    'componentes_json': r[9]
                }
                for r in rows
            ]
            return Response(results)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en BuscarMedicamentoDespachoView: {str(e)}")
            return Response({'detail': f'Error interno en la búsqueda: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProcesarDespachoView(APIView):
    """Procesa el despacho de medicamentos y actualiza el existencia del lote."""
    permission_classes = [IsFarmaceuticoOrAbove]

    @transaction.atomic
    def post(self, request):
        serializer = ProcesarDespachoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        articulos = d['articulos']
        cedula_beneficiario = d['cedula_beneficiario']
        es_carga = d.get('es_carga', False)
        observaciones = d.get('observaciones', '')
        
        import uuid
        folio_grupo = uuid.uuid4()
        actas_generadas = []

        with connection.cursor() as cursor:
            for item in articulos:
                id_lote = item['id_lote']
                cantidad = item['cantidad']

                # Verificar existencia disponible
                cursor.execute("""
                    SELECT cantidad_actual, fecha_vencimiento FROM lotes WHERE id_lote = %s
                """, [id_lote])
                lote = cursor.fetchone()

                if not lote:
                    return Response({'detail': f'Lote {id_lote} no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

                existencia_actual, fecha_venc = lote
                if str(fecha_venc) < str(datetime_date_today()):
                    return Response({'detail': f'El lote {id_lote} está vencido.'}, status=status.HTTP_409_CONFLICT)
                if existencia_actual < cantidad:
                    return Response(
                        {'detail': f'Existencia insuficiente para lote {id_lote}. Disponible: {existencia_actual}.'},
                        status=status.HTTP_409_CONFLICT
                    )

                # Registrar el despacho
                cursor.execute("""
                    INSERT INTO despachos_actas (
                        id_lote, cantidad_despachada, cedula_beneficiario, nombre_beneficiario, 
                        correo_beneficiario, telefono_beneficiario,
                        id_usuario_farmaceuta, fecha_hora, es_carga, observaciones, folio_grupo,
                        parentesco_beneficiario, sexo_beneficiario, medico_tratante, especialidad,
                        cedula_titular, nombre_titular
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING orden_id
                """, [
                    id_lote, cantidad, cedula_beneficiario, d.get('nombre_beneficiario'),
                    d.get('correo_beneficiario'), d.get('telefono_beneficiario'),
                    request.user.id, es_carga, observaciones, folio_grupo,
                    d.get('parentesco_beneficiario'), d.get('sexo_beneficiario'),
                    d.get('medico_tratante'), d.get('especialidad'),
                    d.get('titular_cedula'), d.get('titular_nombre')
                ])
                orden_id = cursor.fetchone()[0]
                actas_generadas.append(str(orden_id))

                # Descontar del lote
                cursor.execute("""
                    UPDATE lotes SET cantidad_actual = cantidad_actual - %s WHERE id_lote = %s
                """, [cantidad, id_lote])

            # Auditoría del Despacho completo
            registrar_evento(
                request, 
                "DESPACHO", 
                f"Despacho procesado para beneficiario CI {cedula_beneficiario}. Folio: {folio_grupo}",
                {
                    "folio": str(folio_grupo), 
                    "articulos": len(articulos),
                    "medico_tratante": d.get('medico_tratante'),
                    "especialidad": d.get('especialidad')
                }
            )

        return Response({
            'orden_id': str(folio_grupo),
            'actas_generadas': actas_generadas,
            'message': f'Despacho procesado exitosamente ({len(actas_generadas)} items).'
        }, status=status.HTTP_201_CREATED)


def datetime_date_today():
    from datetime import date
    return date.today()


class HistorialDespachosView(APIView):
    """Historial paginado de todos los despachos realizados."""
    permission_classes = [IsFarmaceuticoOrAbove]
    pagination_class = HistorialPagination

    def get(self, request):
        fecha_desde = request.query_params.get('desde', '')
        fecha_hasta = request.query_params.get('hasta', '')
        busqueda = request.query_params.get('busqueda', '')
        
        filtro_folio = request.query_params.get('folio', '')
        filtro_cedula = request.query_params.get('cedula', '')
        filtro_farmaceutico = request.query_params.get('farmaceutico', '')

        # Override or validate dates
        from datetime import timedelta, datetime
        today = datetime_date_today()
        
        if filtro_folio or filtro_cedula:
            # Bypass date range and search up to a year ago, up to today (no future)
            fecha_desde = (today - timedelta(days=365)).strftime('%Y-%m-%d')
            fecha_hasta = today.strftime('%Y-%m-%d')
        else:
            # Standard search: ensure dates are not in the future
            if fecha_desde:
                try:
                    fd = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                    if fd > today:
                        fecha_desde = today.strftime('%Y-%m-%d')
                except ValueError:
                    pass
            if fecha_hasta:
                try:
                    fh = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                    if fh > today:
                        fecha_hasta = today.strftime('%Y-%m-%d')
                except ValueError:
                    pass

        where_clauses = []
        params = []

        if fecha_desde:
            where_clauses.append("DATE(da.fecha_hora) >= %s")
            params.append(fecha_desde)
        if fecha_hasta:
            where_clauses.append("DATE(da.fecha_hora) <= %s")
            params.append(fecha_hasta)
            
        if busqueda:
            where_clauses.append('''
                (mb.nombre_generico ILIKE %s OR l.numero_lote ILIKE %s OR CAST(da.cedula_beneficiario AS TEXT) ILIKE %s OR da.nombre_beneficiario ILIKE %s OR
                EXISTS (
                    SELECT 1 FROM farmacia.medicamento_componentes mc 
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio 
                    WHERE mc.id_med_base = mb.id_med_base AND pa.nombre_principio ILIKE %s
                ))
            ''')
            params.extend([f'%{busqueda}%'] * 5)

        if filtro_folio:
            folio_limpio = filtro_folio.replace('#', '').strip()
            where_clauses.append("(CAST(da.folio_grupo AS TEXT) ILIKE %s OR CAST(da.orden_id AS TEXT) ILIKE %s)")
            params.extend([f'%{folio_limpio}%', f'%{folio_limpio}%'])
        if filtro_cedula:
            cedula_limpia = filtro_cedula.replace('V-', '').replace('V', '').replace('E-', '').replace('E', '').replace('.', '').strip()
            where_clauses.append("(CAST(da.cedula_beneficiario AS TEXT) ILIKE %s OR CAST(da.cedula_titular AS TEXT) ILIKE %s OR da.nombre_beneficiario ILIKE %s OR da.nombre_titular ILIKE %s)")
            params.extend([f'%{cedula_limpia}%', f'%{cedula_limpia}%', f'%{cedula_limpia}%', f'%{cedula_limpia}%'])
        if filtro_farmaceutico:
            farm_limpio = filtro_farmaceutico.replace('V-', '').replace('V', '').replace('E-', '').replace('E', '').replace('.', '').strip()
            where_clauses.append("(au.first_name ILIKE %s OR au.last_name ILIKE %s OR au.username ILIKE %s)")
            params.extend([f'%{farm_limpio}%', f'%{farm_limpio}%', f'%{farm_limpio}%'])

        where_sql = ('WHERE ' + ' AND '.join(where_clauses)) if where_clauses else ''

        sql = f"""
            SELECT
                da.orden_id, da.folio_grupo, da.fecha_hora, mb.nombre_generico,
                COALESCE(pm.nombre_presentacion, 'N/A') AS nombre_presentacion,
                l.numero_lote, da.cantidad_despachada, da.cedula_beneficiario,
                COALESCE(da.nombre_beneficiario, 'N/A') AS nombre_beneficiario,
                COALESCE(da.parentesco_beneficiario, 'TITULAR') AS parentesco_beneficiario,
                COALESCE(da.sexo_beneficiario, 'N/A') AS sexo_beneficiario,
                da.es_carga, COALESCE(da.observaciones, '') AS observaciones,
                COALESCE(au.first_name || ' ' || au.last_name, 'Sistema') AS farmaceuta_nombre,
                au.username AS farmaceuta_ci,
                da.medico_tratante, da.especialidad,
                da.cedula_titular AS titular_cedula,
                da.nombre_titular AS titular_nombre,
                (
                    SELECT json_agg(
                        json_build_object(
                            'nombre_principio', pa.nombre_principio,
                            'concentracion_valor', mc.concentracion_valor,
                            'nombre_unidad', um.nombre_unidad
                        )
                    )
                    FROM farmacia.medicamento_componentes mc
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                    LEFT JOIN farmacia.unidades_medida um ON mc.id_unidad = um.id_unidad
                    WHERE mc.id_med_base = mb.id_med_base
                ) AS componentes_json
            FROM despachos_actas da
            JOIN lotes l ON da.id_lote = l.id_lote
            JOIN medicamentos_base mb ON l.id_med_base = mb.id_med_base
            LEFT JOIN presentaciones_medicamento pm ON mb.id_presentacion = pm.id_presentacion
            LEFT JOIN auth_user au ON da.id_usuario_farmaceuta = au.id
            {where_sql}
            ORDER BY da.fecha_hora DESC, da.folio_grupo DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            resultados = dictfetchall(cursor)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(resultados, request)

        items_to_enrich = page if page is not None else resultados

        # Enriquecer datos dinámicamente desde BIENESTAR (Sin guardar localmente)
        for r in items_to_enrich:
            if r.get('orden_id'):
                r['orden_id'] = str(r['orden_id'])
            if r.get('folio_grupo'):
                r['folio_grupo'] = str(r['folio_grupo'])
            
            # Localizar fecha si es necesario
            if r.get('fecha_hora'):
                dt = r['fecha_hora']
                if timezone.is_naive(dt):
                    import datetime
                    dt = dt.replace(tzinfo=datetime.timezone.utc)
                r['fecha_hora'] = timezone.localtime(dt)

            # Si ya tenemos el titular guardado en DB (nuevo esquema)
            if r.get('titular_cedula') and r.get('titular_nombre'):
                pass # Ya lo trajo la consulta SQL
            else:
                # Buscamos datos del titular en el WS/Mock para registros antiguos
                extra_info = fetch_bienestar_data(r['cedula_beneficiario'])
                if extra_info['found']:
                    r['titular_nombre'] = extra_info['titular_nombre']
                    r['titular_cedula'] = extra_info['titular_cedula']
                    if not r.get('parentesco_beneficiario') or r.get('parentesco_beneficiario') == 'N/A':
                        r['parentesco_beneficiario'] = extra_info['beneficiario_parentesco']
                else:
                    r['titular_nombre'] = 'N/A'
                    r['titular_cedula'] = 'N/A'

        if page is not None:
            serializer = HistorialDespachoSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = HistorialDespachoSerializer(resultados, many=True)
        return Response(serializer.data)

import logging
import io
from django.http import HttpResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa

# Logger para auditoría
audit_logger = logging.getLogger('api.audit')

class GenerarComprobantePDFView(APIView):
    """
    Genera un comprobante PDF para un despacho específico (folio_grupo).
    Registra una entrada en los logs de auditoría cada vez que se genera.
    """
    permission_classes = [IsFarmaceuticoOrAbove]

    def get(self, request, folio_grupo):
        try:
            # 1. Obtener datos del despacho
            with connection.cursor() as cursor:
                sql = """
                    SELECT 
                        da.folio_grupo, da.fecha_hora, da.cedula_beneficiario, 
                        da.nombre_beneficiario, da.correo_beneficiario, da.telefono_beneficiario,
                        da.parentesco_beneficiario, da.sexo_beneficiario,
                        da.observaciones,
                        mb.nombre_generico, l.numero_lote, pm.nombre_presentacion, 
                        da.cantidad_despachada,
                        au.first_name || ' ' || au.last_name as farmaceuta_nombre,
                        au.username as farmaceuta_ci,
                        da.medico_tratante, da.especialidad,
                        da.cedula_titular AS titular_cedula,
                        da.nombre_titular AS titular_nombre,
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'nombre_principio', pa.nombre_principio,
                                    'concentracion_valor', mc.concentracion_valor,
                                    'nombre_unidad', um.nombre_unidad
                                )
                            )
                            FROM farmacia.medicamento_componentes mc
                            JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                            LEFT JOIN farmacia.unidades_medida um ON mc.id_unidad = um.id_unidad
                            WHERE mc.id_med_base = mb.id_med_base
                        ) AS componentes_json
                    FROM despachos_actas da
                    JOIN lotes l ON da.id_lote = l.id_lote
                    JOIN medicamentos_base mb ON l.id_med_base = mb.id_med_base
                    LEFT JOIN presentaciones_medicamento pm ON mb.id_presentacion = pm.id_presentacion
                    JOIN auth_user au ON da.id_usuario_farmaceuta = au.id
                    WHERE da.folio_grupo = %s
                """
                cursor.execute(sql, [folio_grupo])
                items = dictfetchall(cursor)

            if not items:
                return Response({'detail': 'No se encontró información para este folio.'}, status=status.HTTP_404_NOT_FOUND)

            # 1.1 Obtener datos de Bienestar (priorizando BD local, fallback a WS)
            data = items[0]
            titular_cedula_db = data.get('titular_cedula')
            titular_nombre_db = data.get('titular_nombre')

            bienestar = {}
            if titular_cedula_db and titular_nombre_db and str(titular_cedula_db) != 'None' and str(titular_nombre_db) != 'None':
                # Si ya los tenemos congelados en BD, los usamos
                bienestar = {
                    'titular_cedula': titular_cedula_db,
                    'titular_nombre': titular_nombre_db,
                    'found': True
                }
                extra_data = fetch_bienestar_data(titular_cedula_db)
                if extra_data.get('found'):
                    # Copiar solo campos del titular para no sobreescribir los del beneficiario
                    for key in ['titular_email', 'titular_telefono', 'titular_dependencia', 'titular_cargo', 'titular_edad']:
                        if key in extra_data:
                            bienestar[key] = extra_data[key]
            else:
                # Fallback para registros antiguos: buscar con cédula del beneficiario
                benef_ci = data['cedula_beneficiario']
                bienestar = fetch_bienestar_data(benef_ci)

            # Localizar la fecha para el PDF
            for item in items:
                if item.get('fecha_hora'):
                    dt = item['fecha_hora']
                    if timezone.is_naive(dt):
                        import datetime
                        dt = dt.replace(tzinfo=datetime.timezone.utc)
                    item['fecha_hora'] = timezone.localtime(dt)

            # 1.1 Preparar ruta del Logo para el PDF (Absolute paths needed for xhtml2pdf)
            import os
            from django.conf import settings
            from api.utils import get_logo_base64
            
            # Buscamos primero en el static del backend, con fallback al frontend de desarrollo
            logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'dem-2.png')
            if not os.path.exists(logo_path):
                logo_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'img', 'dem-2.png')
                
            logo_path_SIFARMA = os.path.join(settings.BASE_DIR, 'static', 'img', 'logo sifarma - version claro.png')
            if not os.path.exists(logo_path_SIFARMA):
                logo_path_SIFARMA = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'img', 'logo sifarma - version claro.png')

            # Obtener representación base64 para renderizado offline robusto
            logo_base64 = get_logo_base64('dem-2.png')
            logo_base64_SIFARMA = get_logo_base64('logo sifarma - version claro.png')

            # Datos maestros (primer item)
            context = {
                'logo_base64': logo_base64,
                'logo_base64_SIFARMA': logo_base64_SIFARMA,
                'logo_path': logo_path if os.path.exists(logo_path) else None,
                'logo_path_SIFARMA': logo_path_SIFARMA if os.path.exists(logo_path_SIFARMA) else None,
                'folio': str(data['folio_grupo'])[:8].upper(),
                'fecha': data['fecha_hora'],
                'beneficiario_nombre': data['nombre_beneficiario'] or 'NO IDENTIFICADO',
                'beneficiario_ci': data['cedula_beneficiario'],
                'beneficiario_email': data['correo_beneficiario'] or bienestar.get('titular_email', 'N/A'),
                'beneficiario_telf': data['telefono_beneficiario'] or bienestar.get('titular_telefono', 'N/A'),
                'beneficiario_parentesco': bienestar.get('beneficiario_parentesco') or data.get('parentesco_beneficiario', 'TITULAR'),
                'beneficiario_sexo': data.get('sexo_beneficiario', 'N/A'),
                'beneficiario_edad': bienestar.get('beneficiario_edad', 'N/A'),
                'titular_nombre': bienestar.get('titular_nombre', 'N/A'),
                'titular_ci': bienestar.get('titular_cedula', 'N/A'),
                'titular_dep': bienestar.get('titular_dependencia', 'N/A'),
                'titular_cargo': bienestar.get('titular_cargo', 'N/A'),
                'titular_edad': bienestar.get('titular_edad', 'N/A'),
                'farmaceuta_nombre': data['farmaceuta_nombre'],
                'farmaceuta_ci': data['farmaceuta_ci'],
                'medico_tratante': data.get('medico_tratante'),
                'especialidad': data.get('especialidad'),
                'observaciones': data['observaciones'],
                'items': items,
                'total_unidades': sum(item['cantidad_despachada'] for item in items)
            }

            # 2. Renderizar HTML (In-memory)
            html_string = render_to_string('pdf/comprobante_despacho.html', context)
            
            # 3. Convertir a PDF
            from api.utils import link_callback
            result = io.BytesIO()
            pdf = pisa.pisaDocument(
                io.BytesIO(html_string.encode("UTF-8")),
                result,
                link_callback=link_callback
            )

            if not pdf.err:
                # 4. Auditoría: Registrar el evento
                log_descarga(request, "PDF_COMPROBANTE", f"Comprobante_{folio_grupo[:8]}.pdf")
                
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Comprobante_{folio_grupo[:8]}.pdf"'
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                return response

            return Response({'detail': 'Error al generar el PDF.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            audit_logger.error(f"ERROR GENERANDO COMPROBANTE | Folio: {folio_grupo} | Error: {str(e)}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



