"""Serializers de estadísticas."""
from rest_framework import serializers


class EstadisticaResumenSerializer(serializers.Serializer):
    periodo = serializers.CharField()
    total_dotaciones = serializers.IntegerField()
    unidades_dotadas = serializers.IntegerField()
    total_despachos = serializers.IntegerField()
    unidades_despachadas = serializers.IntegerField()


class DespachosPorMedicamentoSerializer(serializers.Serializer):
    nombre_generico = serializers.CharField()
    total_despachado = serializers.IntegerField()
    porcentaje = serializers.FloatField()


class EstadoInventarioChartSerializer(serializers.Serializer):
    estado = serializers.CharField()
    color_clase = serializers.CharField()
    cantidad = serializers.IntegerField()
    porcentaje = serializers.FloatField()


class DotacionPorFechaSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    cantidad_lotes = serializers.IntegerField()
    unidades_ingresadas = serializers.IntegerField()


class DespachoPorFechaSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    cantidad_despachos = serializers.IntegerField()
    unidades_despachadas = serializers.IntegerField()
