from django.urls import path
from . import views

urlpatterns = [
    path('usuarios/', views.gestion_usuarios, name='gestion_usuarios'),
    path('usuarios/guardar/', views.guardar_usuario, name='guardar_usuario'),
    path('usuarios/estado/<int:user_id>/', views.estado_usuario, name='estado_usuario'),
    path('usuarios/editar/', views.editar_usuario, name='editar_usuario'),
    path('verificar-cedula/<str:cedula>/', views.verificar_cedula, name='verificar_cedula'),
]