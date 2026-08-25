"""Views de dotación: registro y consulta de lotes."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection, transaction
from django.utils import timezone
import csv
import io
import openpyxl
import difflib
from api.permissions import IsFarmaceuticoOrAbove, IsOperativoOrAbove, get_user_role
from api.serializers.dotacion_serializer import RegistrarLoteSerializer, LoteDetalleSerializer
from api.utils.auditoria import registrar_evento, log_inventario


def dictfetchall(cursor):
    
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class RegistrarLoteView(APIView):
    """Registrar un nuevo lote de medicamento (carga de dotación)."""
    permission_classes = [IsOperativoOrAbove]

    def post(self, request):
        serializer = RegistrarLoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        numero_lote = d['numero_lote'].strip().upper()
        id_med_base = d['id_med_base']
        cantidad = d['cantidad']
        fecha_vencimiento = d['fecha_vencimiento']
        usuario_id = request.user.id
        fecha_ingreso = timezone.now()

        role = get_user_role(request.user)
        schema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
        if role in ('ADMINISTRADOR', 'ENCARGADO') and 'schema' in request.data:
            target_schema = request.data.get('schema')
            if target_schema in ['farmacia', 'proveeduria']:
                schema = target_schema

        with connection.cursor() as cursor:
            # Validar que el lote no exista para ese medicamento
            cursor.execute(f"""
                SELECT 1 FROM {schema}.lotes WHERE numero_lote = %s AND id_med_base = %s
            """, [numero_lote, id_med_base])
            if cursor.fetchone():
                return Response(
                    {'detail': f'El lote {numero_lote} ya existe para este medicamento.'},
                    status=status.HTTP_409_CONFLICT
                )

            # Validar que el medicamento existe
            cursor.execute("SELECT 1 FROM farmacia.medicamentos_base WHERE id_med_base = %s", [id_med_base])
            if not cursor.fetchone():
                return Response({'detail': 'Medicamento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

            # Insertar lote
            cursor.execute(f"""
                INSERT INTO {schema}.lotes (id_med_base, numero_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_vencimiento_original, fecha_ingreso, usuario_registro)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_lote
            """, [id_med_base, numero_lote, cantidad, cantidad, fecha_vencimiento, fecha_vencimiento, fecha_ingreso, usuario_id])
            new_id = cursor.fetchone()[0]
            
            log_inventario(request, "INCLUSION", new_id, f"Registro de nuevo lote {numero_lote} con {cantidad} unidades.")

        return Response({
            'id_lote': new_id,
            'message': f'Lote {numero_lote} registrado exitosamente con {cantidad} unidades.'
        }, status=status.HTTP_201_CREATED)


class HistorialLotesView(APIView):
    """Lista paginada de lotes ingresados con sus detalles."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        limit = int(request.query_params.get('limit', 0))  # compat
        busqueda = request.query_params.get('busqueda', '')
        mes = request.query_params.get('mes', '')
        anio = request.query_params.get('anio', '')
        
        where_clauses = []
        params = []
        
        if busqueda:
            where_clauses.append('''
                (m.nombre_generico ILIKE %s OR l.numero_lote ILIKE %s OR 
                EXISTS (
                    SELECT 1 FROM farmacia.medicamento_componentes mc 
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio 
                    WHERE mc.id_med_base = m.id_med_base AND pa.nombre_principio ILIKE %s
                ))
            ''')
            params.extend([f'%{busqueda}%', f'%{busqueda}%', f'%{busqueda}%'])

        if mes and anio:
            where_clauses.append("EXTRACT(MONTH FROM l.fecha_ingreso) = %s AND EXTRACT(YEAR FROM l.fecha_ingreso) = %s")
            params.extend([mes, anio])

        role = get_user_role(request.user)
        schema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
        if role in ('ADMINISTRADOR', 'ENCARGADO'):
            requested_schema = request.query_params.get('schema')
            if requested_schema in ['farmacia', 'proveeduria']:
                schema = requested_schema

        where = ''
        if where_clauses:
            where = 'WHERE ' + ' AND '.join(where_clauses)

        # Count total
        count_sql = f"""
            SELECT COUNT(*) FROM {schema}.lotes l
            JOIN farmacia.medicamentos_base m ON l.id_med_base = m.id_med_base
            {where}
        """
        with connection.cursor() as cursor:
            cursor.execute(count_sql, params)
            total = cursor.fetchone()[0]

        # If limit param used (legacy), ignore pagination
        if limit > 0:
            offset = 0
            effective_limit = limit
        else:
            offset = (page - 1) * page_size
            effective_limit = page_size

        params_data = params + [effective_limit, offset]

        sql = f"""
            SELECT
                l.id_lote, l.numero_lote, m.nombre_generico,
                COALESCE(p.nombre_presentacion, 'N/A') AS nombre_presentacion,
                l.cantidad_inicial, l.cantidad_actual, l.fecha_vencimiento,
                ((l.fecha_ingreso AT TIME ZONE 'UTC') AT TIME ZONE 'America/Caracas') AS fecha_ingreso,
                COALESCE(au.first_name || ' ' || au.last_name, 'Sistema') AS usuario_registro_nombre,
                CASE
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '4 months') THEN 'PRÓXIMO A VENCER'
                    ELSE 'ÓPTIMO'
                END AS estado_logico,
                CASE
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'danger'
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '4 months') THEN 'warning'
                    ELSE 'success'
                END AS color_clase,
                (
                    SELECT COALESCE(json_agg(json_build_object(
                        'id_principio', mc.id_principio,
                        'nombre_principio', pa.nombre_principio,
                        'concentracion_valor', mc.concentracion_valor,
                        'id_unidad', mc.id_unidad,
                        'nombre_unidad', u.nombre_unidad
                    )), '[]'::json)
                    FROM farmacia.medicamento_componentes mc
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                    JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                    WHERE mc.id_med_base = m.id_med_base
                ) AS componentes_json
            FROM {schema}.lotes l
            JOIN farmacia.medicamentos_base m ON l.id_med_base = m.id_med_base
            LEFT JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion
            LEFT JOIN auth_user au ON l.usuario_registro = au.id
            {where}
            ORDER BY l.fecha_ingreso DESC
            LIMIT %s OFFSET %s
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params_data)
            resultados = dictfetchall(cursor)

        serializer = LoteDetalleSerializer(resultados, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': effective_limit,
            'results': serializer.data
        })


class MedicamentosParaLoteView(APIView):
    """Lista simplificada de medicamentos para el select del formulario de dotación."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        busqueda = request.query_params.get('q', '')
        where = 'WHERE m.activo = TRUE'
        params = []
        if busqueda:
            where += ''' AND (unaccent(m.nombre_generico) ILIKE unaccent(%s) OR 
                EXISTS (
                    SELECT 1 FROM farmacia.medicamento_componentes mc 
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio 
                    WHERE mc.id_med_base = m.id_med_base AND unaccent(pa.nombre_principio) ILIKE unaccent(%s)
                ))'''
            params.extend([f'%{busqueda}%', f'%{busqueda}%'])
        else:
            where = 'WHERE m.activo = TRUE'

        sql = f"""
            SELECT m.id_med_base,
                   m.nombre_generico || ' - ' || COALESCE(p.nombre_presentacion, 'SIN PRES.') AS display,
                   (
                       SELECT COALESCE(json_agg(json_build_object(
                           'id_principio', mc.id_principio,
                           'nombre_principio', pa.nombre_principio,
                           'concentracion_valor', mc.concentracion_valor,
                           'id_unidad', mc.id_unidad,
                           'nombre_unidad', u.nombre_unidad
                       )), '[]'::json)
                       FROM farmacia.medicamento_componentes mc
                       JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                       JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                       WHERE mc.id_med_base = m.id_med_base
                   ) AS componentes_json
            FROM farmacia.medicamentos_base m
            LEFT JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion
            {where}
            ORDER BY m.nombre_generico ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        return Response([{'id': r[0], 'nombre': r[1], 'componentes_json': r[2]} for r in rows])


class VerificarDotacionRecienteView(APIView):
    """Verifica si ya existe una dotación reciente (< 5 días) para un medicamento."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request, id_med_base):
        schema = 'proveeduria' if get_user_role(request.user) == 'PROVEEDURIA' else 'farmacia'
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT l.id_lote, l.numero_lote, l.cantidad_inicial, l.fecha_ingreso,
                       m.nombre_generico
                FROM {schema}.lotes l
                JOIN farmacia.medicamentos_base m ON l.id_med_base = m.id_med_base
                WHERE l.id_med_base = %s
                  AND l.fecha_ingreso >= (CURRENT_TIMESTAMP - INTERVAL '5 days')
                ORDER BY l.fecha_ingreso DESC
                LIMIT 3
            """, [id_med_base])
            rows = cursor.fetchall()

        if rows:
            lotes = [{
                'id_lote': r[0],
                'numero_lote': r[1],
                'cantidad': r[2],
                'fecha_ingreso': r[3].strftime('%d/%m/%Y %H:%M') if r[3] else '',
                'medicamento': r[4]
            } for r in rows]
            return Response({
                'tiene_reciente': True,
                'lotes_recientes': lotes,
                'mensaje': f'Este medicamento tiene {len(lotes)} dotación(es) registrada(s) en los últimos 5 días.'
            })

        return Response({'tiene_reciente': False})


class CargarLoteMasivoView(APIView):
    """Carga masiva de lotes desde archivos .csv o .xlsx."""
    permission_classes = [IsOperativoOrAbove]

    def post(self, request):
        file = request.FILES.get('archivo')
        if not file:
            return Response({'detail': 'No se proporcionó ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        extension = file.name.split('.')[-1].lower()
        rows_data = []

        try:
            if extension == 'xlsx':
                wb = openpyxl.load_workbook(file, data_only=True)
                sheet = wb.active
                # Obtener encabezados normalizados
                headers = [str(cell.value).strip().lower() for cell in sheet[1] if cell.value]
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    if any(row):
                        rows_data.append(dict(zip(headers, row)))
            
            elif extension == 'csv':
                content = file.read().decode('utf-8-sig')
                first_line = content.split('\n')[0]
                delimiter = ';' if ';' in first_line else ','
                io_string = io.StringIO(content)
                reader = csv.DictReader(io_string, delimiter=delimiter)
                for row in reader:
                    # Normalizar keys del diccionario
                    normalized_row = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
                    rows_data.append(normalized_row)
            else:
                return Response({'detail': 'Formato no soportado. Use .xlsx o .csv'}, status=status.HTTP_400_BAD_REQUEST)

            if not rows_data:
                return Response({'detail': 'El archivo no contiene datos procesables.'}, status=status.HTTP_400_BAD_REQUEST)

            errores = []
            procesados = 0
            usuario_id = request.user.id
            fecha_ingreso = timezone.now()

            role = get_user_role(request.user)
            schema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
            target_schema = request.data.get('schema') or request.POST.get('schema')
            if role in ('ADMINISTRADOR', 'ENCARGADO') and target_schema:
                if target_schema in ['farmacia', 'proveeduria']:
                    schema = target_schema

            with transaction.atomic():
                with connection.cursor() as cursor:
                    import re

                    def parse_component_str(comp_str):
                        # Match principle, followed by concentration (float/int), followed by unit
                        # e.g., "PARACETAMOL 500 MG" or "PARACETAMOL 500MG"
                        match = re.match(r'^(.+?)\s*(\d+(?:\.\d+)?)\s*([A-Z%]+)$', comp_str.strip().upper())
                        if match:
                            princ_name = match.group(1).strip()
                            concentration = float(match.group(2))
                            unit_name = match.group(3).strip()
                            return princ_name, concentration, unit_name
                        return None

                    lotes_a_insertar = []
                    is_preview = str(request.data.get('preview', request.POST.get('preview', 'false'))).lower() == 'true'

                    # 1. Validar todas las filas primero (Todo o nada)
                    for idx, row in enumerate(rows_data, start=2):
                        nombre_med_raw = str(row.get('medicamento', '')).strip().upper()
                        nombre_pres_raw = str(row.get('presentacion', '')).strip().upper()
                        componentes_raw = str(row.get('componentes', '')).strip().upper()
                        cantidad = str(row.get('cantidad', '')).strip()
                        f_venc_raw = str(row.get('fecha_vencimiento', '')).strip()

                        # Parse DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
                        f_venc = f_venc_raw
                        if len(f_venc_raw) >= 8:
                            sep = '-' if '-' in f_venc_raw else ('/' if '/' in f_venc_raw else None)
                            if sep:
                                parts = f_venc_raw.split(sep)
                                if len(parts) == 3 and len(parts[0]) <= 2: # starts with DD
                                    f_venc = f"{parts[2][:4]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

                        if not nombre_med_raw or not cantidad or not f_venc:
                            errores.append(f"Fila {idx}: Faltan datos obligatorios (medicamento, cantidad o fecha de vencimiento).")
                            continue

                        # Validar cantidad (debe ser entero, > 0 y <= 5000)
                        try:
                            cantidad_int = int(cantidad)
                            if cantidad_int <= 0:
                                errores.append(f"Fila {idx}: La cantidad debe ser mayor a 0.")
                                continue
                            if cantidad_int > 20000:
                                errores.append(f"Fila {idx}: La cantidad máxima permitida es de 20000 unidades por lote.")
                                continue
                            cantidad = str(cantidad_int)
                        except ValueError:
                            errores.append(f"Fila {idx}: La cantidad '{cantidad}' es inválida. Solo se aceptan números enteros.")
                            continue

                        # A. Buscar el medicamento por nombre genérico (activo o inactivo)
                        cursor.execute("""
                            SELECT id_med_base, activo, id_presentacion 
                            FROM farmacia.medicamentos_base 
                            WHERE unaccent(UPPER(nombre_generico)) = unaccent(%s)
                        """, [nombre_med_raw])
                        med_variants = cursor.fetchall()

                        if not med_variants:
                            errores.append(f"Fila {idx}: El medicamento '{nombre_med_raw}' no está registrado en el catálogo.")
                            continue

                        # B. Resolver ID de presentación propuesta
                        cursor.execute("SELECT id_presentacion FROM farmacia.presentaciones_medicamento WHERE unaccent(UPPER(nombre_presentacion)) = unaccent(%s)", [nombre_pres_raw])
                        pres_row = cursor.fetchone()
                        id_pres_row = pres_row[0] if pres_row else -1

                        # C. Resolver componentes propuestos
                        parsed_proposed = []
                        comp_parts = [p.strip() for p in componentes_raw.split('-') if p.strip()]
                        parse_success = True
                        for part in comp_parts:
                            parsed_comp = parse_component_str(part)
                            if not parsed_comp:
                                parse_success = False
                                break
                            princ_name, conc, unit_name = parsed_comp
                            
                            # Resolver principio
                            cursor.execute("SELECT id_principio FROM farmacia.principios_activos WHERE unaccent(UPPER(nombre_principio)) = unaccent(%s)", [princ_name])
                            p_row = cursor.fetchone()
                            id_princ = p_row[0] if p_row else -1

                            # Resolver unidad
                            cursor.execute("SELECT id_unidad FROM farmacia.unidades_medida WHERE unaccent(UPPER(nombre_unidad)) = unaccent(%s)", [unit_name])
                            u_row = cursor.fetchone()
                            id_un = u_row[0] if u_row else -1

                            parsed_proposed.append({
                                'id_principio': id_princ,
                                'concentracion_valor': conc,
                                'id_unidad': id_un
                            })

                        if not parse_success:
                            errores.append(f"Fila {idx}: No se pudo parsear el formato de los componentes '{componentes_raw}'. Use el formato 'PRINCIPIO CONCENTRACION UNIDAD' (ej. PARACETAMOL 500 MG).")
                            continue

                        # D. Buscar coincidencia exacta entre variantes
                        exact_match_med = None
                        for m_id, m_act, m_pres in med_variants:
                            # Comparar presentación
                            if m_pres != id_pres_row:
                                continue

                            # Comparar componentes
                            cursor.execute("""
                                SELECT id_principio, concentracion_valor, id_unidad 
                                FROM farmacia.medicamento_componentes 
                                WHERE id_med_base = %s
                            """, [m_id])
                            db_comps = cursor.fetchall()

                            if len(parsed_proposed) != len(db_comps):
                                continue

                            comps_match = True
                            for cp in parsed_proposed:
                                found = False
                                for db_cp, db_conc, db_un in db_comps:
                                    if (db_cp == cp['id_principio'] and 
                                        abs(float(db_conc) - cp['concentracion_valor']) < 0.0001 and 
                                        db_un == cp['id_unidad']):
                                        found = True
                                        break
                                if not found:
                                    comps_match = False
                                    break

                            if comps_match:
                                exact_match_med = (m_id, m_act)
                                break

                        if not exact_match_med:
                            # Obtener variantes válidas para el reporte detallado
                            cursor.execute("""
                                SELECT p.nombre_presentacion, 
                                       (
                                          SELECT string_agg(pa.nombre_principio || ' ' || mc.concentracion_valor || ' ' || u.nombre_unidad, ' - ')
                                          FROM farmacia.medicamento_componentes mc
                                          JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                                          JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                                          WHERE mc.id_med_base = mb.id_med_base
                                       )
                                FROM farmacia.medicamentos_base mb
                                LEFT JOIN farmacia.presentaciones_medicamento p ON mb.id_presentacion = p.id_presentacion
                                WHERE unaccent(UPPER(mb.nombre_generico)) = unaccent(%s) AND mb.activo = TRUE
                            """, [nombre_med_raw])
                            other_variants = cursor.fetchall()
                            variants_str = "\n".join([f"  • Pres: {ov[0]} | Comp: {ov[1]}" for ov in other_variants])
                            
                            errores.append(
                                f"Fila {idx}: El medicamento '{nombre_med_raw}' con presentación '{nombre_pres_raw}' y componentes '{componentes_raw}' no coincide con ninguna variante en el catálogo.\n"
                                f"Variantes registradas en catálogo:\n{variants_str}"
                            )
                            continue

                        id_med_base, activo = exact_match_med

                        # Si está inhabilitado
                        if not activo:
                            errores.append(f"Fila {idx}: El medicamento '{nombre_med_raw}' con presentación '{nombre_pres_raw}' y componentes '{componentes_raw}' está inhabilitado (en papelera). Reactívelo primero.")
                            continue

                        # E. Escudo anti-duplicados y verificación de lote existente
                        cursor.execute(f"""
                            SELECT id_lote, numero_lote 
                            FROM {schema}.lotes 
                            WHERE id_med_base = %s 
                              AND cantidad_inicial = %s 
                              AND fecha_vencimiento = %s
                              AND activo = TRUE
                        """, [id_med_base, cantidad, f_venc])
                        existing_lote = cursor.fetchone()

                        if existing_lote:
                            errores.append(f"Fila {idx}: Ya existe un lote activo ('{existing_lote[1]}') para el medicamento '{nombre_med_raw}' con cantidad {cantidad} y vencimiento {f_venc}. Esto se considera un lote duplicado.")
                            continue

                        # Obtener nombres del catálogo final para preview
                        cursor.execute("""
                            SELECT UPPER(mb.nombre_generico), UPPER(p.nombre_presentacion),
                                   (
                                      SELECT string_agg(UPPER(pa.nombre_principio || ' ' || mc.concentracion_valor || ' ' || u.nombre_unidad), ' - ')
                                      FROM farmacia.medicamento_componentes mc
                                      JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                                      JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                                      WHERE mc.id_med_base = mb.id_med_base
                                   )
                            FROM farmacia.medicamentos_base mb
                            LEFT JOIN farmacia.presentaciones_medicamento p ON mb.id_presentacion = p.id_presentacion
                            WHERE mb.id_med_base = %s
                        """, [id_med_base])
                        med_info = cursor.fetchone()

                        lotes_a_insertar.append({
                            'id_med_base': id_med_base,
                            'medicamento': med_info[0],
                            'presentacion': med_info[1] or 'N/A',
                            'componentes': med_info[2] or 'N/A',
                            'cantidad': cantidad,
                            'f_venc': f_venc,
                            'idx': idx
                        })

                    # Si hay errores, no insertamos nada (Abortamos todo)
                    if errores:
                        transaction.set_rollback(True)
                        return Response({
                            'detail': 'El archivo contiene errores de validación. No se cargó ningún registro.',
                            'errores': errores,
                            'preview_data': lotes_a_insertar if is_preview else []
                        }, status=status.HTTP_400_BAD_REQUEST)

                    # Si es preview, retornamos sin insertar
                    if is_preview:
                        transaction.set_rollback(True)
                        return Response({
                            'message': 'Vista previa generada exitosamente.',
                            'preview_data': lotes_a_insertar
                        }, status=status.HTTP_200_OK)

                    # 2. Si todo es válido, insertar
                    for lote in lotes_a_insertar:
                        anio_actual = timezone.now().year
                        cursor.execute(f"""
                            SELECT COALESCE(MAX(CAST(SUBSTRING(numero_lote FROM '[0-9]+$') AS INTEGER)), 0) + 1
                            FROM {schema}.lotes 
                            WHERE numero_lote LIKE %s
                        """, [f'DEM-L-{anio_actual}-%'])
                        next_seq = cursor.fetchone()[0]
                        numero_lote = f"DEM-L-{anio_actual}-{next_seq:06d}"

                        cursor.execute(f"""
                            INSERT INTO {schema}.lotes (id_med_base, numero_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_vencimiento_original, fecha_ingreso, usuario_registro)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id_lote
                        """, [lote['id_med_base'], numero_lote, lote['cantidad'], lote['cantidad'], lote['f_venc'], lote['f_venc'], fecha_ingreso, usuario_id])
                        
                        new_id = cursor.fetchone()[0]
                        log_inventario(request, "INCLUSION", new_id, f"Carga masiva ({extension}): Lote {numero_lote} con {lote['cantidad']} uds.")
                        procesados += 1

            return Response({
                'message': f'Se procesaron {procesados} lotes exitosamente.',
                'errores': None
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': f'Error procesando el archivo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SiguienteNumeroLoteView(APIView):
    """Retorna el siguiente número de lote secuencial disponible para el año actual."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        role = get_user_role(request.user)
        schema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
        if role in ('ADMINISTRADOR', 'ENCARGADO') and 'schema' in request.GET:
            target_schema = request.GET.get('schema')
            if target_schema in ['farmacia', 'proveeduria']:
                schema = target_schema

        import datetime
        year = datetime.date.today().year

        with connection.cursor() as cursor:
            # Seleccionar todos los números de lote activos o inactivos de ese año
            cursor.execute(f"""
                SELECT numero_lote 
                FROM {schema}.lotes 
                WHERE numero_lote LIKE %s
            """, [f"DEM-{year}-%"])
            rows = cursor.fetchall()

        # Extraer los números
        existing_nums = set()
        for r in rows:
            lote_str = r[0]
            parts = lote_str.split('-')
            if len(parts) == 3:
                try:
                    num = int(parts[2])
                    existing_nums.add(num)
                except ValueError:
                    pass

        # Buscar el menor número entero positivo que no esté en uso
        next_num = 1
        while next_num in existing_nums:
            next_num += 1

        # Formato retornado: YYYY-XXXXXX (ej: 2026-000003) ya que el UI concatena "DEM-" en el label lateral
        formatted = f"{year}-{next_num:06d}"
        return Response({'siguiente_lote': formatted})

