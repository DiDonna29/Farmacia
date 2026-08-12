"""Views del inventario: semáforo paginado y estadísticas del dashboard."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db import connection
from datetime import date, timedelta
from api.permissions import IsFarmaceuticoOrAbove, IsOperativoOrAbove
from api.serializers.inventario_serializer import SemaforoInventarioSerializer, DashboardStatsSerializer
from api.utils.auditoria import registrar_evento, log_inventario


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class InventarioPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 50


class SemaforoInventarioView(APIView):
    """
    Lista el inventario con lógica de semáforo.
    Filtros: estado, presentacion, busqueda (nombre).
    """
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        estado = request.query_params.get('estado', '')
        presentacion = request.query_params.get('presentacion', '')
        busqueda = request.query_params.get('busqueda', '')

        from api.permissions import get_user_role
        role = get_user_role(request.user)
        esquema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
        target_schema = request.query_params.get('schema')
        if role in ('ADMINISTRADOR', 'ENCARGADO') and target_schema:
            if target_schema in ['farmacia', 'proveeduria']:
                esquema = target_schema

        where_clauses = ["activo = TRUE"]
        params = []

        if estado:
            donde_estado = {
                'VENCIDO': "estado_logico = 'VENCIDO'",
                'AGOTADO': "estado_logico = 'AGOTADO'",
                'PROXIMO': "estado_logico = 'PRÓXIMO A VENCER'",
                'OPTIMO': "estado_logico = 'ÓPTIMO'",
            }
            if estado in donde_estado:
                where_clauses.append(donde_estado[estado])

        if presentacion:
            where_clauses.append("nombre_presentacion ILIKE %s")
            params.append(f'%{presentacion}%')

        if busqueda:
            terminos = busqueda.split()
            for termino in terminos:
                if termino.isdigit():
                    num = termino.lstrip('0')
                    if not num: num = '0'
                    regex_lote = f'\\m0*{num}\\M'
                    where_clauses.append('''
                        (unaccent(medicamento_detallado) ILIKE unaccent(%s) 
                         OR unaccent(numero_lote) ILIKE unaccent(%s)
                         OR unaccent(numero_lote) ~* %s
                         OR unaccent(componentes_json::text) ILIKE unaccent(%s)
                        )
                    ''')
                    params.extend([f'%{termino}%', f'%{termino}%', regex_lote, f'%{termino}%'])
                else:
                    where_clauses.append('''
                        (unaccent(medicamento_detallado) ILIKE unaccent(%s) 
                         OR unaccent(numero_lote) ILIKE unaccent(%s)
                         OR unaccent(componentes_json::text) ILIKE unaccent(%s)
                        )
                    ''')
                    params.extend([f'%{termino}%', f'%{termino}%', f'%{termino}%'])

        # Ordenamiento dinámico
        ordering_param = self.request.query_params.get('ordering', '')
        order_sql = ""
        # Prioridad de Componentes
        prioridad_componentes = ""
        if busqueda:
            # Construir la condición ILIKE para componentes_json para darle prioridad
            condiciones_prioridad_list = []
            for term in terminos:
                condiciones_prioridad_list.append("unaccent(componentes_json::text) ILIKE unaccent(%s)")
                params.append(f'%{term}%')
            condiciones_prioridad = " OR ".join(condiciones_prioridad_list)
            prioridad_componentes = f"""
                CASE WHEN {condiciones_prioridad} THEN 1 ELSE 2 END ASC,
            """

        if ordering_param == 'existencia_asc':
            order_sql = f"{prioridad_componentes} cantidad_actual ASC"
        elif ordering_param == 'existencia_desc':
            order_sql = f"{prioridad_componentes} cantidad_actual DESC"
        elif ordering_param == 'venc_asc':
            order_sql = f"{prioridad_componentes} fecha_vencimiento ASC"
        elif ordering_param == 'venc_desc':
            order_sql = f"{prioridad_componentes} fecha_vencimiento DESC"
        elif ordering_param == 'alpha_asc':
            order_sql = f"{prioridad_componentes} medicamento_detallado ASC"
        elif ordering_param == 'alpha_desc':
            order_sql = f"{prioridad_componentes} medicamento_detallado DESC"
        else:
            # Orden por defecto: Componentes, luego Semáforo y luego orden alfabético
            order_sql = f"""
                {prioridad_componentes}
                CASE
                    WHEN estado_logico = 'PRÓXIMO A VENCER' THEN 1
                    WHEN estado_logico = 'ÓPTIMO' THEN 2
                    WHEN estado_logico = 'AGOTADO' THEN 3
                    WHEN estado_logico = 'VENCIDO' THEN 4
                    ELSE 5
                END ASC,
                medicamento_detallado ASC
            """
        where_sql = ('WHERE ' + ' AND '.join(where_clauses)) if where_clauses else ''

        sql = f"""
            SELECT
                id_lote,
                medicamento_detallado,
                nombre_presentacion,
                numero_lote,
                cantidad_actual,
                fecha_vencimiento,
                estado_logico,
                color_clase,
                componentes_json
            FROM {esquema}.vista_semaforo_inventario
            {where_sql}
            ORDER BY {order_sql}
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = dictfetchall(cursor)
            
            # Calcular Existencia Total Global (Solo activos con existencia real)
            cursor.execute(f"SELECT SUM(cantidad_actual) FROM {esquema}.vista_semaforo_inventario WHERE activo = TRUE")
            total_general = cursor.fetchone()[0] or 0

        # Paginación manual
        paginator = InventarioPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = SemaforoInventarioSerializer(page, many=True)
        
        response = paginator.get_paginated_response(serializer.data)
        response.data['total_general_existencia'] = total_general
        return response


