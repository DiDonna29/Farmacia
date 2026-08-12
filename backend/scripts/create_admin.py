import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventario_farmacia.settings')
django.setup()

from django.contrib.auth.models import User, Group
from django.db import connection

def create_admin_user():
    username = '12345678'
    print(f"Verificando usuario administrador ({username})...")
    
    user = User.objects.filter(username=username).first()
    if not user:
        # Crear usuario
        user = User.objects.create(
            username=username,
            first_name='USUARIO',
            last_name='ADMINISTRADOR',
            email='admin@tsj-dem.gob.ve',
            is_staff=True,
            is_superuser=True
        )
        user.set_password('Admin12345678*')
        user.save()
        print(f"[OK] Usuario {username} creado.")
    else:
        print(f"[SKIP] Usuario {username} ya existe.")
        
    # Asignar grupo de Django
    grupo, _ = Group.objects.get_or_create(name='ADMINISTRADOR')
    user.groups.add(grupo)
    
    # Asignar rol en la tabla usuarios_rol
    with connection.cursor() as cursor:
        # Buscar id_rol
        cursor.execute("SELECT id_rol FROM roles WHERE nombre_rol = 'ADMINISTRADOR'")
        row = cursor.fetchone()
        if row:
            id_rol = row[0]
            # Verificar si ya tiene el rol asignado
            cursor.execute("SELECT 1 FROM usuarios_rol WHERE user_id = %s AND id_rol = %s", [user.id, id_rol])
            if not cursor.fetchone():
                cursor.execute("INSERT INTO usuarios_rol (user_id, id_rol) VALUES (%s, %s)", [user.id, id_rol])
                print("[OK] Rol ADMINISTRADOR asignado en usuarios_rol.")
            else:
                print("[SKIP] El rol ya está asignado en usuarios_rol.")
        else:
            print("[ERROR] Rol ADMINISTRADOR no encontrado en la tabla roles.")

if __name__ == '__main__':
    create_admin_user()
