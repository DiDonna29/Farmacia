"""Views de medicamentos base y catálogos (presentaciones, laboratorios, etc.)."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from api.permissions import IsFarmaceuticoOrAbove, IsEncargadoOrAdmin, IsOperativoOrAbove, get_user_role
from rest_framework.pagination import PageNumberPagination
from api.serializers.medicamentos_serializer import (
    MedicamentoBaseSerializer, PresentacionSerializer,
    CategoriaSerializer, ClasificacionSerializer, UnidadMedidaSerializer, TallaCalibreSerializer
)


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _resolver_o_crear_catalogo(cursor, data, campo_id, campo_nuevo, tabla, col_id, col_nombre):
    """
    Si data[campo_id] == 'OTRO' y data[campo_nuevo] tiene valor, crea la entrada en el catálogo.
    Retorna el ID final (int o None).
    """
    valor = data.get(campo_id)
    if valor == 'OTRO' or valor is None or valor == '':
        nombre_nuevo = (data.get(campo_nuevo) or '').strip()
        if nombre_nuevo:
            cursor.execute(
                f"INSERT INTO {tabla} ({col_nombre}) VALUES (%s) RETURNING {col_id}",
                [nombre_nuevo.upper()]
            )
            return cursor.fetchone()[0]
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


class CatalogoPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class MedicamentosBaseView(APIView):
    """CRUD completo del catálogo de medicamentos base."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        busqueda = request.query_params.get('busqueda', '')
        params = []
        where = 'WHERE m.activo = TRUE'
        if busqueda:
            where += ''' AND (
                unaccent(m.nombre_generico) ILIKE unaccent(%s) OR 
                EXISTS (
                    SELECT 1 FROM farmacia.medicamento_componentes mc 
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio 
                    WHERE mc.id_med_base = m.id_med_base AND unaccent(pa.nombre_principio) ILIKE unaccent(%s)
                )
            )'''
            params.extend([f'%{busqueda}%', f'%{busqueda}%'])

        schema = 'proveeduria' if get_user_role(request.user) == 'PROVEEDURIA' else 'farmacia'
        sql = f"""
            SELECT
                m.id_med_base, m.nombre_generico,
                m.id_categoria, c.nombre_categoria,
                m.id_presentacion, p.nombre_presentacion,
                m.id_clasificacion, cl.nombre_clasificacion,
                COALESCE(SUM(lo.cantidad_actual), 0) AS existencia_total,
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
            LEFT JOIN farmacia.categorias_medicamento c ON m.id_categoria = c.id_categoria
            LEFT JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion
            LEFT JOIN farmacia.clasificaciones_medicamentos cl ON m.id_clasificacion = cl.id_clasificacion
            LEFT JOIN {schema}.lotes lo ON m.id_med_base = lo.id_med_base AND lo.activo = TRUE
            {where}
            GROUP BY
                m.id_med_base, m.nombre_generico,
                m.id_categoria, c.nombre_categoria,
                m.id_presentacion, p.nombre_presentacion,
                m.id_clasificacion, cl.nombre_clasificacion
            ORDER BY m.nombre_generico ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        columns = [
            'id_med_base', 'nombre_generico',
            'id_categoria', 'nombre_categoria',
            'id_presentacion', 'nombre_presentacion',
            'id_clasificacion', 'nombre_clasificacion',
            'existencia_total', 'componentes_json'
        ]
        
        data = []
        for row in rows:
            d = dict(zip(columns, row))
            # Construir la cadena de componentes para display legacy
            componentes_str = " + ".join([f"{c['nombre_principio']} {c['concentracion_valor']} {c['nombre_unidad']}" for c in d['componentes_json']])
            d['componentes'] = componentes_str
            data.append(d)
        
        if request.query_params.get('nopaginate') == 'true':
            return Response(data)

        total_existencia = sum([d['existencia_total'] for d in data])

        paginator = CatalogoPagination()
        page = paginator.paginate_queryset(data, request)
        serializer = MedicamentoBaseSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data['total_general_existencia'] = total_existencia
        return response

    def post(self, request):
        d = request.data
        nombre = (d.get('nombre_generico') or '').strip()
        if not nombre:
            return Response({'detail': 'El nombre genérico es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        componentes_list = d.get('componentes_list', [])
        if not componentes_list:
            return Response({'detail': 'Debe ingresar al menos un principio activo.'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            id_categoria = _resolver_o_crear_catalogo(
                cursor, d, 'id_categoria', 'categoria_nueva',
                'categorias_medicamento', 'id_categoria', 'nombre_categoria'
            )
            id_presentacion = _resolver_o_crear_catalogo(
                cursor, d, 'id_presentacion', 'presentacion_nueva',
                'presentaciones_medicamento', 'id_presentacion', 'nombre_presentacion'
            )

            cursor.execute("""
                INSERT INTO farmacia.medicamentos_base (
                    nombre_generico, id_categoria, id_presentacion,
                    id_clasificacion
                ) VALUES (%s, %s, %s, %s)
                RETURNING id_med_base
            """, [
                nombre.upper(),
                id_categoria, id_presentacion,
                d.get('id_clasificacion')
            ])
            new_id = cursor.fetchone()[0]

            for comp in componentes_list:
                id_principio = comp.get('id_principio')
                concentracion_valor = comp.get('concentracion_valor')
                id_unidad = comp.get('id_unidad')
                
                if id_principio == 'OTRO' or id_principio is None or id_principio == '':
                    nombre_nuevo = (comp.get('principio_nuevo') or '').strip().upper()
                    if nombre_nuevo:
                        try:
                            cursor.execute("INSERT INTO farmacia.principios_activos (nombre_principio) VALUES (%s) RETURNING id_principio", [nombre_nuevo])
                            id_principio = cursor.fetchone()[0]
                        except Exception:
                            cursor.execute("SELECT id_principio FROM farmacia.principios_activos WHERE nombre_principio = %s", [nombre_nuevo])
                            res = cursor.fetchone()
                            if res: id_principio = res[0]
                            else: continue

                if id_unidad == 'OTRO' or id_unidad is None or id_unidad == '':
                    nombre_unidad_nuevo = (comp.get('unidad_nueva') or '').strip().upper()
                    if nombre_unidad_nuevo:
                        try:
                            cursor.execute("INSERT INTO farmacia.unidades_medida (nombre_unidad) VALUES (%s) RETURNING id_unidad", [nombre_unidad_nuevo])
                            id_unidad = cursor.fetchone()[0]
                        except Exception:
                            cursor.execute("SELECT id_unidad FROM farmacia.unidades_medida WHERE nombre_unidad = %s", [nombre_unidad_nuevo])
                            res = cursor.fetchone()
                            if res: id_unidad = res[0]
                            else: continue

                try:
                    concentracion_valor = float(concentracion_valor)
                    if concentracion_valor < 0 or concentracion_valor > 99999999: raise ValueError
                except (ValueError, TypeError):
                    continue

                if id_principio and id_unidad:
                    try:
                        id_principio = int(id_principio)
                        id_unidad = int(id_unidad)
                    except (ValueError, TypeError):
                        continue
                    cursor.execute("""
                        INSERT INTO farmacia.medicamento_componentes (id_med_base, id_principio, concentracion_valor, id_unidad)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, [new_id, id_principio, concentracion_valor, id_unidad])

        from api.utils.auditoria import registrar_evento
        registrar_evento(request, "MEDICAMENTO_CREADO", f"Medicamento creado: {nombre}", {"id_med_base": new_id})

        return Response({'id_med_base': new_id, 'message': 'Medicamento registrado exitosamente.'}, status=status.HTTP_201_CREATED)

