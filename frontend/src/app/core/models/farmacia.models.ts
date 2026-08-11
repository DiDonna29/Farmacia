export interface LoteInventario {
  id_lote: number;
  medicamento_detallado: string;
  nombre_presentacion: string;
  numero_lote: string;
  cantidad_actual: number;
  fecha_vencimiento: string;
  estado_logico: 'VENCIDO' | 'AGOTADO' | 'PRÓXIMO A VENCER' | 'ÓPTIMO';
  color_clase: 'danger' | 'secondary' | 'warning' | 'success';
  componentes_json?: ComponenteDetalle[];
}

export interface DashboardStats {
  total_medicamentos: number;
  total_lotes: number;
  optimos: number;
  proximos_vencer: number;
  vencidos: number;
  agotados: number;
  despachos_hoy: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_general_existencia?: number;
}

export interface ComponenteDetalle {
  id_principio?: number | string; // string for 'OTRO'
  nombre_principio?: string;
  principio_nuevo?: string; // used when id_principio is 'OTRO'
  concentracion_valor: number;
  id_unidad: number | string; // string for 'OTRO'
  nombre_unidad?: string;
  unidad_nueva?: string; // used when id_unidad is 'OTRO'
}

export interface PrincipioActivo {
  id: number;
  nombre: string;
}

export interface MedicamentoBase {
  id_med_base: number;
  nombre_generico: string;
  componentes?: string;
  componentes_json?: ComponenteDetalle[];
  componentes_list?: ComponenteDetalle[]; // Payload for POST/PUT
  id_categoria?: number;
  nombre_categoria?: string;
  id_presentacion?: number;
  nombre_presentacion?: string;
  id_laboratorio?: number;
  nombre_laboratorio?: string;
  id_clasificacion?: number;
  nombre_clasificacion?: string;
  dosis_cantidad?: number;
  id_unidad?: number;
  nombre_unidad?: string;
  id_talla?: number;
  valor_talla?: string;
  concentracion_valor?: number; // Legacy
  existencia_total?: number;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
}

export interface LoteDetalle {
  id_lote: number;
  numero_lote: string;
  nombre_generico: string;
  nombre_presentacion: string;
  nombre_laboratorio?: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  fecha_vencimiento: string;
  fecha_ingreso: string;
  usuario_registro_nombre?: string;
  estado_logico?: string;
  color_clase?: string;
  componentes_json?: ComponenteDetalle[];
}

export interface DespachoHistorial {
  orden_id: string;
  folio_grupo?: string;
  fecha_hora: string;
  nombre_generico: string;
  nombre_presentacion: string;
  numero_lote: string;
  cantidad_despachada: number;
  cedula_beneficiario: number;
  nombre_beneficiario?: string;
  es_carga: boolean;
  observaciones?: string;
  farmaceuta_nombre: string;
  farmaceuta_ci?: string;
  medico_tratante?: string;
  especialidad?: string;
  componentes_json?: ComponenteDetalle[];
}

export interface BusquedaMedicamento {
  id_lote: number;
  nombre_generico: string;
  numero_lote: string;
  existencia: number;
  fecha_vencimiento: string;
  presentacion: string;
  display: string;
  color_clase?: string;
  estado_logico?: string;
  medicamento_detallado?: string;
  componentes_json?: ComponenteDetalle[];
}

export interface ItemDespacho extends BusquedaMedicamento {
  cantidadSolicitada: number;
}

export interface UsuarioApp {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  rol_nombre: string;
  id_rol: number | null;
  last_login?: string | null;
}

export interface RolDisponible {
  id_rol: number;
  nombre_rol: string;
}

export interface EstadisticasResumen {
  periodo: string;
  modo: string;
  dotaciones_count: number;
  dotaciones_unidades: number;
  despachos_count: number;
  despachos_transacciones: number;
  despachos_unidades: number;
  inventario_count: number;
  inventario_unidades: number;
  
  // Compatibilidad con variantes de nombres
  total_dotaciones?: number;
  unidades_dotadas?: number;
  total_despachos?: number;
  unidades_despachadas?: number;
}

export interface EstadoChart {
  estado: string;
  color_clase: string;
  cantidad: number;
  porcentaje: number;
}

export interface EvolucionTemporal {
  fecha: string;
  dotaciones_cantidad: number;
  dotaciones_unidades: number;
  despachos_cantidad: number;
  despachos_unidades: number;
}

export interface BeneficiarioWS {
  cedula: string | number;
  nombres: string;
  apellidos: string;
  disponible?: boolean;
  mensaje?: string;
}
