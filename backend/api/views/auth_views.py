import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db import connection
from django.utils import timezone
from django.contrib.auth.models import User
from api.permissions import get_user_role
from administrador.models import Titular
from api.serializers.auth_serializer import (
    LoginSerializer, UserProfileSerializer, UserProfileDetailSerializer,
    PasswordResetVerifySerializer, ChangePasswordSerializer
)
from api.utils.auditoria import log_login, log_logout

logger = logging.getLogger(__name__)


class LoginView(APIView):
    """Endpoint de login. Retorna access + refresh token y perfil del usuario."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user = authenticate(request, username=username, password=password)
        
        ip_addr = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        if not user:
            logger.warning(f"[AUTH] Intento fallido para usuario: {username} | IP: {ip_addr}")
            return Response(
                {'detail': 'Credenciales incorrectas. Verifique su usuario y contraseña.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            logger.warning(f"[AUTH] Usuario desactivado intentó entrar: {username}")
            return Response(
                {'detail': 'Esta cuenta está desactivada. Contacte al administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )

        rol = get_user_role(user)
        if not rol and not user.is_superuser:
            logger.warning(f"[AUTH] Usuario sin rol asignado: {username}")
            return Response(
                {'detail': 'El usuario no tiene un rol asignado en el sistema.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Registro en Base de Datos (Auditoría)
        try:
            # Actualizar último acceso (estándar de Django)
            update_last_login(None, user)
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO historial_accesos (user_id, username, ip_address, user_agent)
                    VALUES (%s, %s, %s, %s)
                """, [user.id, user.username, ip_addr, user_agent])
            logger.info(f"[AUTH] Login exitoso: {username} | Rol: {rol or 'ADMINISTRADOR'} | IP: {ip_addr}")
        except Exception as e:
            logger.error(f"[AUTH] Error al registrar historial: {str(e)}")

        refresh = RefreshToken.for_user(user)
        
        # Check password expiration vía Raw SQL (Intervalo de 90 días)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT (password_updated_at + interval '90 days' < NOW()) 
                FROM auth_user WHERE id = %s
            """, [user.id])
            expired = cursor.fetchone()[0]

        if expired:
            return Response({
                'code': 'PASSWORD_EXPIRED',
                'detail': 'Su contraseña ha expirado (más de 90 días). Debe cambiarla para continuar.',
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'rol': rol or 'ADMINISTRADOR',
                }
            }, status=status.HTTP_200_OK)

        # Auditoría de Login
        log_login(request, user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'rol': rol or 'ADMINISTRADOR',
                'is_active': user.is_active,
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Invalida el refresh token (blacklist)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        manual = request.data.get('manual', True)
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            log_logout(request, request.user, manual=manual)
            return Response({'detail': 'Sesión finalizada.'}, status=status.HTTP_200_OK)
        except Exception:
            # Si el token ya expiró o es inválido, igual consideramos logout exitoso para el cliente
            log_logout(request, request.user, manual=manual)
            return Response({'detail': 'Sesión finalizada.'}, status=status.HTTP_200_OK)


class MiPerfilView(APIView):
    """Retorna el perfil del usuario autenticado incluyendo su rol."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class PasswordResetVerifyView(APIView):
    """Valida cédula + correo para iniciar proceso de reset."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        import re
        cedula = re.sub(r'[^0-9]', '', serializer.validated_data['cedula'].strip())
        email = serializer.validated_data['email'].strip().lower()

        # 1. Intentar validar en Titulares (Ficha de Personal)
        titular = Titular.objects.filter(cedula=cedula).first()
        if titular and titular.correo and titular.correo.strip().lower() == email:
            return Response({'detail': 'Validación exitosa.'}, status=status.HTTP_200_OK)

        # 2. Fallback: Validar en User (Ficha de Acceso)
        user = User.objects.filter(username=cedula).first()
        if user and user.email and user.email.strip().lower() == email:
            logger.info(f"Identidad validada vía User fallback para CI {cedula}")
            return Response({'detail': 'Validación exitosa.'}, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'La cédula o el correo no coinciden con nuestros registros en el sistema.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetConfirmView(APIView):
    """Establece nueva contraseña tras validación de cédula + correo."""
    permission_classes = [AllowAny]

    def post(self, request):
        # Reutilizamos ChangePasswordSerializer (necesita cédula para saber a quién resetear)
        cedula = request.data.get('cedula')
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([cedula, email, new_password, confirm_password]):
            return Response({'detail': 'Faltan datos requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'detail': 'Las contraseñas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)

        # Doble validación de seguridad (debe coincidir con la lógica de PasswordResetVerifyView)
        is_titular = Titular.objects.filter(cedula=cedula, correo=email).exists()
        is_user_fallback = User.objects.filter(username=cedula, email=email).exists()

        if not (is_titular or is_user_fallback):
             return Response({'detail': 'Fallo de validación de seguridad.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(username=cedula)
            user.set_password(new_password)
            user.save()
            
            # Actualizar fecha de contraseña vía Raw SQL
            with connection.cursor() as cursor:
                cursor.execute("UPDATE auth_user SET password_updated_at = NOW() WHERE id = %s", [user.id])

            return Response({'detail': 'Contraseña restablecida correctamente.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class ChangePasswordView(APIView):
    """Cambio manual o forzado de contraseña."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        old_password = serializer.validated_data.get('old_password')
        new_password = serializer.validated_data['new_password']

        # Verificar si la clave ha expirado vía Raw SQL
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT (password_updated_at + interval '90 days' < NOW()) 
                FROM auth_user WHERE id = %s
            """, [user.id])
            res = cursor.fetchone()
            expired = res[0] if res else True # Por defecto expira si no hay fecha

        # Si el perfil no ha expirado, requerimos la contraseña anterior por seguridad
        if not expired:
            if not old_password:
                return Response({'old_password': ['Este campo es obligatorio para cambios manuales.']}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(old_password):
                return Response({'old_password': ['La contraseña actual es incorrecta.']}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Actualizar fecha de contraseña vía Raw SQL
        with connection.cursor() as cursor:
            cursor.execute("UPDATE auth_user SET password_updated_at = NOW() WHERE id = %s", [user.id])

        return Response({'detail': 'Contraseña actualizada exitosamente.'}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """Gestión del perfil del propio usuario."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileDetailSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Permite actualizar el correo electrónico y teléfono."""
        user = request.user
        email = request.data.get('email')
        phone = request.data.get('phone')
        
        if not email or not phone:
            return Response({'detail': 'El correo y el teléfono son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar en User (Email + Teléfono vía Raw SQL)
        user.email = email
        user.save()

        with connection.cursor() as cursor:
            cursor.execute("UPDATE auth_user SET telefono = %s WHERE id = %s", [phone, user.id])

        # Actualizar en Titular (si existe)
        titular = Titular.objects.filter(cedula=user.username).first()
        if titular:
            titular.correo = email
            titular.telefono_principal = phone
            titular.save()
            logger.info(f"[PROFILE] Datos de contacto actualizados para {user.username}")

        return Response({'detail': 'Información de contacto actualizada correctamente.'}, status=status.HTTP_200_OK)
