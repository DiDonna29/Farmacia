from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib import messages
from django.db import transaction, connection
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

# Nota: Asegúrate de que este mixin exista o elimínalo si no lo usas
# from inventario_farmacia.mixins import AdminRequiredMixin 

@login_required
def gestion_usuarios(request):
    """Lista usuarios y roles dinámicos desde la DB"""
    # Obtenemos los roles directamente de la tabla 'roles'
    with connection.cursor() as cursor:
        cursor.execute("SELECT id_rol, nombre_rol FROM roles ORDER BY nombre_rol ASC")
        roles = [{'id': row[0], 'name': row[1]} for row in cursor.fetchall()]
    
    # Traer usuarios con sus grupos para optimizar consultas
    usuarios_queryset = User.objects.prefetch_related('groups').all().order_by('-date_joined')
    
    usuarios = []
    for u in usuarios_queryset:
        rol = u.groups.first()
        usuarios.append({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_active': u.is_active,
            'rol_nombre': rol.name if rol else 'SIN ROL',
            'id_rol': rol.id if rol else None
        })

    context = {
        'roles': roles,
        'usuarios': usuarios
    }
    return render(request, 'usuarios_rol.html', context)

@login_required
def verificar_cedula(request, cedula):
    """Endpoint para verificar si la cédula ya existe en la base de datos local"""
    existe = User.objects.filter(username=cedula).exists()
    return JsonResponse({'existe': existe})

@transaction.atomic
@login_required
def guardar_usuario(request):
    """Crea un nuevo usuario, le asigna grupo de Django y registra en usuarios_rol"""
    if request.method == 'POST':
        cedula = request.POST.get('cedula', '').strip()
        nombres = request.POST.get('nombres', '').strip().upper()
        apellidos = request.POST.get('apellidos', '').strip().upper()
        id_rol = request.POST.get('id_rol')
        password_raw = request.POST.get('password')

        # Validación de campos vacíos
        if not all([cedula, nombres, apellidos, id_rol, password_raw]):
            messages.error(request, "TODOS LOS CAMPOS SON OBLIGATORIOS PARA EL REGISTRO.")
            return redirect('gestion_usuarios')

        # Validación de duplicados (Respaldo por si saltan el JS)
        if User.objects.filter(username=cedula).exists():
            messages.error(request, f"LA CÉDULA {cedula} YA SE ENCUENTRA REGISTRADA EN EL SISTEMA.")
            return redirect('gestion_usuarios')

        try:
            # 1. Obtener el nombre del rol desde la tabla personalizada
            with connection.cursor() as cursor:
                cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", [id_rol])
                row = cursor.fetchone()
                
            if not row:
                messages.error(request, "EL ROL SELECCIONADO NO ES VÁLIDO.")
                return redirect('gestion_usuarios')
            
            nombre_rol = row[0]

            # 2. Crear el usuario en auth_user
            user = User.objects.create_user(
                username=cedula,
                first_name=nombres,
                last_name=apellidos,
                password=password_raw
            )
            
            # 3. Sincronizar con Grupos de Django (Permisos)
            grupo, _ = Group.objects.get_or_create(name=nombre_rol)
            user.groups.add(grupo)

            # 4. Insertar en la tabla relacional usuarios_rol
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO usuarios_rol (user_id, id_rol) 
                    VALUES (%s, %s)
                """, [user.id, id_rol])

            # 5. Configurar is_staff para roles administrativos
            if nombre_rol.upper() in ['ADMINISTRADOR', 'GERENTE']:
                user.is_staff = True
                user.save()

            messages.success(request, f"¡ÉXITO! EL USUARIO {cedula} HA SIDO CREADO Y VINCULADO CORRECTAMENTE.")

        except Exception as e:
            messages.error(request, f"ERROR CRÍTICO AL GUARDAR: {str(e).upper()}")
            
    return redirect('gestion_usuarios')

@transaction.atomic
@login_required
def editar_usuario(request):
    """Actualiza los datos del usuario y sincroniza su rol"""
    if request.method == 'POST':
        user_id = request.POST.get('user_id')
        nombres = request.POST.get('nombres', '').strip().upper()
        apellidos = request.POST.get('apellidos', '').strip().upper()
        id_rol = request.POST.get('id_rol')
        password_raw = request.POST.get('password')

        user = get_object_or_404(User, id=user_id)
        
        try:
            # 1. Actualizar auth_user
            user.first_name = nombres
            user.last_name = apellidos
            if password_raw and password_raw.strip():
                user.set_password(password_raw)
            user.save()

            # 2. Sincronizar tabla roles y Grupos
            with connection.cursor() as cursor:
                cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", [id_rol])
                res_rol = cursor.fetchone()
                
                if not res_rol:
                    messages.error(request, "ERROR: EL ROL ASIGNADO YA NO EXISTE.")
                    return redirect('gestion_usuarios')
                
                nombre_rol = res_rol[0]

                # Actualizar o Insertar en usuarios_rol
                cursor.execute("SELECT 1 FROM usuarios_rol WHERE user_id = %s", [user.id])
                if cursor.fetchone():
                    cursor.execute("UPDATE usuarios_rol SET id_rol = %s WHERE user_id = %s", [id_rol, user.id])
                else:
                    cursor.execute("INSERT INTO usuarios_rol (user_id, id_rol) VALUES (%s, %s)", [user.id, id_rol])

            # 3. Refrescar Grupos de Django
            user.groups.clear()
            grupo, _ = Group.objects.get_or_create(name=nombre_rol)
            user.groups.add(grupo)
            
            # Ajustar staff
            user.is_staff = True if nombre_rol.upper() in ['ADMINISTRADOR', 'GERENTE'] else False
            user.save()

            messages.success(request, f"LOS DATOS DEL USUARIO {user.username} SE HAN ACTUALIZADO EXITOSAMENTE.")
            
        except Exception as e:
            messages.error(request, f"FALLO AL EDITAR: {str(e).upper()}")

    return redirect('gestion_usuarios')

@login_required
def estado_usuario(request, user_id):
    """Cambia el estado (Activo/Inactivo) de la cuenta"""
    user = get_object_or_404(User, id=user_id)
    
    if user.id == request.user.id:
        messages.warning(request, "AVISO: NO PUEDES DESACTIVAR TU PROPIA CUENTA ADMINISTRATIVA.")
        return redirect('gestion_usuarios')

    user.is_active = not user.is_active
    user.save()
    
    accion = "HABILITADO" if user.is_active else "DESACTIVADO"
    messages.success(request, f"EL ACCESO DEL USUARIO {user.username} HA SIDO {accion} CON ÉXITO.")
    return redirect('gestion_usuarios')