class DashboardStatsView(APIView):
    """Contadores rápidos para las tarjetas del dashboard."""
    permission_classes = [IsFarmaceuticoOrAbove]

    def get(self, request):
        with connection.cursor() as cursor:
            # Totales Base
            cursor.execute("SELECT COUNT(*) FROM medicamentos_base WHERE activo = TRUE")
            total_medicamentos = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM lotes WHERE activo = TRUE AND cantidad_actual > 0")
            total_lotes = cursor.fetchone()[0]

            # Contadores por Estado (desde la tabla de detalle optimizada)
            cursor.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE estado_logico = 'ÓPTIMO') AS optimos,
                    COUNT(*) FILTER (WHERE estado_logico = 'PRÓXIMO A VENCER') AS proximos,
                    COUNT(*) FILTER (WHERE estado_logico = 'VENCIDO') AS vencidos,
                    COUNT(*) FILTER (WHERE estado_logico = 'AGOTADO') AS agotados
                FROM farmacia.vista_semaforo_inventario
                WHERE activo = TRUE
            """)
            counts = cursor.fetchone()
            optimos, proximos_vencer, vencidos, agotados = counts

            # Despachos hoy (Actas únicas)
            cursor.execute("""
                SELECT COUNT(DISTINCT folio_grupo) FROM despachos_actas
                WHERE DATE(fecha_hora) = CURRENT_DATE
            """)
            despachos_hoy = cursor.fetchone()[0]

        data = {
            'total_medicamentos': total_medicamentos,
            'total_lotes': total_lotes,
            'optimos': optimos,
            'proximos_vencer': proximos_vencer,
            'vencidos': vencidos,
            'agotados': agotados,
            'despachos_hoy': despachos_hoy,
        }
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


class PresentacionesFilterView(APIView):
    """Lista de presentaciones disponibles para el filtro del inventario."""
    permission_classes = [IsFarmaceuticoOrAbove]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_presentacion, nombre_presentacion FROM presentaciones_medicamento ORDER BY nombre_presentacion")
            rows = cursor.fetchall()
        return Response([{'id': r[0], 'nombre': r[1]} for r in rows])


class EgresarLoteView(APIView):
    """
    Da de baja un lote (ajuste o vencimiento). 
    Pone la cantidad actual en 0.
    """
    permission_classes = [IsOperativoOrAbove]

    def post(self, request, pk):
        esquema = request.query_params.get('schema', 'farmacia')
        if esquema not in ['farmacia', 'proveeduria']:
            esquema = 'farmacia'

        with connection.cursor() as cursor:
            # Primero verificamos existencia
            cursor.execute(f"SELECT id_lote, numero_lote FROM {esquema}.lotes WHERE id_lote = %s", [pk])
            lote = cursor.fetchone()
            if not lote:
                return Response({'detail': 'Lote no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
            # Soft-delete: Actualizamos a 0 y desactivamos
            cursor.execute(f"UPDATE {esquema}.lotes SET activo = FALSE WHERE id_lote = %s", [pk])
            
            log_inventario(request, "EGRESO", pk, f"Lote {lote[1]} enviado a papelera/egresado. ({esquema})")
            
        return Response({'message': 'Lote egresado correctamente (marcado como inactivo)'})

class EditarLoteView(APIView):
    """
    Permite editar cantidad y fecha de vencimiento de un lote.
    Mantiene registro de la fecha original.
    """
    permission_classes = [IsOperativoOrAbove]

    def post(self, request, pk):
        cantidad = request.data.get('cantidad')
        fecha_vencimiento = request.data.get('fecha_vencimiento')
        
        esquema = request.query_params.get('schema', 'farmacia')
        if esquema not in ['farmacia', 'proveeduria']:
            esquema = 'farmacia'

        if cantidad is None or not fecha_vencimiento:
            return Response({'detail': 'Cantidad y fecha son requeridas'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(f"SELECT id_lote, numero_lote, cantidad_actual, fecha_vencimiento FROM {esquema}.lotes WHERE id_lote = %s", [pk])
            lote = cursor.fetchone()
            if not lote:
                return Response({'detail': 'Lote no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
            old_qty, old_date = lote[2], lote[3]
            
            cursor.execute(f"""
                UPDATE {esquema}.lotes 
                SET cantidad_actual = %s, 
                    fecha_vencimiento = %s,
                    activo = TRUE
                WHERE id_lote = %s
            """, [cantidad, fecha_vencimiento, pk])
            
            detalle = f"Lote {lote[1]} editado ({esquema}): Cantidad {old_qty}->{cantidad}, Vencimiento {old_date}->{fecha_vencimiento}"
            log_inventario(request, "EDICION", pk, detalle)
            
        return Response({'message': 'Lote actualizado correctamente.'})
