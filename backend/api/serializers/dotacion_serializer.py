"""Serializers de dotación (registro de lotes)."""
from rest_framework import serializers
from datetime import date


class RegistrarLoteSerializer(serializers.Serializer):
    id_med_base = serializers.IntegerField()
    numero_lote = serializers.CharField(max_length=50)
    cantidad = serializers.IntegerField(min_value=1)
    fecha_vencimiento = serializers.DateField()

    def validate_fecha_vencimiento(self, value):
        if value <= date.today():
            raise serializers.ValidationError('La fecha de vencimiento debe ser posterior a hoy.')
        return value


class LoteDetalleSerializer(serializers.Serializer):
    id_lote = serializers.IntegerField(read_only=True)
    numero_lote = serializers.CharField()
    nombre_generico = serializers.CharField()
    nombre_presentacion = serializers.CharField()
    nombre_laboratorio = serializers.CharField(required=False, allow_null=True)
    cantidad_inicial = serializers.IntegerField()
    cantidad_actual = serializers.IntegerField()
    fecha_vencimiento = serializers.DateField()
    fecha_ingreso = serializers.DateTimeField()
    usuario_registro_nombre = serializers.CharField(required=False, allow_null=True)
    estado_logico = serializers.CharField(required=False)
    color_clase = serializers.CharField(required=False)
    componentes_json = serializers.JSONField(required=False, read_only=True)
