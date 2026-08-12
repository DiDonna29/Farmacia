"""Serializers de despacho de medicamentos."""
from rest_framework import serializers


class ItemDespachoSerializer(serializers.Serializer):
    id_lote = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)


class ProcesarDespachoSerializer(serializers.Serializer):
    articulos = ItemDespachoSerializer(many=True)
    cedula_beneficiario = serializers.IntegerField()
    nombre_beneficiario = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    correo_beneficiario = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    telefono_beneficiario = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parentesco_beneficiario = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sexo_beneficiario = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    es_carga = serializers.BooleanField(default=False)
    observaciones = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medico_tratante = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    especialidad = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    titular_cedula = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    titular_nombre = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class HistorialDespachoSerializer(serializers.Serializer):
    orden_id = serializers.UUIDField(read_only=True)
    folio_grupo = serializers.UUIDField(read_only=True, allow_null=True)
    fecha_hora = serializers.DateTimeField()
    nombre_generico = serializers.CharField()
    nombre_presentacion = serializers.CharField()
    numero_lote = serializers.CharField()
    cantidad_despachada = serializers.IntegerField()
    cedula_beneficiario = serializers.IntegerField()
    nombre_beneficiario = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    correo_beneficiario = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    telefono_beneficiario = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    parentesco_beneficiario = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    sexo_beneficiario = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    es_carga = serializers.BooleanField()
    observaciones = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    farmaceuta_nombre = serializers.CharField()
    farmaceuta_ci = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # Nuevos campos para el titular
    titular_cedula = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    titular_nombre = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    medico_tratante = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    especialidad = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    componentes_json = serializers.JSONField(required=False, allow_null=True)