class MedicamentoDetailView(APIView):
    """Editar o eliminar un medicamento base por ID."""
    permission_classes = [IsOperativoOrAbove]

    def put(self, request, pk):
        d = request.data
        nombre = (d.get('nombre_generico') or '').strip()
        if not nombre:
            return Response({'detail': 'El nombre genérico es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        componentes_list = d.get('componentes_list', [])
        if not componentes_list:
            return Response({'detail': 'Debe ingresar al menos un principio activo.'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            id_categoria = _resolver_o_crear_catalogo(
                cursor, d, 'id_categoria', 'categoria_nueva',
                'categorias_medicamento', 'id_categoria', 'nombre_categoria'
            )
            id_presentacion = _resolver_o_crear_catalogo(
                cursor, d, 'id_presentacion', 'presentacion_nueva',
                'presentaciones_medicamento', 'id_presentacion', 'nombre_presentacion'
            )

            cursor.execute("""
                UPDATE farmacia.medicamentos_base SET
                    nombre_generico=%s, id_categoria=%s, id_presentacion=%s
                WHERE id_med_base=%s
            """, [
                nombre.upper(),
                id_categoria, id_presentacion,
                pk
            ])

            cursor.execute("DELETE FROM farmacia.medicamento_componentes WHERE id_med_base = %s", [pk])

            for comp in componentes_list:
                id_principio = comp.get('id_principio')
                concentracion_valor = comp.get('concentracion_valor')
                id_unidad = comp.get('id_unidad')
                
                if id_principio == 'OTRO' or id_principio is None or id_principio == '':
                    nombre_nuevo = (comp.get('principio_nuevo') or '').strip().upper()
                    if nombre_nuevo:
                        try:
                            cursor.execute("INSERT INTO farmacia.principios_activos (nombre_principio) VALUES (%s) RETURNING id_principio", [nombre_nuevo])
                            id_principio = cursor.fetchone()[0]
                        except Exception:
                            cursor.execute("SELECT id_principio FROM farmacia.principios_activos WHERE nombre_principio = %s", [nombre_nuevo])
                            res = cursor.fetchone()
                            if res: id_principio = res[0]
                            else: continue

                if id_unidad == 'OTRO' or id_unidad is None or id_unidad == '':
                    nombre_unidad_nuevo = (comp.get('unidad_nueva') or '').strip().upper()
                    if nombre_unidad_nuevo:
                        try:
                            cursor.execute("INSERT INTO farmacia.unidades_medida (nombre_unidad) VALUES (%s) RETURNING id_unidad", [nombre_unidad_nuevo])
                            id_unidad = cursor.fetchone()[0]
                        except Exception:
                            cursor.execute("SELECT id_unidad FROM farmacia.unidades_medida WHERE nombre_unidad = %s", [nombre_unidad_nuevo])
                            res = cursor.fetchone()
                            if res: id_unidad = res[0]
                            else: continue

                try:
                    concentracion_valor = float(concentracion_valor)
                    if concentracion_valor < 0 or concentracion_valor > 99999999: raise ValueError
                except (ValueError, TypeError):
                    continue

                if id_principio and id_unidad:
                    try:
                        id_principio = int(id_principio)
                        id_unidad = int(id_unidad)
                    except (ValueError, TypeError):
                        continue
                    cursor.execute("""
                        INSERT INTO farmacia.medicamento_componentes (id_med_base, id_principio, concentracion_valor, id_unidad)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, [pk, id_principio, concentracion_valor, id_unidad])

            from api.utils.auditoria import registrar_evento
            registrar_evento(request, "MEDICAMENTO_EDITADO", f"Medicamento editado: {nombre}", {"id_med_base": pk})

        return Response({'message': 'Medicamento actualizado exitosamente.'})

    def delete(self, request, pk):
        with connection.cursor() as cursor:
            cursor.execute("SELECT nombre_generico FROM farmacia.medicamentos_base WHERE id_med_base = %s", [pk])
            row = cursor.fetchone()
            nombre = row[0] if row else str(pk)
            cursor.execute("UPDATE farmacia.medicamentos_base SET activo = FALSE WHERE id_med_base = %s", [pk])
            cursor.execute("UPDATE farmacia.lotes SET activo = FALSE WHERE id_med_base = %s", [pk])
            
            from api.utils.auditoria import registrar_evento
            registrar_evento(request, "MEDICAMENTO_ELIMINADO", f"Medicamento inhabilitado: {nombre}", {"id_med_base": pk})
            
        return Response({'message': 'Medicamento y sus lotes inhabilitados exitosamente.'})


# ─── Catálogos auxiliares (lectura y creación) ────────────────────────────────

class CatalogoView(APIView):
    """Base genérica para catálogos de lookup."""
    permission_classes = [IsOperativoOrAbove]
    tabla = ''
    campo_id = ''
    campo_nombre = ''
    
    def _check_admin_permission(self, request):
        role = get_user_role(request.user)
        if role not in ['ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'DIRECTOR_MEDICO']:
            return False
        return True

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT {self.campo_id}, {self.campo_nombre} FROM {self.tabla} ORDER BY {self.campo_nombre}")
            rows = cursor.fetchall()
        return Response([{'id': r[0], 'nombre': r[1]} for r in rows])

    def post(self, request):
        nombre = request.data.get('nombre', '').strip()
        if not nombre:
            return Response({'detail': 'El nombre es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            cursor.execute(
                f"INSERT INTO {self.tabla} ({self.campo_nombre}) VALUES (%s) RETURNING {self.campo_id}",
                [nombre]
            )
            new_id = cursor.fetchone()[0]
        return Response({'id': new_id, 'nombre': nombre}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk=None):
        if not self._check_admin_permission(request):
            return Response({'detail': 'No tiene permisos para eliminar catálogos.'}, status=status.HTTP_403_FORBIDDEN)
        
        if not pk:
            return Response({'detail': 'ID no proporcionado.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with connection.cursor() as cursor:
            # Check if it's used in medicamentos_base
            if self.tabla == 'categorias_medicamento':
                cursor.execute("SELECT 1 FROM farmacia.medicamentos_base WHERE id_categoria = %s", [pk])
            elif self.tabla == 'presentaciones_medicamento':
                cursor.execute("SELECT 1 FROM farmacia.medicamentos_base WHERE id_presentacion = %s", [pk])
            elif self.tabla == 'unidades_medida':
                cursor.execute("SELECT 1 FROM farmacia.medicamento_componentes WHERE id_unidad = %s", [pk])
            else:
                return Response({'detail': 'Tabla no soportada para eliminación.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if cursor.fetchone():
                return Response({'detail': 'No se puede eliminar porque está en uso por uno o más medicamentos.'}, status=status.HTTP_400_BAD_REQUEST)
                
            cursor.execute(f"DELETE FROM {self.tabla} WHERE {self.campo_id} = %s", [pk])
            
        return Response({'message': 'Registro eliminado exitosamente.'})


class PresentacionesView(CatalogoView):
    tabla = 'presentaciones_medicamento'
    campo_id = 'id_presentacion'
    campo_nombre = 'nombre_presentacion'


class CategoriasView(CatalogoView):
    tabla = 'categorias_medicamento'
    campo_id = 'id_categoria'
    campo_nombre = 'nombre_categoria'


class ClasificacionesView(CatalogoView):
    tabla = 'clasificaciones_medicamentos'
    campo_id = 'id_clasificacion'
    campo_nombre = 'nombre_clasificacion'


class UnidadesMedidaView(CatalogoView):
    tabla = 'unidades_medida'
    campo_id = 'id_unidad'
    campo_nombre = 'nombre_unidad'


class TallasCalibresView(CatalogoView):
    tabla = 'tallas_calibres'
    campo_id = 'id_talla'
    campo_nombre = 'valor_talla'


class VerificarDuplicadoMedicamentoView(APIView):
    """Verifica si un medicamento ya existe (activo o inactivo) por nombre genérico y detalles."""
    permission_classes = [IsOperativoOrAbove]

    def post(self, request):
        d = request.data
        nombre = (d.get('nombre_generico') or '').strip().upper()
        if not nombre:
            return Response({'detail': 'Nombre genérico requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        id_categoria_req = d.get('id_categoria')
        categoria_nueva_req = d.get('categoria_nueva')
        id_presentacion_req = d.get('id_presentacion')
        presentacion_nueva_req = d.get('presentacion_nueva')
        componentes_list_req = d.get('componentes_list', [])

        with connection.cursor() as cursor:
            # 1. Resolver categoría
            id_cat_res = None
            if id_categoria_req == 'OTRO' or id_categoria_req is None or id_categoria_req == '':
                cat_nombre = (categoria_nueva_req or '').strip().upper()
                if cat_nombre:
                    cursor.execute("SELECT id_categoria FROM farmacia.categorias_medicamento WHERE unaccent(UPPER(nombre_categoria)) = unaccent(%s)", [cat_nombre])
                    row = cursor.fetchone()
                    id_cat_res = row[0] if row else -1
            else:
                try: id_cat_res = int(id_categoria_req)
                except (ValueError, TypeError): pass

            # 2. Resolver presentación
            id_pres_res = None
            if id_presentacion_req == 'OTRO' or id_presentacion_req is None or id_presentacion_req == '':
                pres_nombre = (presentacion_nueva_req or '').strip().upper()
                if pres_nombre:
                    cursor.execute("SELECT id_presentacion FROM farmacia.presentaciones_medicamento WHERE unaccent(UPPER(nombre_presentacion)) = unaccent(%s)", [pres_nombre])
                    row = cursor.fetchone()
                    id_pres_res = row[0] if row else -1
            else:
                try: id_pres_res = int(id_presentacion_req)
                except (ValueError, TypeError): pass

            # 3. Resolver componentes propuestos
            componentes_propuestos = []
            for comp in componentes_list_req:
                id_princ = comp.get('id_principio')
                conc_val = comp.get('concentracion_valor')
                id_un = comp.get('id_unidad')

                # Resolver principio
                if id_princ == 'OTRO' or id_princ is None or id_princ == '':
                    princ_nombre = (comp.get('principio_nuevo') or '').strip().upper()
                    if princ_nombre:
                        cursor.execute("SELECT id_principio FROM farmacia.principios_activos WHERE unaccent(UPPER(nombre_principio)) = unaccent(%s)", [princ_nombre])
                        row = cursor.fetchone()
                        id_princ = row[0] if row else -1
                else:
                    try: id_princ = int(id_princ)
                    except (ValueError, TypeError): id_princ = None

                # Resolver concentración
                try:
                    conc_val = float(conc_val)
                except (ValueError, TypeError):
                    conc_val = 0.0

                # Resolver unidad
                if id_un == 'OTRO' or id_un is None or id_un == '':
                    un_nombre = (comp.get('unidad_nueva') or '').strip().upper()
                    if un_nombre:
                        cursor.execute("SELECT id_unidad FROM farmacia.unidades_medida WHERE unaccent(UPPER(nombre_unidad)) = unaccent(%s)", [un_nombre])
                        row = cursor.fetchone()
                        id_un = row[0] if row else -1
                else:
                    try: id_un = int(id_un)
                    except (ValueError, TypeError): id_un = None

                if id_princ is not None and id_un is not None:
                    componentes_propuestos.append({
                        'id_principio': id_princ,
                        'concentracion_valor': conc_val,
                        'id_unidad': id_un
                    })

            # 4. Obtener todos los medicamentos que coinciden con el nombre genérico
            cursor.execute("""
                SELECT 
                    m.id_med_base, 
                    m.activo, 
                    m.nombre_generico,
                    m.id_categoria,
                    c.nombre_categoria,
                    m.id_presentacion,
                    p.nombre_presentacion
                FROM farmacia.medicamentos_base m
                LEFT JOIN farmacia.categorias_medicamento c ON m.id_categoria = c.id_categoria
                LEFT JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion
                WHERE unaccent(UPPER(m.nombre_generico)) = unaccent(%s)
            """, [nombre])
            
            med_rows = cursor.fetchall()
            
            coincidencias = []
            existe_exacto = False
            medicamento_exacto = None

            for m_row in med_rows:
                id_med_base = m_row[0]
                activo = m_row[1]
                nombre_generico = m_row[2]
                id_categoria = m_row[3]
                nombre_categoria = m_row[4]
                id_presentacion = m_row[5]
                nombre_presentacion = m_row[6]

                # Obtener componentes del medicamento
                cursor.execute("""
                    SELECT mc.id_principio, pa.nombre_principio, mc.concentracion_valor, mc.id_unidad, u.nombre_unidad
                    FROM farmacia.medicamento_componentes mc
                    JOIN farmacia.principios_activos pa ON mc.id_principio = pa.id_principio
                    JOIN farmacia.unidades_medida u ON mc.id_unidad = u.id_unidad
                    WHERE mc.id_med_base = %s
                """, [id_med_base])
                comp_rows = cursor.fetchall()
                
                componentes_db = []
                for cr in comp_rows:
                    componentes_db.append({
                        'id_principio': cr[0],
                        'nombre_principio': cr[1],
                        'concentracion_valor': float(cr[2]),
                        'id_unidad': cr[3],
                        'nombre_unidad': cr[4]
                    })

                # Generar representación de componentes para mostrar
                comp_str = " + ".join([f"{c['nombre_principio']} {c['concentracion_valor']} {c['nombre_unidad']}" for c in componentes_db])

                med_info = {
                    'id_med_base': id_med_base,
                    'activo': activo,
                    'nombre_generico': nombre_generico,
                    'id_categoria': id_categoria,
                    'nombre_categoria': nombre_categoria or 'SIN CATEGORÍA',
                    'id_presentacion': id_presentacion,
                    'nombre_presentacion': nombre_presentacion or 'SIN PRESENTACIÓN',
                    'componentes': comp_str,
                    'componentes_json': componentes_db
                }

                # Comparar exactitud
                cat_match = (id_cat_res == id_categoria)
                pres_match = (id_pres_res == id_presentacion)
                
                # Comparar componentes
                comp_match = False
                if len(componentes_propuestos) == len(componentes_db):
                    comp_match = True
                    for cp in componentes_propuestos:
                        found = False
                        for cd in componentes_db:
                            if (cd['id_principio'] == cp['id_principio'] and 
                                abs(cd['concentracion_valor'] - cp['concentracion_valor']) < 0.0001 and 
                                cd['id_unidad'] == cp['id_unidad']):
                                found = True
                                break
                        if not found:
                            comp_match = False
                            break

                if cat_match and pres_match and comp_match:
                    existe_exacto = True
                    medicamento_exacto = med_info
                    break
                else:
                    coincidencias.append(med_info)

            if existe_exacto:
                return Response({
                    'existe_exacto': True,
                    'existe_parcial': False,
                    'medicamento': medicamento_exacto
                })
            elif len(med_rows) > 0:
                return Response({
                    'existe_exacto': False,
                    'existe_parcial': True,
                    'coincidencias': coincidencias
                })

        return Response({
            'existe_exacto': False,
            'existe_parcial': False
        })
