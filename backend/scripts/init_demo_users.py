import os
import sys
import django

# Asegurar que el entorno de Django esté configurado
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventario_farmacia.settings')
django.setup()

from django.contrib.auth.models import User
from api.models.auth_models import UserProfile

ROLES = [
    ('ADMINISTRADOR', 'admin', 'Admin123*'),
    ('DIRECTOR_SERVICIO_MEDICO', 'director', 'Director123*'),
    ('PROVEEDURIA', 'proveeduria', 'Proveeduria123*'),
    ('FARMACEUTICO', 'farmaceutico', 'Farmaceutico123*'),
    ('ENCARGADO', 'encargado', 'Encargado123*'),
    ('AUDITOR', 'auditor', 'Auditor123*'),
]

def create_demo_users():
    print("Iniciando creación de usuarios de prueba...")
    for rol, username, password in ROLES:
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_password(password)
            user.save()
            # Crear el perfil con el rol correspondiente
            UserProfile.objects.create(user=user, rol=rol)
            print(f"[OK] Usuario '{username}' creado con rol {rol} (Contraseña: {password})")
        else:
            print(f"[SKIP] Usuario '{username}' ya existe.")

if __name__ == '__main__':
    create_demo_users()
    print("Proceso finalizado.")
