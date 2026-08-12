"""Views de gestión de usuarios con control de roles."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection, transaction
from django.contrib.auth.models import User, Group
from django.conf import settings
import requests as http_requests
from api.permissions import IsEncargadoOrAdmin, get_user_role
from api.utils.auditoria import registrar_evento
from api.serializers.auth_serializer import (
    CrearUsuarioSerializer, EditarUsuarioSerializer, UsuarioListSerializer, RolSerializer
)


ROLES_PERMITIDOS = {
    'ADMINISTRADOR': ['DIRECTOR_SERVICIO_MEDICO', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA'],
    'DIRECTOR_SERVICIO_MEDICO': ['ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA'],
    'ENCARGADO': ['FARMACEUTICO', 'PROVEEDURIA'],
}


def check_active_director_exists(exclude_user_id=None):
    """Retorna True si ya existe un Director de Servicio Médico activo en el sistema."""
    query = """
        SELECT COUNT(DISTINCT u.id) FROM auth_user u
        JOIN usuarios_rol ur ON u.id = ur.user_id
        JOIN roles r ON ur.id_rol = r.id_rol
        WHERE UPPER(r.nombre_rol) = 'DIRECTOR_SERVICIO_MEDICO' AND u.is_active = TRUE
    """
    params = []
    if exclude_user_id is not None:
        query += " AND u.id <> %s"
        params.append(exclude_user_id)
        
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        count = cursor.fetchone()[0]
    return count > 0


class GestionUsuariosView(APIView):
    """Lista y crea usuarios. El rol del creador determina qué roles puede asignar."""
    permission_classes = [IsEncargadoOrAdmin]

    def get(self, request):
        """Lista usuarios con roles FARMACIA (o superusuarios)."""
        # Obtener IDs de usuarios con roles FARMACIA + superusuarios
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT ur.user_id FROM usuarios_rol ur
                JOIN roles r ON ur.id_rol = r.id_rol
                WHERE r.nombre_rol IN ('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO')
            """)
            farmacia_ids = {row[0] for row in cursor.fetchall()}

        usuarios_qs = (
            User.objects.filter(id__in=farmacia_ids) |
            User.objects.filter(is_superuser=True)
        ).distinct().prefetch_related('groups').order_by('-date_joined')

        usuarios = []
        for u in usuarios_qs:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT r.id_rol, r.nombre_rol FROM roles r
                    JOIN usuarios_rol ur ON r.id_rol = ur.id_rol
                    WHERE ur.user_id = %s AND r.nombre_rol IN ('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO')
                """, [u.id])
                rol_row = cursor.fetchone()

            # Fallback a grupos de Django si no hay rol en la tabla personalizada
            if rol_row:
                id_rol, rol_nombre = rol_row[0], rol_row[1]
            else:
                # Intentar buscar el id_rol basado en el nombre del grupo
                grupo = u.groups.first()
                if grupo:
                    rol_nombre = grupo.name.upper()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT id_rol FROM roles WHERE nombre_rol = %s", [rol_nombre])
                        r_match = cursor.fetchone()
                        id_rol = r_match[0] if r_match else None
                elif u.is_superuser:
                    rol_nombre = 'ADMINISTRADOR'
                    id_rol = None # Superuser no necesita id_rol de la tabla personalizada usualmente
                else:
                    rol_nombre = 'SIN ROL'
                    id_rol = None

            usuarios.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email': u.email or '',
                'is_active': u.is_active,
                'rol_nombre': rol_nombre,
                'id_rol': id_rol,
                'last_login': u.last_login,
            })
        serializer = UsuarioListSerializer(usuarios, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        """Crea un nuevo usuario con rol permitido según jerarquía."""
        serializer = CrearUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        creator_role = get_user_role(request.user)

        # Verificar que el rol a asignar sea permitido para este creador
        with connection.cursor() as cursor:
            cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", [d['id_rol']])
            row = cursor.fetchone()
        if not row:
            return Response({'detail': 'Rol no válido.'}, status=status.HTTP_400_BAD_REQUEST)

        nombre_rol_nuevo = row[0].upper()
        
        # RESTRICCIÓN: Solo puede existir un ADMINISTRADOR y un DIRECTOR_SERVICIO_MEDICO activo
        if nombre_rol_nuevo in ('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO'):
            if nombre_rol_nuevo == 'ADMINISTRADOR':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(DISTINCT u.id) FROM auth_user u
                        LEFT JOIN usuarios_rol ur ON u.id = ur.user_id
                        LEFT JOIN roles r ON ur.id_rol = r.id_rol
                        WHERE u.is_superuser = TRUE OR UPPER(r.nombre_rol) = 'ADMINISTRADOR'
                    """)
                    count = cursor.fetchone()[0]
                if count > 0:
                    return Response(
                        {'detail': 'Ya existe un usuario con el rol de Administrador. Solo se permite un Administrador en el sistema.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                if check_active_director_exists():
                    return Response(
                        {'detail': 'Ya existe un Director de Servicio Médico activo en el sistema. Primero debe inhabilitar al actual para poder registrar uno nuevo.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        roles_permitidos = ROLES_PERMITIDOS.get(creator_role, [])
        if nombre_rol_nuevo not in roles_permitidos:
            return Response(
                {'detail': f'No tienes permiso para asignar el rol {nombre_rol_nuevo}.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Crear usuario en auth_user
        user = User.objects.create_user(
            username=d['cedula'],
            first_name=d['nombres'].upper(),
            last_name=d['apellidos'].upper(),
            password=d['password']
        )

        # Sincronizar con grupo Django
        grupo, _ = Group.objects.get_or_create(name=nombre_rol_nuevo)
        user.groups.add(grupo)

        # Registrar en usuarios_rol
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO usuarios_rol (user_id, id_rol) VALUES (%s, %s)",
                [user.id, d['id_rol']]
            )
            
            registrar_evento(request, "USUARIO_CREACION", f"Se creó el usuario {d['cedula']} con rol {nombre_rol_nuevo}")

        return Response({
            'id': user.id,
            'message': f'Usuario {d["cedula"]} creado exitosamente con rol {nombre_rol_nuevo}.'
        }, status=status.HTTP_201_CREATED)


class UsuarioDetailView(APIView):
    """Editar datos de un usuario existente."""
    permission_classes = [IsEncargadoOrAdmin]

    @transaction.atomic
    def patch(self, request, pk):
        serializer = EditarUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        creator_role = get_user_role(request.user)
        target_role = get_user_role(user)

        # Proteger al Superadmin: solo otra persona con permisos especiales o el mismo superadmin puede verse/editarse
        # Pero según el requisito: 'Nadie puede eliminar al admin, pero si modificar en caso de olvido'
        if (user.is_superuser or target_role == 'ADMINISTRADOR') and not request.user.is_superuser:
            return Response({'detail': 'No tienes permisos para editar al Administrador principal.'}, status=status.HTTP_403_FORBIDDEN)

        # Un ENCARGADO solo puede editar a FARMACEUTICO, PROVEEDURIA o a sí mismo
        if creator_role == 'ENCARGADO' and target_role not in ('FARMACEUTICO', 'PROVEEDURIA') and user.id != request.user.id:
            return Response({'detail': 'Como Encargado, solo tienes permisos para editar a Farmacéuticos y personal de Proveeduría.'}, status=status.HTTP_403_FORBIDDEN)

        # Verificar jerarquía de permisos para el nuevo rol
        with connection.cursor() as cursor:
            cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", [d['id_rol']])
            row = cursor.fetchone()
        if not row:
            return Response({'detail': 'Rol no válido.'}, status=status.HTTP_400_BAD_REQUEST)

        nombre_rol_nuevo = row[0].upper()

        # RESTRICCIÓN: Solo puede existir un ADMINISTRADOR y un DIRECTOR_SERVICIO_MEDICO activo
        if nombre_rol_nuevo in ('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO'):
            if nombre_rol_nuevo == 'ADMINISTRADOR':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(DISTINCT u.id) FROM auth_user u
                        LEFT JOIN usuarios_rol ur ON u.id = ur.user_id
                        LEFT JOIN roles r ON ur.id_rol = r.id_rol
                        WHERE (u.is_superuser = TRUE OR UPPER(r.nombre_rol) = 'ADMINISTRADOR')
                          AND u.id <> %s
                    """, [pk])
                    count = cursor.fetchone()[0]
                if count > 0:
                    return Response(
                        {'detail': 'Ya existe otro usuario con el rol de Administrador. Solo se permite un Administrador en el sistema.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                if user.is_active and check_active_director_exists(exclude_user_id=pk):
                    return Response(
                        {'detail': 'Ya existe otro Director de Servicio Médico activo en el sistema. Primero debe inhabilitar al actual para poder asignar este rol.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Si el rol cambia, verificar jerarquía de permisos para el nuevo rol
        if target_role != nombre_rol_nuevo:
            if not request.user.is_superuser:
                roles_permitidos = ROLES_PERMITIDOS.get(creator_role, [])
                if nombre_rol_nuevo not in roles_permitidos:
                    return Response({'detail': f'No tienes permiso para asignar el rol {nombre_rol_nuevo}.'}, status=status.HTTP_403_FORBIDDEN)

        # Capturar rol ANTERIOR antes de modificar
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT r.nombre_rol FROM roles r
                JOIN usuarios_rol ur ON r.id_rol = ur.id_rol
                WHERE ur.user_id = %s AND r.nombre_rol IN ('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO')
            """, [user.id])
            old_rol_row = cursor.fetchone()
        nombre_rol_anterior = old_rol_row[0].upper() if old_rol_row else 'SIN ROL'

        user.first_name = d['nombres'].upper()
        user.last_name = d['apellidos'].upper()
        password_changed = False
        if d.get('password'):
            user.set_password(d['password'])
            password_changed = True
        user.save()

        # Si se cambió la contraseña, actualizar password_updated_at
        if password_changed:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE auth_user SET password_updated_at = NOW() WHERE id = %s", [user.id])

        # Actualizar rol
        user.groups.clear()
        grupo, _ = Group.objects.get_or_create(name=nombre_rol_nuevo)
        user.groups.add(grupo)

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM usuarios_rol WHERE user_id = %s AND id_rol IN (SELECT id_rol FROM roles WHERE nombre_rol IN ('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'))", [user.id])
            if cursor.fetchone():
                cursor.execute("UPDATE usuarios_rol SET id_rol = %s WHERE user_id = %s AND id_rol IN (SELECT id_rol FROM roles WHERE nombre_rol IN ('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'))", [d['id_rol'], user.id])
            else:
                cursor.execute("INSERT INTO usuarios_rol (user_id, id_rol) VALUES (%s, %s)", [user.id, d['id_rol']])

        # Construir mensaje de auditoría descriptivo
        cambios = []
        if nombre_rol_anterior != nombre_rol_nuevo:
            cambios.append(f"Rol: {nombre_rol_anterior} → {nombre_rol_nuevo}")
        if password_changed:
            cambios.append("Contraseña actualizada por administrador")
        if not cambios:
            cambios.append("Datos personales actualizados")
        
        descripcion_auditoria = f"Usuario {user.username} modificado. " + " | ".join(cambios)
        registrar_evento(request, "USUARIO_EDICION", descripcion_auditoria)

        return Response({'message': f'Usuario {user.username} actualizado exitosamente.'})


class ToggleEstadoUsuarioView(APIView):
    """Activa o desactiva la cuenta de un usuario."""
    permission_classes = [IsEncargadoOrAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if int(pk) == request.user.id:
            return Response({'detail': 'No puedes desactivar tu propia cuenta.'}, status=status.HTTP_400_BAD_REQUEST)

        creator_role = get_user_role(request.user)
        target_role = get_user_role(user)

        # REGLA 1: NADIE puede desactivar a un ADMINISTRADOR (is_superuser o rol ADMINISTRADOR)
        if user.is_superuser or target_role == 'ADMINISTRADOR':
            return Response({'detail': 'No tienes permisos para desactivar a una cuenta con jerarquía de Administrador.'}, status=status.HTTP_403_FORBIDDEN)

        # REGLA 2: Los ENCARGADOS solo pueden desactivar a FARMACEUTAS y PROVEEDURIA
        if creator_role == 'ENCARGADO':
            if target_role not in ('FARMACEUTICO', 'PROVEEDURIA'):
                return Response({'detail': 'Como Encargado, solo tienes permisos para desactivar cuentas de Farmacéuticos y personal de Proveeduría.'}, status=status.HTTP_403_FORBIDDEN)

        # REGLA 3: Si se está habilitando a un DIRECTOR_SERVICIO_MEDICO, verificar que no haya otro activo
        if not user.is_active: # El estado actual es inactivo, por lo tanto pasará a ser activo
            if target_role == 'DIRECTOR_SERVICIO_MEDICO':
                if check_active_director_exists(exclude_user_id=pk):
                    return Response(
                        {'detail': 'Ya existe un Director de Servicio Médico activo en el sistema. Primero debe inhabilitar al actual para poder activar este usuario.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        user.is_active = not user.is_active
        user.save()
        accion = 'HABILITADO' if user.is_active else 'DESACTIVADO'
        
        registrar_evento(request, "USUARIO_ESTADO", f"El usuario {user.username} fue {accion}")
        return Response({'message': f'El usuario {user.username} ha sido {accion}.', 'is_active': user.is_active})


class RolesDisponiblesView(APIView):
    """Retorna solo los roles que el usuario autenticado puede asignar."""
    permission_classes = [IsEncargadoOrAdmin]

    def get(self, request):
        creator_role = get_user_role(request.user)
        if request.user.is_superuser or creator_role == 'ADMINISTRADOR':
            roles_buscados = ['DIRECTOR_SERVICIO_MEDICO', 'ENCARGADO', 'FARMACEUTICO', 'AUDITOR', 'PROVEEDURIA']
        else:
            roles_buscados = ROLES_PERMITIDOS.get(creator_role, [])

        if not roles_buscados:
            return Response([])

        with connection.cursor() as cursor:
            # Filtramos por modulo y por nombre usando UPPER para evitar discrepancias
            cursor.execute(
                "SELECT id_rol, nombre_rol FROM roles WHERE UPPER(nombre_rol) = ANY(%s::text[]) AND modulo IN ('FARMACIA', 'SERVICIO_MEDICO') ORDER BY nombre_rol",
                [[r.upper() for r in roles_buscados]]
            )
            rows = cursor.fetchall()

        return Response([{'id_rol': r[0], 'nombre_rol': r[1]} for r in rows])


class VerificarCedulaView(APIView):
    """Verifica si una cédula ya está registrada en el sistema."""
    permission_classes = [IsEncargadoOrAdmin]

    def get(self, request, cedula):
        existe = User.objects.filter(username=cedula).exists()
        return Response({'existe': existe})


class SigefirrhHProxyView(APIView):
    """Proxy hacia el WebService de SIGEFIRRHH para buscar datos del empleado por cédula."""
    permission_classes = [IsEncargadoOrAdmin]

    def get(self, request, cedula):
        ws_url = getattr(settings, 'SIGEFIRRHH_URL', '')
        if not ws_url:
            return Response({'detail': 'El WebService de SIGEFIRRHH no está configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            url = f"{ws_url.rstrip('/')}/{cedula}"
            resp = http_requests.get(url, timeout=2)
            resp.raise_for_status()
            return Response(resp.json())
        except http_requests.exceptions.ConnectionError:
            return Response({'detail': 'No se pudo conectar al WebService de SIGEFIRRHH.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except http_requests.exceptions.Timeout:
            return Response({'detail': 'El WebService de SIGEFIRRHH tardó demasiado en responder.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except Exception as e:
            return Response({'detail': f'Error al consultar SIGEFIRRHH: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)
