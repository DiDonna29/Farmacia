"""URLs de la API v1 — Farmacia DEM."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from api.views.auth_views import (
    LoginView, LogoutView, MiPerfilView, ProfileView,
    PasswordResetVerifyView, PasswordResetConfirmView, ChangePasswordView
)
from api.views.inventario_views import SemaforoInventarioView, DashboardStatsView, PresentacionesFilterView, EgresarLoteView, EditarLoteView
from api.views.medicamentos_views import (
    MedicamentosBaseView, MedicamentoDetailView,
    PresentacionesView, CategoriasView,
    ClasificacionesView, UnidadesMedidaView, TallasCalibresView,
    VerificarDuplicadoMedicamentoView
)
from api.views.principios_activos_views import PrincipiosActivosView
from api.views.dotacion_views import RegistrarLoteView, HistorialLotesView, MedicamentosParaLoteView, VerificarDotacionRecienteView, CargarLoteMasivoView
from api.views.despacho_views import (
    BuscarMedicamentoDespachoView, ProcesarDespachoView, 
    HistorialDespachosView, GenerarComprobantePDFView
)
from api.views.usuarios_views import (
    GestionUsuariosView, UsuarioDetailView, ToggleEstadoUsuarioView,
    RolesDisponiblesView, VerificarCedulaView, SigefirrhHProxyView
)
from api.views.bienestar_views import BienestarBeneficiarioView
from api.views.stats_views import (
    EstadisticasResumenView, EstadoInventarioChartView,
    DespachosPorMedicamentoView, EvolucionTemporalView, ExportarEstadisticasView,
    ReporteIngresosDetalleView, InventarioPorCategoriaView
)
from api.views.auditoria_views import AuditoriaBajasMedicamentosView, AuditoriaBajasLotesView, AuditoriaReactivarView, AuditoriaLogsView, ExportarAuditoriaView
from api.views.proveeduria_views import InventarioProveeduriaView, InventarioProveeduriaDetailView, SolicitudesDotacionView, DetalleSolicitudView, ProcesarSolicitudView, SolicitudPDFView, DepartamentosOrigenView

urlpatterns = [
    # ─── Autenticación ─────────────────────────────────────────────────────
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/me/', MiPerfilView.as_view(), name='api-mi-perfil'),
    path('auth/profile/', ProfileView.as_view(), name='api-perfil-detalle'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='api-change-password'),
    path('auth/reset-verify/', PasswordResetVerifyView.as_view(), name='api-reset-verify'),
    path('auth/reset-confirm/', PasswordResetConfirmView.as_view(), name='api-reset-confirm'),

    # ─── Dashboard ─────────────────────────────────────────────────────────
    path('dashboard/stats/', DashboardStatsView.as_view(), name='api-dashboard-stats'),

    # ─── Inventario (Semáforo) ─────────────────────────────────────────────
    path('inventario/', SemaforoInventarioView.as_view(), name='api-inventario'),
    path('inventario/presentaciones/', PresentacionesFilterView.as_view(), name='api-inventario-presentaciones'),
    path('inventario/<int:pk>/egresar/', EgresarLoteView.as_view(), name='api-egresar-lote'),
    path('inventario/<int:pk>/editar/', EditarLoteView.as_view(), name='api-editar-lote'),

    # ─── Medicamentos Base (Catálogo) ───────────────────────────────────────
    path('medicamentos/', MedicamentosBaseView.as_view(), name='api-medicamentos'),
    path('medicamentos/<int:pk>/', MedicamentoDetailView.as_view(), name='api-medicamento-detail'),
    path('medicamentos/verificar-duplicado/', VerificarDuplicadoMedicamentoView.as_view(), name='api-verificar-duplicado'),

    # ─── Catálogos auxiliares ────────────────────────────────────────────────
    path('catalogos/presentaciones/', PresentacionesView.as_view(), name='api-presentaciones'),
    path('catalogos/presentaciones/<int:pk>/', PresentacionesView.as_view(), name='api-presentaciones-detail'),
    path('catalogos/categorias/', CategoriasView.as_view(), name='api-categorias'),
    path('catalogos/categorias/<int:pk>/', CategoriasView.as_view(), name='api-categorias-detail'),
    path('catalogos/clasificaciones/', ClasificacionesView.as_view(), name='api-clasificaciones'),
    path('catalogos/unidades/', UnidadesMedidaView.as_view(), name='api-unidades'),
    path('catalogos/unidades/<int:pk>/', UnidadesMedidaView.as_view(), name='api-unidades-detail'),
    path('catalogos/tallas/', TallasCalibresView.as_view(), name='api-tallas'),
    path('catalogos/principios-activos/', PrincipiosActivosView.as_view(), name='api-principios-activos'),
    path('catalogos/principios-activos/<int:pk>/', PrincipiosActivosView.as_view(), name='api-principios-activos-detail'),

    # ─── Dotación (Lotes) ────────────────────────────────────────────────────
    path('dotacion/lotes/registrar/', RegistrarLoteView.as_view(), name='api-registrar-lote'),
    path('dotacion/lotes/', HistorialLotesView.as_view(), name='api-historial-lotes'),
    path('dotacion/medicamentos/', MedicamentosParaLoteView.as_view(), name='api-medicamentos-para-lote'),
    path('dotacion/verificar-reciente/<int:id_med_base>/', VerificarDotacionRecienteView.as_view(), name='api-verificar-dotacion-reciente'),
    path('dotacion/lotes/cargar-masivo/', CargarLoteMasivoView.as_view(), name='api-cargar-lote-masivo'),

    # ─── Despacho ────────────────────────────────────────────────────────────
    path('despacho/buscar/', BuscarMedicamentoDespachoView.as_view(), name='api-buscar-medicamento'),
    path('despacho/procesar/', ProcesarDespachoView.as_view(), name='api-procesar-despacho'),
    path('despacho/historial/', HistorialDespachosView.as_view(), name='api-historial-despachos'),
    path('despacho/comprobante/<str:folio_grupo>/', GenerarComprobantePDFView.as_view(), name='api-comprobante-pdf'),

    # ─── Beneficiarios (WS Bienestar) ────────────────────────────────────────
    path('bienestar/<str:cedula>/', BienestarBeneficiarioView.as_view(), name='api-bienestar'),

    # ─── Usuarios ────────────────────────────────────────────────────────────
    path('usuarios/', GestionUsuariosView.as_view(), name='api-usuarios'),
    path('usuarios/<int:pk>/', UsuarioDetailView.as_view(), name='api-usuario-detail'),
    path('usuarios/<int:pk>/toggle-status/', ToggleEstadoUsuarioView.as_view(), name='api-usuario-toggle'),
    path('usuarios/roles/', RolesDisponiblesView.as_view(), name='api-roles'),
    path('usuarios/verificar/<str:cedula>/', VerificarCedulaView.as_view(), name='api-verificar-cedula'),
    path('sigefirrhh/<str:cedula>/', SigefirrhHProxyView.as_view(), name='api-sigefirrhh'),

    # ─── Estadísticas ────────────────────────────────────────────────────────
    path('estadisticas/resumen/', EstadisticasResumenView.as_view(), name='api-stats-resumen'),
    path('estadisticas/inventario-chart/', EstadoInventarioChartView.as_view(), name='api-stats-inventario'),
    path('estadisticas/top-medicamentos/', DespachosPorMedicamentoView.as_view(), name='api-stats-top-meds'),
    path('estadisticas/evolucion/', EvolucionTemporalView.as_view(), name='api-stats-evolucion'),
    path('estadisticas/exportar/', ExportarEstadisticasView.as_view(), name='api-stats-export'),
    path('estadisticas/ingresos/', ReporteIngresosDetalleView.as_view(), name='api-stats-ingresos'),
    path('estadisticas/inventario-categorias/', InventarioPorCategoriaView.as_view(), name='api-stats-inventario-categorias'),

    # ─── Auditoría (Papelera/Soft-Delete) ────────────────────────────────────
    path('auditoria/bajas/medicamentos/', AuditoriaBajasMedicamentosView.as_view(), name='api-auditoria-meds'),
    path('auditoria/bajas/lotes/', AuditoriaBajasLotesView.as_view(), name='api-auditoria-lotes'),
    path('auditoria/reactivar/', AuditoriaReactivarView.as_view(), name='api-auditoria-reactivar'),
    path('auditoria/logs/', AuditoriaLogsView.as_view(), name='api-auditoria-logs'),
    path('auditoria/exportar/', ExportarAuditoriaView.as_view(), name='api-auditoria-exportar'),

    # ─── Proveduría ──────────────────────────────────────────────────────────
    path('proveeduria/inventario/', InventarioProveeduriaView.as_view(), name='api-proveeduria-inventario'),
    path('proveeduria/inventario/<int:id_lote>/', InventarioProveeduriaDetailView.as_view(), name='api-proveeduria-inventario-detail'),
    path('proveeduria/solicitudes/', SolicitudesDotacionView.as_view(), name='api-proveeduria-solicitudes'),
    path('proveeduria/solicitudes/<int:id_solicitud>/', DetalleSolicitudView.as_view(), name='api-proveeduria-detalle'),
    path('proveeduria/solicitudes/<int:id_solicitud>/procesar/', ProcesarSolicitudView.as_view(), name='api-proveeduria-procesar'),
    path('proveeduria/solicitudes/<int:id_solicitud>/pdf/', SolicitudPDFView.as_view(), name='api-proveeduria-pdf'),
    path('proveeduria/departamentos/', DepartamentosOrigenView.as_view(), name='api-proveeduria-departamentos'),
    path('proveeduria/departamentos/<int:pk>/', DepartamentosOrigenView.as_view(), name='api-proveeduria-departamentos-detail'),
]
