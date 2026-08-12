from django.db import connection
import json

# Constante del sistema actual
SISTEMA_ACTUAL = 'FARMACIA'

def registrar_evento(request, accion, descripcion, metadata=None):
    """
    Registra un evento en la tabla de auditoria_logs con etiqueta de sistema.
    """
    user_id = request.user.id if request and request.user.is_authenticated else None
    ip_address = None
    sistema_actual = 'SISTEMA'
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
            
        path = request.path.lower()
        if 'proveeduria' in path:
            sistema_actual = 'PROVEEDURIA'
        elif 'farmacia' in path or 'medicamentos' in path or 'catalogos' in path:
            sistema_actual = 'FARMACIA'
        else:
            sistema_actual = 'SISTEMA'

    from django.utils import timezone
    now_val = timezone.now()
    with connection.cursor() as cursor:
        # Intentar insertar con columna 'sistema' si existe
        try:
            cursor.execute("""
                INSERT INTO auditoria_logs (id_usuario, accion, descripcion, ip_address, metadata, sistema, fecha_hora)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, [user_id, accion, descripcion, ip_address, json.dumps(metadata) if metadata else None, sistema_actual, now_val])
        except Exception:
            # Fallback sin columna sistema (si aún no existe)
            cursor.execute("""
                INSERT INTO auditoria_logs (id_usuario, accion, descripcion, ip_address, metadata, fecha_hora)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, [user_id, accion, descripcion, ip_address, json.dumps(metadata) if metadata else None, now_val])

def log_login(request, user, manual=True):
    tipo = "MANUAL" if manual else "AUTO"
    registrar_evento(request, "LOGIN", f"Inicio de sesión {tipo} para el usuario {user.username}", {"user_id": user.id})

def log_logout(request, user, manual=True):
    tipo = "MANUAL" if manual else "TIMEOUT"
    registrar_evento(request, "LOGOUT", f"Cierre de sesión {tipo} para el usuario {user.username}", {"user_id": user.id})

def log_inventario(request, accion, item_id, detalle):
    registrar_evento(request, f"INVENTARIO_{accion}", detalle, {"item_id": item_id})

def log_usuarios(request, accion, target_user_id, detalle):
    registrar_evento(request, f"USUARIOS_{accion}", detalle, {"target_id": target_user_id})

def log_descarga(request, tipo, nombre_archivo):
    registrar_evento(request, "DESCARGA", f"Descarga de {tipo}: {nombre_archivo}")
