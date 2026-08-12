"""Serializers de autenticación y usuarios."""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import connection
from api.permissions import get_user_role


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        """Normaliza la cédula: elimina puntos, guiones y espacios."""
        import re
        return re.sub(r'[^0-9]', '', value.strip())


class UserProfileSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'rol', 'phone']

    def get_rol(self, obj):
        return get_user_role(obj)

    def get_phone(self, obj):
        with connection.cursor() as cursor:
            cursor.execute("SELECT telefono FROM auth_user WHERE id = %s", [obj.id])
            row = cursor.fetchone()
            return row[0] if row else None


class RolSerializer(serializers.Serializer):
    id_rol = serializers.IntegerField()
    nombre_rol = serializers.CharField()


class UsuarioListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    is_active = serializers.BooleanField()
    rol_nombre = serializers.CharField()
    id_rol = serializers.IntegerField(allow_null=True)
    last_login = serializers.DateTimeField(allow_null=True, required=False)


class CrearUsuarioSerializer(serializers.Serializer):
    cedula = serializers.CharField(max_length=20)
    nombres = serializers.CharField(max_length=150)
    apellidos = serializers.CharField(max_length=150)
    id_rol = serializers.IntegerField()
    password = serializers.CharField(min_length=6, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        if User.objects.filter(username=data['cedula']).exists():
            raise serializers.ValidationError({'cedula': 'Esta cédula ya está registrada en el sistema.'})
        return data


class EditarUsuarioSerializer(serializers.Serializer):
    nombres = serializers.CharField(max_length=150)
    apellidos = serializers.CharField(max_length=150)
    id_rol = serializers.IntegerField()
    password = serializers.CharField(min_length=6, required=False, allow_blank=True, write_only=True)


class PasswordResetVerifySerializer(serializers.Serializer):
    cedula = serializers.CharField()
    email = serializers.EmailField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField()

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Las contraseñas no coinciden."})
        return data


class UserProfileDetailSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    titular = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'last_login', 'rol', 'titular', 'phone']

    def get_rol(self, obj):
        return get_user_role(obj)
    
    def get_titular(self, obj):
        from administrador.models import Titular
        try:
            # Asumimos que username es la cédula
            titular = Titular.objects.filter(cedula=obj.username).first()
            if titular:
                return {
                    'cedula': titular.cedula,
                    'nombres': titular.nombres,
                    'apellidos': titular.apellidos,
                    'correo': titular.correo,
                    'telefono': titular.telefono_principal,
                    'cargo': titular.cargo,
                    'dependencia': titular.dependencia,
                    'sexo': titular.sexo,
                    'estado_laboral': titular.estado_laboral
                }
        except Exception:
            pass
        return None

    def get_phone(self, obj):
        # 1. Intentar desde Titular
        from administrador.models import Titular
        titular = Titular.objects.filter(cedula=obj.username).first()
        if titular and titular.telefono_principal:
            return titular.telefono_principal
        
        # 2. Fallback al Raw SQL (auth_user)
        with connection.cursor() as cursor:
            cursor.execute("SELECT telefono FROM auth_user WHERE id = %s", [obj.id])
            row = cursor.fetchone()
            return row[0] if row else None
            
        return None
