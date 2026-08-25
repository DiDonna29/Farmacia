from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import connection, transaction
from datetime import datetime
import uuid
import io
import os
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
from xhtml2pdf import pisa
from api.utils.auditoria import registrar_evento, log_inventario
from api.permissions import get_user_role


class DepartamentosOrigenView(APIView):
    """Catálogo de departamentos solicitantes personalizados (OTRO)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id_departamento, nombre_departamento
                FROM farmacia.departamentos_origen
                ORDER BY nombre_departamento
            """)
            rows = cursor.fetchall()
        return Response([{'id': r[0], 'nombre': r[1]} for r in rows])

    def post(self, request):
        nombre = (request.data.get('nombre') or '').strip().upper()
        if not nombre:
            return Response({'detail': 'El nombre es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        # Solo texto: no números ni caracteres especiales (validación básica)
        import re
        if not re.match(r'^[A-ZÁÉÍÓÚÜÑ\s\-\.]+$', nombre):
            return Response({'detail': 'El nombre solo debe contener letras, espacios, guiones y puntos.'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            # Crear tabla si no existe
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS farmacia.departamentos_origen (
                    id_departamento SERIAL PRIMARY KEY,
                    nombre_departamento VARCHAR(200) NOT NULL UNIQUE
                )
            """)
            # Verificar si ya existe
            cursor.execute("SELECT id_departamento FROM farmacia.departamentos_origen WHERE UPPER(nombre_departamento) = %s", [nombre])
            existing = cursor.fetchone()
            if existing:
                return Response({'detail': 'Este departamento ya existe.', 'id': existing[0]}, status=status.HTTP_400_BAD_REQUEST)
            cursor.execute(
                "INSERT INTO farmacia.departamentos_origen (nombre_departamento) VALUES (%s) RETURNING id_departamento",
                [nombre]
            )
            new_id = cursor.fetchone()[0]
        return Response({'id': new_id, 'nombre': nombre}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk=None):
        role = get_user_role(request.user)
        if role not in ['ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'DIRECTOR_MEDICO']:
            return Response({'detail': 'No tiene permisos para eliminar departamentos.'}, status=status.HTTP_403_FORBIDDEN)
        if not pk:
            return Response({'detail': 'ID no proporcionado.'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM farmacia.departamentos_origen WHERE id_departamento = %s", [pk])
        return Response({'message': 'Departamento eliminado exitosamente.'})


class InventarioProveeduriaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from api.permissions import get_user_role
        role = get_user_role(request.user)
        esquema = 'proveeduria' if role == 'PROVEEDURIA' else 'farmacia'
        target_schema = request.query_params.get('schema')
        if role in ('ADMINISTRADOR', 'ENCARGADO') and target_schema:
            if target_schema in ['farmacia', 'proveeduria']:
                esquema = target_schema

        query = f"""
            SELECT 
                l.id_lote,
                mb.id_med_base,
                mb.nombre_generico,
                pm.nombre_presentacion,
                l.numero_lote,
                l.cantidad_actual,
                (
                    SELECT COALESCE(SUM(cantidad), 0)
                    FROM proveeduria.solicitudes_reservas
                    WHERE id_lote = l.id_lote AND schema_name = '{esquema}'
                ) AS cantidad_reservada,
                (
                    l.cantidad_actual - (
                        SELECT COALESCE(SUM(cantidad), 0)
                        FROM proveeduria.solicitudes_reservas
                        WHERE id_lote = l.id_lote AND schema_name = '{esquema}'
                    )
                ) AS cantidad_disponible,
                l.fecha_vencimiento,
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
                    WHERE mc.id_med_base = mb.id_med_base
                ) AS componentes_json,
                CASE 
                    WHEN (l.cantidad_actual - (SELECT COALESCE(SUM(cantidad), 0) FROM proveeduria.solicitudes_reservas WHERE id_lote = l.id_lote AND schema_name = '{esquema}')) <= 0 THEN 'AGOTADO'
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '4 months') THEN 'PRÓXIMO A VENCER'
                    ELSE 'ÓPTIMO'
                END as estado_logico,
                CASE 
                    WHEN (l.cantidad_actual - (SELECT COALESCE(SUM(cantidad), 0) FROM proveeduria.solicitudes_reservas WHERE id_lote = l.id_lote AND schema_name = '{esquema}')) <= 0 THEN 'secondary'
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'danger'
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '4 months') THEN 'warning'
                    ELSE 'success'
                END as color_clase
            FROM {esquema}.lotes l
            JOIN farmacia.medicamentos_base mb ON l.id_med_base = mb.id_med_base
            LEFT JOIN farmacia.presentaciones_medicamento pm ON mb.id_presentacion = pm.id_presentacion
            WHERE l.activo = true
            ORDER BY l.fecha_vencimiento ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return Response(results)

class InventarioProveeduriaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, id_lote):
        cantidad_actual = request.data.get('cantidad_actual')
        fecha_vencimiento = request.data.get('fecha_vencimiento')

        if cantidad_actual is None or not fecha_vencimiento:
            return Response({'detail': 'Faltan datos.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with connection.cursor() as cursor:
                # Validar existencia
                cursor.execute("SELECT numero_lote FROM proveeduria.lotes WHERE id_lote = %s", [id_lote])
                lote = cursor.fetchone()
                if not lote:
                    return Response({'detail': 'Lote no encontrado'}, status=status.HTTP_404_NOT_FOUND)

                # Actualizar
                cursor.execute("""
                    UPDATE proveeduria.lotes 
                    SET cantidad_actual = %s, fecha_vencimiento = %s 
                    WHERE id_lote = %s
                """, [cantidad_actual, fecha_vencimiento, id_lote])

            registrar_evento(request, "PROVEEDURIA_INVENTARIO_EDIT", f"Lote {lote[0]} editado: {cantidad_actual} uds, Vence: {fecha_vencimiento}", {"id_lote": id_lote})

            return Response({'detail': 'Lote actualizado correctamente.'})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, id_lote):
        try:
            with connection.cursor() as cursor:
                # Validar existencia
                cursor.execute("SELECT numero_lote FROM proveeduria.lotes WHERE id_lote = %s", [id_lote])
                lote = cursor.fetchone()
                if not lote:
                    return Response({'detail': 'Lote no encontrado'}, status=status.HTTP_404_NOT_FOUND)

                # Soft-delete
                cursor.execute("UPDATE proveeduria.lotes SET activo = false WHERE id_lote = %s", [id_lote])

            log_inventario(request, "EGRESO", id_lote, f"Lote {lote[0]} enviado a papelera/egresado de Proveeduría.")

            return Response({'detail': 'Lote egresado correctamente.'})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SolicitudesDotacionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Obtener solicitudes (filtrar según el rol si es necesario)
        origen = request.query_params.get('origen')
        destino = request.query_params.get('destino')
        desde = request.query_params.get('desde')
        hasta = request.query_params.get('hasta')
        
        query = """
            SELECT 
                s.id_solicitud,
                s.folio_solicitud as folio,
                s.origen,
                s.destino,
                ((s.fecha_solicitud AT TIME ZONE 'UTC') AT TIME ZONE 'America/Caracas') as fecha_solicitud,
                ((s.fecha_entrega AT TIME ZONE 'UTC') AT TIME ZONE 'America/Caracas') as fecha_entrega,
                s.estado,
                s.observaciones,
                u.username as usuario_solicita,
                (SELECT COUNT(*) FROM proveeduria.solicitudes_detalle WHERE id_solicitud = s.id_solicitud) as total_items,
                COALESCE(m.tipo_solicitud, 'DISPONIBLES') as tipo_solicitud,
                m.fecha_entrega_programada
            FROM proveeduria.solicitudes s
            JOIN auth_user u ON s.id_usuario_solicitante = u.id
            LEFT JOIN proveeduria.solicitudes_metadata m ON s.id_solicitud = m.id_solicitud
            WHERE 1=1
        """
        params = []
        if origen:
            query += " AND s.origen = %s"
            params.append(origen)
        if destino:
            query += " AND s.destino = %s"
            params.append(destino)
        if desde:
            query += " AND DATE((s.fecha_solicitud AT TIME ZONE 'UTC') AT TIME ZONE 'America/Caracas') >= %s"
            params.append(desde)
        if hasta:
            query += " AND DATE((s.fecha_solicitud AT TIME ZONE 'UTC') AT TIME ZONE 'America/Caracas') <= %s"
            params.append(hasta)
            
        query += " ORDER BY s.fecha_solicitud DESC"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(results)

    def post(self, request):
        # Crear una nueva solicitud
        data = request.data
        items = data.get('items', [])
        origen = data.get('origen', 'FARMACIA')
        destino = data.get('destino', 'PROVEEDURIA')
        observaciones = data.get('observaciones', '')
        tipo_solicitud = data.get('tipo_solicitud', 'DISPONIBLES')
        
        if not items:
            return Response({'detail': 'No se enviaron medicamentos en la solicitud.'}, status=status.HTTP_400_BAD_REQUEST)

        folio = f"SOL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        schema_destino = 'proveeduria' if 'PROV' in destino.upper() else 'farmacia'
        
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # 1. Crear cabecera
                    cursor.execute("""
                        INSERT INTO proveeduria.solicitudes (folio_solicitud, origen, destino, id_usuario_solicitante, estado, observaciones)
                        VALUES (%s, %s, %s, %s, 'PENDIENTE', %s)
                        RETURNING id_solicitud
                    """, [folio, origen, destino, request.user.id, observaciones])
                    id_solicitud = cursor.fetchone()[0]

                    # 2. Guardar tipo_solicitud en metadata
                    cursor.execute("""
                        INSERT INTO proveeduria.solicitudes_metadata (id_solicitud, tipo_solicitud)
                        VALUES (%s, %s)
                    """, [id_solicitud, tipo_solicitud])

                    # 3. Crear detalles y reservar stock si es DISPONIBLES
                    for item in items:
                        id_med = item['id_med_base']
                        cant = int(item['cantidad'])
                        
                        cursor.execute("""
                            INSERT INTO proveeduria.solicitudes_detalle (id_solicitud, id_med_base, cantidad_solicitada)
                            VALUES (%s, %s, %s)
                        """, [id_solicitud, id_med, cant])

                        if tipo_solicitud == 'DISPONIBLES':
                            # Buscar lotes activos en schema_destino ordenados por fecha_vencimiento ASC
                            # (disponible = cantidad_actual - cantidad_reservada)
                            cursor.execute(f"""
                                SELECT id_lote, (cantidad_actual - (
                                    SELECT COALESCE(SUM(cantidad), 0)
                                    FROM proveeduria.solicitudes_reservas
                                    WHERE id_lote = l.id_lote AND schema_name = %s
                                )) as disponible
                                FROM {schema_destino}.lotes l
                                WHERE id_med_base = %s AND activo = true AND (cantidad_actual - (
                                    SELECT COALESCE(SUM(cantidad), 0)
                                    FROM proveeduria.solicitudes_reservas
                                    WHERE id_lote = l.id_lote AND schema_name = %s
                                )) > 0
                                ORDER BY fecha_vencimiento ASC
                            """, [schema_destino, id_med, schema_destino])
                            lots = cursor.fetchall()
                            
                            remaining = cant
                            for lot_id, disponible in lots:
                                if remaining <= 0:
                                    break
                                to_reserve = min(remaining, disponible)
                                if to_reserve > 0:
                                    # Insertar en solicitudes_reservas
                                    cursor.execute("""
                                        INSERT INTO proveeduria.solicitudes_reservas (id_solicitud, id_lote, schema_name, cantidad)
                                        VALUES (%s, %s, %s, %s)
                                    """, [id_solicitud, lot_id, schema_destino, to_reserve])
                                    remaining -= to_reserve

            registrar_evento(request, "SOLICITUD_CREADA", f"Nueva solicitud creada: {folio}", {"id": id_solicitud, "items": len(items), "tipo": tipo_solicitud})
            
            return Response({'id': id_solicitud, 'folio': folio}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DetalleSolicitudView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id_solicitud):
        query = """
            SELECT 
                d.id_detalle,
                mb.id_med_base,
                mb.nombre_generico,
                pm.nombre_presentacion,
                d.cantidad_solicitada,
                d.cantidad_entregada
            FROM proveeduria.solicitudes_detalle d
            JOIN farmacia.medicamentos_base mb ON d.id_med_base = mb.id_med_base
            LEFT JOIN farmacia.presentaciones_medicamento pm ON mb.id_presentacion = pm.id_presentacion
            WHERE d.id_solicitud = %s
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [id_solicitud])
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return Response(results)

class ProcesarSolicitudView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id_solicitud):
        estado_nuevo = request.data.get('estado', 'ENTREGADA')
        comentario = request.data.get('comentario', '')
        detalles_entrega = request.data.get('items', []) # [{id_med_base, cantidad_a_entregar, id_lote_origen}]
        fecha_entrega_custom = request.data.get('fecha_entrega') # 'YYYY-MM-DD'
        
        if estado_nuevo == 'ENTREGADA' and not detalles_entrega:
            return Response({'detail': 'No se especificaron items para entregar.'}, status=status.HTTP_400_BAD_REQUEST)

        fecha_entrega_val = None
        if fecha_entrega_custom:
            try:
                fecha_entrega_val = datetime.strptime(fecha_entrega_custom, '%Y-%m-%d').date()
            except ValueError:
                return Response({'detail': 'Formato de fecha de entrega inválido. Debe ser YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # 1. Obtener información de la solicitud
                    cursor.execute("SELECT origen, destino, folio_solicitud FROM proveeduria.solicitudes WHERE id_solicitud = %s", [id_solicitud])
                    sol_info = cursor.fetchone()
                    if not sol_info:
                        return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
                    
                    origen = sol_info[0].upper()
                    destino = sol_info[1].upper()
                    folio = sol_info[2]

                    # Liberar reservas siempre (tanto para Aprobado como para Rechazado)
                    cursor.execute("DELETE FROM proveeduria.solicitudes_reservas WHERE id_solicitud = %s", [id_solicitud])
                    
                    if estado_nuevo == 'RECHAZADA':
                        cursor.execute("SELECT observaciones FROM proveeduria.solicitudes WHERE id_solicitud = %s", [id_solicitud])
                        res_obs = cursor.fetchone()
                        current_obs = res_obs[0] if res_obs and res_obs[0] else ""
                        
                        nuevo_comentario = f"Motivo de rechazo: {comentario}"
                        if current_obs:
                            nuevas_obs = f"{current_obs}\n{nuevo_comentario}"
                        else:
                            nuevas_obs = nuevo_comentario

                        cursor.execute("""
                            UPDATE proveeduria.solicitudes 
                            SET estado = 'RECHAZADA', id_usuario_procesador = %s, fecha_entrega = now(), observaciones = %s
                            WHERE id_solicitud = %s
                        """, [request.user.id, nuevas_obs, id_solicitud])
                        
                        registrar_evento(request, "SOLICITUD_RECHAZADA", f"Solicitud {id_solicitud} RECHAZADA. Motivo: {comentario}", {"id": id_solicitud, "comentario": comentario})
                        return Response({'detail': 'Solicitud rechazada correctamente y reservas liberadas.'})

                    # 2. Procesar cada item
                    movimientos_log = []
                    for item in detalles_entrega:
                        id_med = item['id_med_base']
                        cant = int(item['cantidad_a_entregar'])
                        id_lote_orig = item.get('id_lote_origen')

                        if cant > 0 and id_lote_orig:
                            # DESTINO da el existencia (se descuenta de DESTINO)
                            schema_quien_da = 'proveeduria' if 'PROV' in destino.upper() else 'farmacia'
                            
                            # Validar si el ORIGEN (receptor) tiene inventario interno
                            recibe_tiene_inventario = 'PROV' in origen.upper() or 'FARM' in origen.upper()
                            schema_quien_recibe = None
                            if recibe_tiene_inventario:
                                schema_quien_recibe = 'proveeduria' if 'PROV' in origen.upper() else 'farmacia'

                            # Capturar existencia ANTES para el log
                            cursor.execute(f"SELECT numero_lote, cantidad_actual, fecha_vencimiento FROM {schema_quien_da}.lotes WHERE id_lote = %s", [id_lote_orig])
                            lote_antes = cursor.fetchone()
                            if not lote_antes:
                                continue
                            num_lote, existencia_antes, f_venc = lote_antes

                            # A. Descontar del DESTINO (quien entrega)
                            cursor.execute(f"UPDATE {schema_quien_da}.lotes SET cantidad_actual = cantidad_actual - %s WHERE id_lote = %s", [cant, id_lote_orig])
                            existencia_despues = existencia_antes - cant

                            id_lote_dest = None
                            num_lote_dest = num_lote
                            if recibe_tiene_inventario:
                                # B. Insertar o acumular en el ORIGEN (Dotación automática)
                                if not num_lote_dest.endswith('-TR'):
                                    num_lote_dest = f"{num_lote_dest}-TR"

                                cursor.execute(f"""
                                    INSERT INTO {schema_quien_recibe}.lotes (id_med_base, numero_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_vencimiento_original, fecha_ingreso, usuario_registro)
                                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
                                    ON CONFLICT (id_med_base, numero_lote) DO UPDATE SET 
                                        cantidad_actual = {schema_quien_recibe}.lotes.cantidad_actual + EXCLUDED.cantidad_actual
                                """, [id_med, num_lote_dest, cant, cant, f_venc, f_venc, request.user.id])

                                # Obtener ID del lote receptor
                                cursor.execute(f"""
                                    SELECT id_lote FROM {schema_quien_recibe}.lotes 
                                    WHERE id_med_base = %s AND numero_lote = %s
                                """, [id_med, num_lote_dest])
                                lote_dest_row = cursor.fetchone()
                                id_lote_dest = lote_dest_row[0] if lote_dest_row else None

                            # C. Registrar logs
                            log_inventario(request, "EGRESO", id_lote_orig, f"Despacho desde {destino} por solicitud {folio} a {origen}: {cant} unidades del Lote {num_lote}")
                            if recibe_tiene_inventario and id_lote_dest:
                                log_inventario(request, "INCLUSION", id_lote_dest, f"Dotación automática por solicitud {folio} desde {destino}: {cant} unidades asignadas al Lote {num_lote_dest}")

                            # Obtener nombre del medicamento
                            cursor.execute("SELECT nombre_generico FROM farmacia.medicamentos_base WHERE id_med_base = %s", [id_med])
                            med_row = cursor.fetchone()
                            med_nombre = med_row[0] if med_row else f"ID:{id_med}"

                            if recibe_tiene_inventario:
                                movimientos_log.append(
                                    f"{med_nombre} | Lote: {num_lote} | {schema_quien_da.upper()}: {existencia_antes}→{existencia_despues} | {schema_quien_recibe.upper()}: +{cant}"
                                )
                            else:
                                movimientos_log.append(
                                    f"{med_nombre} | Lote: {num_lote} | {schema_quien_da.upper()}: {existencia_antes}→{existencia_despues} | Consumido por {origen}"
                                )

                        # D. Actualizar cantidad entregada
                        cursor.execute("""
                            UPDATE proveeduria.solicitudes_detalle 
                            SET cantidad_entregada = cantidad_entregada + %s
                            WHERE id_solicitud = %s AND id_med_base = %s
                        """, [cant, id_solicitud, id_med])

                    # 3. Marcar solicitud como ENTREGADA (con hora igual a la de la solicitud)
                    if fecha_entrega_custom:
                        cursor.execute("""
                            SELECT (fecha_solicitud AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas')::time 
                            FROM proveeduria.solicitudes 
                            WHERE id_solicitud = %s
                        """, [id_solicitud])
                        time_val = cursor.fetchone()[0]
                        local_dt_str = f"{fecha_entrega_custom} {time_val}"
                        
                        cursor.execute("""
                            UPDATE proveeduria.solicitudes 
                            SET estado = 'ENTREGADA', id_usuario_procesador = %s, 
                                fecha_entrega = %s::timestamp AT TIME ZONE 'America/Caracas'
                            WHERE id_solicitud = %s
                        """, [request.user.id, local_dt_str, id_solicitud])
                    else:
                        cursor.execute("""
                            UPDATE proveeduria.solicitudes 
                            SET estado = 'ENTREGADA', id_usuario_procesador = %s, fecha_entrega = NOW()
                            WHERE id_solicitud = %s
                        """, [request.user.id, id_solicitud])

                    if fecha_entrega_val:
                        cursor.execute("""
                            UPDATE proveeduria.solicitudes_metadata
                            SET fecha_entrega_programada = %s
                            WHERE id_solicitud = %s
                        """, [fecha_entrega_val, id_solicitud])

            resumen = " | ".join(movimientos_log) if movimientos_log else "Sin movimientos de existencias"
            registrar_evento(request, "SOLICITUD_PROCESADA",
                f"Solicitud {id_solicitud} ENTREGADA ({destino}→{origen}). Movimientos: {resumen}",
                {"id": id_solicitud, "movimientos": movimientos_log})

            registrar_evento(request, "DESPACHO",
                f"Despacho desde {destino} al departamento {origen} por solicitud {folio}. Movimientos: {resumen}",
                {"id_solicitud": id_solicitud, "origen": origen, "destino": destino, "movimientos": movimientos_log})

            return Response({'detail': 'Solicitud procesada y existencias transferidas correctamente.'})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class SolicitudPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id_solicitud):
        try:
            # 1. Recolectar datos
            query_cabecera = """
                SELECT 
                    s.folio_solicitud, s.origen, s.destino, s.fecha_solicitud, s.fecha_entrega, s.estado, s.observaciones,
                    u_sol.first_name || ' ' || u_sol.last_name as solicitante,
                    u_proc.first_name || ' ' || u_proc.last_name as procesador
                FROM proveeduria.solicitudes s
                JOIN auth_user u_sol ON s.id_usuario_solicitante = u_sol.id
                LEFT JOIN auth_user u_proc ON s.id_usuario_procesador = u_proc.id
                WHERE s.id_solicitud = %s
            """
            query_detalles = """
                SELECT 
                    mb.id_med_base, mb.nombre_generico, pm.nombre_presentacion,
                    d.cantidad_solicitada, d.cantidad_entregada
                FROM proveeduria.solicitudes_detalle d
                JOIN farmacia.medicamentos_base mb ON d.id_med_base = mb.id_med_base
                LEFT JOIN farmacia.presentaciones_medicamento pm ON mb.id_presentacion = pm.id_presentacion
                WHERE d.id_solicitud = %s
            """
            
            with connection.cursor() as cursor:
                cursor.execute(query_cabecera, [id_solicitud])
                row = cursor.fetchone()
                if not row:
                    return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
                cab = dict(zip([col[0] for col in cursor.description], row))
                
                cursor.execute(query_detalles, [id_solicitud])
                det = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

                # Fetch components for each detail
                for d in det:
                    cursor.execute("""
                        SELECT p.nombre_principio, mc.concentracion_valor, u.nombre_unidad 
                        FROM farmacia.medicamento_componentes mc
                        JOIN farmacia.principios_activos p ON mc.id_principio = p.id_principio
                        LEFT JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                        WHERE mc.id_med_base = %s
                    """, [d['id_med_base']])
                    comps = cursor.fetchall()
                    if comps:
                        comp_texts = []
                        for c in comps:
                            texto = c[0]
                            if c[1] and c[2]:
                                texto += f" {int(c[1]) if c[1] == int(c[1]) else c[1]}{c[2]}"
                            comp_texts.append(texto)
                        d['componentes_text'] = " + ".join(comp_texts)
                    else:
                        d['componentes_text'] = "Sin componentes"

            # 2. Preparar contexto (Buscamos primero en el static del backend, con fallback al frontend de desarrollo)
            from api.utils import get_logo_base64
            logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'dem-2.png')
            if not os.path.exists(logo_path):
                logo_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'img', 'dem-2.png')
                
            SIFARMA_logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logo sifarma - version claro.png')
            if not os.path.exists(SIFARMA_logo_path):
                SIFARMA_logo_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'img', 'logo sifarma - version claro.png')

            logo_base64 = get_logo_base64('dem-2.png')
            logo_base64_SIFARMA = get_logo_base64('logo sifarma - version claro.png')

            context = {
                'logo_base64': logo_base64,
                'logo_base64_SIFARMA': logo_base64_SIFARMA,
                'logo_path': logo_path if os.path.exists(logo_path) else None,
                'SIFARMA_logo_path': SIFARMA_logo_path if os.path.exists(SIFARMA_logo_path) else None,
                'cab': cab,
                'detalles': det,
                'fecha_reporte': datetime.now(),
                'total_items': len(det)
            }

            # 3. Renderizar HTML
            html_string = render_to_string('pdf/solicitud_dotacion.html', context)
            
            # 4. Generar PDF
            from api.utils import link_callback
            result = io.BytesIO()
            pdf = pisa.pisaDocument(
                io.BytesIO(html_string.encode("UTF-8")),
                result,
                link_callback=link_callback
            )

            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Solicitud_Dotacion_{id_solicitud}.pdf"'
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                return response

            return Response({'detail': 'Error al generar el PDF.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



