"""Serializers de inventario y semáforo."""
from rest_framework import serializers


class SemaforoInventarioSerializer(serializers.Serializer):
    id_lote = serializers.IntegerField()
    medicamento_detallado = serializers.CharField()
    nombre_presentacion = serializers.CharField()
    numero_lote = serializers.CharField()
    cantidad_actual = serializers.IntegerField()
    fecha_vencimiento = serializers.DateField()
    estado_logico = serializers.CharField()
    color_clase = serializers.CharField()
    componentes_json = serializers.JSONField(required=False, read_only=True)


class DashboardStatsSerializer(serializers.Serializer):
    total_medicamentos = serializers.IntegerField()
    total_lotes = serializers.IntegerField()
    optimos = serializers.IntegerField()
    proximos_vencer = serializers.IntegerField()
    vencidos = serializers.IntegerField()
    agotados = serializers.IntegerField()
    despachos_hoy = serializers.IntegerField()
