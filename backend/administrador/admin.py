from django.contrib import admin
from .models import Titular, CargaFamiliar

@admin.register(Titular)
class TitularAdmin(admin.ModelAdmin):
    list_display = ('cedula', 'nombres', 'apellidos', 'dependencia', 'estado_laboral')
    search_fields = ('cedula', 'nombres', 'apellidos')

@admin.register(CargaFamiliar)
class CargaFamiliarAdmin(admin.ModelAdmin):
    list_display = ('nombres', 'apellidos', 'titular', 'parentesco')
    search_fields = ('nombres', 'apellidos', 'titular__cedula')
