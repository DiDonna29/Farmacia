"""
Permisos personalizados para la API de Farmacia DEM.

Jerarquía de roles:
  - ADMINISTRADOR: acceso total
  - ENCARGADO: gestión de farmacéuticos + inventario + dotación + despacho + estadísticas
  - FARMACEUTICO: inventario + dotación + despacho
"""
import logging
from rest_framework.permissions import BasePermission
from django.db import connection

logger = logging.getLogger(__name__)


def get_user_role(user):
    """Retorna el nombre del rol del usuario desde la tabla usuarios_rol o grupos de Django."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        logger.debug(f"[PERMS] Usuario '{user.username}' es Superusuario -> Rol: ADMINISTRADOR")
        return 'ADMINISTRADOR'
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT r.nombre_rol FROM roles r
            JOIN usuarios_rol ur ON r.id_rol = ur.id_rol
            WHERE ur.user_id = %s AND r.modulo IN ('FARMACIA', 'SERVICIO_MEDICO')
        """, [user.id])
        row = cursor.fetchone()
        print(f"--- [GET_USER_ROLE] User ID: {user.id}, Row: {row} ---")
    
    if row:
        rol = row[0].upper()
    else:
        # Fallback a Grupos de Django
        grupo = user.groups.first()
        rol = grupo.name.upper() if grupo else None
        
    logger.info(f"[DEBUG_ROLE] Usuario: {user.username} | ID: {user.id} | Rol Detectado: {rol}")
    return rol


class IsAdministrador(BasePermission):
    """Solo el rol ADMINISTRADOR tiene acceso."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'ADMINISTRADOR'


class IsEncargadoOrAdmin(BasePermission):
    """ENCARGADO, DIRECTOR_SERVICIO_MEDICO o ADMINISTRADOR tienen acceso."""
    def has_permission(self, request, view):
        return get_user_role(request.user) in ('ENCARGADO', 'DIRECTOR_SERVICIO_MEDICO', 'ADMINISTRADOR')


class IsOperativoOrAbove(BasePermission):
    """Cualquier rol operativo tiene acceso (Farmacia y Proveduría)."""
    def has_permission(self, request, view):
        rol = get_user_role(request.user)
        return rol in ('FARMACEUTICO', 'ENCARGADO', 'ADMINISTRADOR', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO')


class IsFarmaceuticoOrAbove(BasePermission):
    """Cualquier rol operativo de farmacia tiene acceso."""
    def has_permission(self, request, view):
        rol = get_user_role(request.user)
        return rol in ('FARMACEUTICO', 'ENCARGADO', 'ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO')


class IsAuditorOrAdmin(BasePermission):
    """Solo el rol AUDITOR, DIRECTOR_SERVICIO_MEDICO o ADMINISTRADOR tienen acceso."""
    def has_permission(self, request, view):
        return get_user_role(request.user) in ('AUDITOR', 'ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO')
