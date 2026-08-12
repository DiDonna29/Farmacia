"""
Script maestro de inicialización para ambientes de producción.
Configura esquemas, tablas específicas, columnas extras, vistas, roles y usuarios principales.

Ejecutar con: python setup_production.py
"""
import os
import django
from django.db import connection

# Inicializar configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventario_farmacia.settings')
django.setup()

from django.contrib.auth.models import User, Group
from django.contrib.auth.hashers import make_password

def setup_production():
    print("======================================================================")
    print("INICIANDO CONFIGURACIÓN INICIAL DE PRODUCCIÓN (FARMACIA DEM)")
    print("======================================================================")

    with connection.cursor() as cursor:
        # 1. Crear esquemas si no existen
        print("\n[*] Creando esquemas...")
        cursor.execute("CREATE SCHEMA IF NOT EXISTS farmacia;")
        cursor.execute("CREATE SCHEMA IF NOT EXISTS proveeduria;")
        cursor.execute("CREATE SCHEMA IF NOT EXISTS servicio_medico;")
        print("  - Esquemas creados/verificados: farmacia, proveeduria, servicio_medico.")

        # 2. Mover tablas base migradas por Django a sus respectivos esquemas
        print("\n[*] Reorganizando tablas y vistas base...")
        tablas_farmacia = [
            'medicamentos_base', 'lotes', 'despachos_actas', 
            'categorias_medicamento', 'presentaciones_medicamento', 
            'clasificaciones_medicamentos', 'unidades_medida', 'tallas_calibres'
        ]
        for tabla in tablas_farmacia:
            try:
                cursor.execute(f"ALTER TABLE IF EXISTS public.{tabla} SET SCHEMA farmacia;")
                print(f"  - Movida tabla: public.{tabla} -> farmacia.{tabla}")
            except Exception as e:
                print(f"  - (Aviso/Ignorar si ya se movió) public.{tabla}: {e}")

        tablas_servicio_medico = [
            'pacientes', 'historias_clinicas', 'cola_atencion', 
            'triaje_datos', 'consultas_medicas'
        ]
        for tabla in tablas_servicio_medico:
            try:
                cursor.execute(f"ALTER TABLE IF EXISTS public.{tabla} SET SCHEMA servicio_medico;")
                print(f"  - Movida tabla: public.{tabla} -> servicio_medico.{tabla}")
            except Exception as e:
                print(f"  - (Aviso/Ignorar si ya se movió) public.{tabla}: {e}")

        # 3. Crear tablas específicas en esquema proveeduria si no existen
        print("\n[*] Creando tablas del módulo Proveeduría...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proveeduria.lotes (
                id_lote serial PRIMARY KEY,
                id_med_base int REFERENCES farmacia.medicamentos_base(id_med_base),
                numero_lote varchar(50),
                cantidad_inicial int NOT NULL,
                cantidad_actual int NOT NULL,
                fecha_vencimiento date NOT NULL,
                fecha_ingreso timestamp DEFAULT now(),
                usuario_registro int REFERENCES public.auth_user(id),
                activo bool DEFAULT true,
                CONSTRAINT uq_med_lote UNIQUE (id_med_base, numero_lote)
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proveeduria.solicitudes (
                id_solicitud serial PRIMARY KEY,
                folio_solicitud varchar(20) UNIQUE,
                origen varchar(50),
                destino varchar(50),
                id_usuario_solicitante int REFERENCES public.auth_user(id),
                id_usuario_procesador int REFERENCES public.auth_user(id),
                fecha_solicitud timestamp DEFAULT now(),
                fecha_entrega timestamp,
                estado varchar(20) DEFAULT 'PENDIENTE',
                observaciones text
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proveeduria.solicitudes_detalle (
                id_detalle serial PRIMARY KEY,
                id_solicitud int REFERENCES proveeduria.solicitudes(id_solicitud) ON DELETE CASCADE,
                id_med_base int REFERENCES farmacia.medicamentos_base(id_med_base),
                cantidad_solicitada int NOT NULL,
                cantidad_entregada int DEFAULT 0
            );
        """)
        print("  - Tablas de proveeduria verificadas.")

        # 4. Crear tabla de auditoria_logs si no existe
        print("\n[*] Creando tabla de Auditoría...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.auditoria_logs (
                id_log SERIAL PRIMARY KEY,
                id_usuario INT REFERENCES public.auth_user(id) ON DELETE SET NULL,
                accion VARCHAR(100) NOT NULL,
                descripcion TEXT NOT NULL,
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                metadata JSONB
            );
        """)
        print("  - Tabla public.auditoria_logs verificada.")

        # 5. Agregar columnas extras si faltan
        print("\n[*] Asegurando columnas extras de soporte...")
        
        # Lotes: fecha_vencimiento_original
        try:
            cursor.execute("ALTER TABLE farmacia.lotes ADD COLUMN fecha_vencimiento_original DATE;")
            cursor.execute("UPDATE farmacia.lotes SET fecha_vencimiento_original = fecha_vencimiento WHERE fecha_vencimiento_original IS NULL;")
            print("  + Columna 'fecha_vencimiento_original' agregada a farmacia.lotes.")
        except Exception:
            print("  - Columna 'fecha_vencimiento_original' ya existía en farmacia.lotes.")

        # Despachos: parentesco_beneficiario y sexo_beneficiario
        try:
            cursor.execute("ALTER TABLE farmacia.despachos_actas ADD COLUMN parentesco_beneficiario VARCHAR(50);")
            print("  + Columna 'parentesco_beneficiario' agregada a despachos_actas.")
        except Exception:
            print("  - Columna 'parentesco_beneficiario' ya existía.")

        try:
            cursor.execute("ALTER TABLE farmacia.despachos_actas ADD COLUMN sexo_beneficiario VARCHAR(20);")
            print("  + Columna 'sexo_beneficiario' agregada a despachos_actas.")
        except Exception:
            print("  - Columna 'sexo_beneficiario' ya existía.")

        try:
            cursor.execute("ALTER TABLE farmacia.despachos_actas ADD COLUMN cedula_titular BIGINT;")
            print("  + Columna 'cedula_titular' agregada a despachos_actas.")
        except Exception:
            print("  - Columna 'cedula_titular' ya existía.")

        try:
            cursor.execute("ALTER TABLE farmacia.despachos_actas ADD COLUMN nombre_titular TEXT;")
            print("  + Columna 'nombre_titular' agregada a despachos_actas.")
        except Exception:
            print("  - Columna 'nombre_titular' ya existía.")

        # 6. Crear/Reemplazar Vistas
        print("\n[*] Configurando vistas SQL...")
        
        # Eliminar vista vieja si estaba en public
        cursor.execute("DROP VIEW IF EXISTS public.vista_semaforo_inventario CASCADE;")
        cursor.execute("DROP VIEW IF EXISTS farmacia.vista_semaforo_inventario CASCADE;")
        cursor.execute("""
            CREATE VIEW farmacia.vista_semaforo_inventario AS
            SELECT l.id_lote,
                (((m.nombre_generico::text || ' '::text) || m.concentracion_valor) || ' '::text) || u.nombre_unidad::text AS medicamento_detallado,
                p.nombre_presentacion,
                l.numero_lote,
                l.cantidad_actual,
                l.fecha_vencimiento,
                l.fecha_vencimiento_original,
                l.activo,
                CASE
                    WHEN l.cantidad_actual <= 0 THEN 'AGOTADO'::text
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'::text
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + '4 mons'::interval) THEN 'PRÓXIMO A VENCER'::text
                    ELSE 'ÓPTIMO'::text
                END AS estado_logico,
                CASE
                    WHEN l.cantidad_actual <= 0 THEN 'secondary'::text
                    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'danger'::text
                    WHEN l.fecha_vencimiento <= (CURRENT_DATE + '4 mons'::interval) THEN 'warning'::text
                    ELSE 'success'::text
                END AS color_clase
            FROM farmacia.lotes l
            JOIN farmacia.medicamentos_base m ON l.id_med_base = m.id_med_base
            JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion
            JOIN farmacia.unidades_medida u ON m.id_unidad = u.id_unidad;
        """)
        
        cursor.execute("DROP VIEW IF EXISTS proveeduria.vista_inventario CASCADE;")
        cursor.execute("""
            CREATE VIEW proveeduria.vista_inventario AS
            SELECT 
                l.id_lote,
                m.nombre_generico,
                p.nombre_presentacion,
                l.numero_lote,
                l.cantidad_actual,
                l.fecha_vencimiento,
                l.activo
            FROM proveeduria.lotes l
            JOIN farmacia.medicamentos_base m ON l.id_med_base = m.id_med_base
            JOIN farmacia.presentaciones_medicamento p ON m.id_presentacion = p.id_presentacion;
        """)
        print("  - Vistas de semáforo e inventario proveduría listas.")

        # 7. Inyectar/Sincronizar Roles del Negocio
        print("\n[*] Sembrando/Sincronizando catálogo de Roles...")
        roles_data = [
            (1, 'MEDICO', 'SERVICIO_MEDICO'),
            (2, 'ENFERMERA', 'SERVICIO_MEDICO'),
            (3, 'ADMINISTRADOR', 'FARMACIA'),
            (4, 'ENCARGADO', 'FARMACIA'),
            (5, 'FARMACEUTICO', 'FARMACIA'),
            (6, 'AUDITOR', 'FARMACIA'),
            (7, 'PROVEEDURIA', 'PROVEEDURIA'),
            (10, 'DIRECTOR_SERVICIO_MEDICO', 'FARMACIA')
        ]
        for id_rol, nombre, modulo in roles_data:
            # Primero buscamos si el rol ya existe por nombre
            cursor.execute("SELECT id_rol FROM public.roles WHERE nombre_rol = %s;", [nombre])
            row = cursor.fetchone()
            if row:
                existing_id = row[0]
                if existing_id != id_rol:
                    print(f"  - Rol '{nombre}' existe con ID {existing_id}. Cambiando a ID {id_rol}...")
                    # 1. Renombramos temporalmente el rol viejo para liberar su nombre_rol
                    temp_name = f"{nombre}_temp_rename"
                    cursor.execute("UPDATE public.roles SET nombre_rol = %s WHERE id_rol = %s;", [temp_name, existing_id])
                    # 2. Insertamos el nuevo rol con el ID y nombre correctos
                    cursor.execute("INSERT INTO public.roles (id_rol, nombre_rol, modulo) VALUES (%s, %s, %s);", [id_rol, nombre, modulo])
                    # 3. Actualizamos las referencias de la tabla usuarios_rol al nuevo ID
                    cursor.execute("UPDATE public.usuarios_rol SET id_rol = %s WHERE id_rol = %s;", [id_rol, existing_id])
                    # 4. Actualizamos las referencias de la tabla roles_permisos si existiera
                    try:
                        cursor.execute("UPDATE public.roles_permisos SET id_rol = %s WHERE id_rol = %s;", [id_rol, existing_id])
                    except Exception:
                        pass
                    # 5. Eliminamos el rol viejo temporal
                    cursor.execute("DELETE FROM public.roles WHERE id_rol = %s;", [existing_id])
                else:
                    # Mismo ID, actualizamos modulo por si acaso
                    cursor.execute("UPDATE public.roles SET modulo = %s WHERE id_rol = %s;", [modulo, id_rol])
            else:
                # Si no existe por nombre, verificamos si el ID destino ya está usado
                cursor.execute("SELECT nombre_rol FROM public.roles WHERE id_rol = %s;", [id_rol])
                id_row = cursor.fetchone()
                if id_row:
                    existing_name = id_row[0]
                    print(f"  - Conflicto: ID {id_rol} ya está usado por '{existing_name}'. Eliminando para reasignar...")
                    cursor.execute("DELETE FROM public.usuarios_rol WHERE id_rol = %s;", [id_rol])
                    try:
                        cursor.execute("DELETE FROM public.roles_permisos WHERE id_rol = %s;", [id_rol])
                    except Exception:
                        pass
                    cursor.execute("DELETE FROM public.roles WHERE id_rol = %s;", [id_rol])
                
                # Insertamos el nuevo rol
                cursor.execute("""
                    INSERT INTO public.roles (id_rol, nombre_rol, modulo) 
                    VALUES (%s, %s, %s);
                """, [id_rol, nombre, modulo])
        print(f"  - {len(roles_data)} roles sincronizados correctamente.")

    # 8. Sembrar Usuarios Iniciales
    print("\n[*] Asegurando usuarios iniciales del sistema...")
    
    # Grupos Django
    for _, g_name, _ in roles_data:
        Group.objects.get_or_create(name=g_name)

    # A) Administrador Maestro (Cédula: 12345678)
    admin_user, created = User.objects.get_or_create(
        username="12345678",
        defaults={
            "first_name": "USUARIO",
            "last_name": "ADMINISTRADOR",
            "email": "admin@farmaciadem.gob.ve",
            "is_superuser": True,
            "is_staff": True,
            "is_active": True
        }
    )
    if created:
        admin_user.set_password("admin12345678")
        admin_user.save()
    admin_user.groups.add(Group.objects.get(name="ADMINISTRADOR"))
    
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM public.usuarios_rol WHERE user_id = %s;", [admin_user.id])
        cursor.execute("INSERT INTO public.usuarios_rol (user_id, id_rol) VALUES (%s, 3);", [admin_user.id])
    print(f"  + Administrador Maestro: 12345678 {'(Creado)' if created else '(Existente)'}")

    # B) Director de Servicio Médico (Cédula: 9876543)
    director_user, created = User.objects.get_or_create(
        username="9876543",
        defaults={
            "first_name": "USUARIO",
            "last_name": "DIRECTOR",
            "email": "director@farmaciadem.gob.ve",
            "is_superuser": False,
            "is_staff": False,
            "is_active": True
        }
    )
    if created:
        director_user.set_password("director123")
        director_user.save()
    director_user.groups.add(Group.objects.get(name="DIRECTOR_SERVICIO_MEDICO"))
    
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM public.usuarios_rol WHERE user_id = %s;", [director_user.id])
        cursor.execute("INSERT INTO public.usuarios_rol (user_id, id_rol) VALUES (%s, 10);", [director_user.id])
    print(f"  + Director de Servicio Médico: 9876543 {'(Creado)' if created else '(Existente)'}")

    # C) Auditor de Sistema (Cédula: 96325874)
    auditor_user, created = User.objects.get_or_create(
        username="96325874",
        defaults={
            "first_name": "USUARIO",
            "last_name": "AUDITOR",
            "email": "auditor@farmaciadem.gob.ve",
            "is_superuser": False,
            "is_staff": False,
            "is_active": True
        }
    )
    if created:
        auditor_user.set_password("auditor123")
        auditor_user.save()
    auditor_user.groups.add(Group.objects.get(name="AUDITOR"))
    
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM public.usuarios_rol WHERE user_id = %s;", [auditor_user.id])
        cursor.execute("INSERT INTO public.usuarios_rol (user_id, id_rol) VALUES (%s, 6);", [auditor_user.id])
    print(f"  + Auditor de Sistema: 96325874 {'(Creado)' if created else '(Existente)'}")

    # 9. Reiniciar secuencias de PK
    print("\n[*] Corrigiendo secuencias de llaves primarias...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT setval('farmacia.presentaciones_medicamento_id_presentacion_seq', COALESCE((SELECT MAX(id_presentacion)+1 FROM farmacia.presentaciones_medicamento), 1), false);
            SELECT setval('farmacia.medicamentos_base_id_med_base_seq', COALESCE((SELECT MAX(id_med_base)+1 FROM farmacia.medicamentos_base), 1), false);
            SELECT setval('farmacia.lotes_id_lote_seq', COALESCE((SELECT MAX(id_lote)+1 FROM farmacia.lotes), 1), false);
            SELECT setval('proveeduria.lotes_id_lote_seq', COALESCE((SELECT MAX(id_lote)+1 FROM proveeduria.lotes), 1), false);
            SELECT setval('proveeduria.solicitudes_id_solicitud_seq', COALESCE((SELECT MAX(id_solicitud)+1 FROM proveeduria.solicitudes), 1), false);
            SELECT setval('proveeduria.solicitudes_detalle_id_detalle_seq', COALESCE((SELECT MAX(id_detalle)+1 FROM proveeduria.solicitudes_detalle), 1), false);
            SELECT setval('public.roles_id_rol_seq', COALESCE((SELECT MAX(id_rol)+1 FROM public.roles), 1), false);
        """)
    print("  - Secuencias de IDs sincronizadas correctamente.")

    print("\n======================================================================")
    print("✓ CONFIGURACIÓN DE PRODUCCIÓN COMPLETADA EXITOSAMENTE")
    print("======================================================================")

if __name__ == "__main__":
    setup_production()
