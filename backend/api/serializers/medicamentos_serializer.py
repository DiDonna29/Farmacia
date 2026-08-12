"""Serializers de medicamentos base y catálogos relacionados."""
from rest_framework import serializers


class PresentacionSerializer(serializers.Serializer):
    id_presentacion = serializers.IntegerField(read_only=True)
    nombre_presentacion = serializers.CharField(max_length=100)



class CategoriaSerializer(serializers.Serializer):
    id_categoria = serializers.IntegerField(read_only=True)
    nombre_categoria = serializers.CharField(max_length=100)


class ClasificacionSerializer(serializers.Serializer):
    id_clasificacion = serializers.IntegerField(read_only=True)
    nombre_clasificacion = serializers.CharField(max_length=100)


class UnidadMedidaSerializer(serializers.Serializer):
    id_unidad = serializers.IntegerField(read_only=True)
    nombre_unidad = serializers.CharField(max_length=20)


class TallaCalibreSerializer(serializers.Serializer):
    id_talla = serializers.IntegerField(read_only=True)
    valor_talla = serializers.CharField(max_length=20)


class MedicamentoBaseSerializer(serializers.Serializer):
    id_med_base = serializers.IntegerField(read_only=True)
    nombre_generico = serializers.CharField(max_length=200)
    componentes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    componentes_json = serializers.JSONField(required=False, read_only=True)
    id_categoria = serializers.IntegerField(required=False, allow_null=True)
    nombre_categoria = serializers.CharField(read_only=True, required=False)
    id_presentacion = serializers.IntegerField(required=False, allow_null=True)
    nombre_presentacion = serializers.CharField(read_only=True, required=False)
    id_clasificacion = serializers.IntegerField(required=False, allow_null=True)
    nombre_clasificacion = serializers.CharField(read_only=True, required=False)
    dosis_cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    id_unidad = serializers.IntegerField(required=False, allow_null=True)
    nombre_unidad = serializers.CharField(read_only=True, required=False)
    id_talla = serializers.IntegerField(required=False, allow_null=True)
    valor_talla = serializers.CharField(read_only=True, required=False)
    concentracion_valor = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    existencia_total = serializers.IntegerField(read_only=True, required=False)
