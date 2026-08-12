import os
import sys
import subprocess

def run():
    print("=== Iniciando Migraciones y Configuración de DB ===")
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    python_exec = sys.executable

    print("\n1. Ejecutando makemigrations y migrate...")
    try:
        subprocess.run([python_exec, "manage.py", "makemigrations"], cwd=base_dir, check=True)
        subprocess.run([python_exec, "manage.py", "migrate"], cwd=base_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando migraciones: {e}")
        return

    print("\n2. Verificando o recreando Vistas SQL de Proveeduría y Farmacia...")
    import django
    sys.path.append(base_dir)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventario_farmacia.settings')
    django.setup()
    from django.db import connection

    sql_proveeduria = """
    CREATE OR REPLACE VIEW proveeduria.vista_semaforo_inventario AS
     SELECT l.id_lote,
        ((m.nombre_generico)::text || COALESCE((' - '::text || ( SELECT string_agg((((((pa.nombre_principio)::text || ' '::text) || mc.concentracion_valor) || ' '::text) || (u.nombre_unidad)::text), ' + '::text) AS string_agg
               FROM ((farmacia.medicamento_componentes mc
                 JOIN farmacia.principios_activos pa ON ((mc.id_principio = pa.id_principio)))
                 JOIN farmacia.unidades_medida u ON ((mc.id_unidad = u.id_unidad)))
              WHERE (mc.id_med_base = m.id_med_base))), ''::text)) AS medicamento_detallado,
        p.nombre_presentacion,
        l.numero_lote,
        l.cantidad_actual,
        l.fecha_vencimiento,
        l.fecha_vencimiento_original,
        l.activo,
            CASE
                WHEN (l.cantidad_actual <= 0) THEN 'AGOTADO'::text
                WHEN (l.fecha_vencimiento < CURRENT_DATE) THEN 'VENCIDO'::text
                WHEN (l.fecha_vencimiento <= (CURRENT_DATE + '4 mons'::interval)) THEN 'PRÓXIMO A VENCER'::text
                ELSE 'ÓPTIMO'::text
            END AS estado_logico,
            CASE
                WHEN (l.cantidad_actual <= 0) THEN 'secondary'::text
                WHEN (l.fecha_vencimiento < CURRENT_DATE) THEN 'danger'::text
                WHEN (l.fecha_vencimiento <= (CURRENT_DATE + '4 mons'::interval)) THEN 'warning'::text
                ELSE 'success'::text
            END AS color_clase
       FROM ((proveeduria.lotes l
         JOIN farmacia.medicamentos_base m ON ((l.id_med_base = m.id_med_base)))
         LEFT JOIN farmacia.presentaciones_medicamento p ON ((m.id_presentacion = p.id_presentacion)));
    """
    
    sql_farmacia = sql_proveeduria.replace("proveeduria.lotes l", "farmacia.lotes l").replace("CREATE OR REPLACE VIEW proveeduria.vista_semaforo_inventario", "CREATE OR REPLACE VIEW farmacia.vista_semaforo_inventario")

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_proveeduria)
            cursor.execute(sql_farmacia)
            connection.commit()
        print("[OK] Vistas SQL creadas/actualizadas correctamente.")
    except Exception as e:
        print(f"[ERROR] No se pudieron crear las vistas SQL: {e}")

    print("\n=== Configuración de DB Finalizada ===")

if __name__ == '__main__':
    run()
