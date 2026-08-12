from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.contrib.auth.mixins import AccessMixin
from django.db import connection
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_protect

class DBQueryMixin:
    """Mixin para ejecutar consultas directas a PostgreSQL sin modelos"""
    def execute_query(self, query, params=None):
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
            return None

class UserValidationMixin(View):
    required_groups = []

    @method_decorator(csrf_protect)
    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST':
            username = (request.POST.get('username') or '').strip()
            password = request.POST.get('password') or ''

            if not username or not password:
                messages.error(request, "Usuario y contraseña son requeridos")
                return redirect('login')

            user = authenticate(request, username=username, password=password)
            if user is None:
                messages.error(request, "Usuario o contraseña incorrectos")
                return redirect('login')

            if not getattr(user, 'is_active', True):
                messages.error(request, "La cuenta está desactivada")
                return redirect('login')

            login(request, user)
            return redirect('index')

        if request.user.is_authenticated:
            return redirect('index')

        return super().dispatch(request, *args, **kwargs)

class RoleRequiredMixin(AccessMixin):
    required_groups = []
    
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        
        user_groups = request.user.groups.values_list('name', flat=True)
        if request.user.is_superuser or 'Administrador' in user_groups:
            return super().dispatch(request, *args, **kwargs)
            
        if not any(group in user_groups for group in self.required_groups):
            messages.error(request, "No tienes permisos para acceder a esta sección.")
            return redirect('index')
            
        return super().dispatch(request, *args, **kwargs)

class AdminRequiredMixin(RoleRequiredMixin): required_groups = ['Administrador']
class ManagerRequiredMixin(RoleRequiredMixin): required_groups = ['Administrador', 'Gerente']
class PharmacistRequiredMixin(RoleRequiredMixin): required_groups = ['Administrador', 'Gerente', 'Farmaceuta']