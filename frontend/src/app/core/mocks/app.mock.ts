import { UsuarioApp, RolDisponible, LoteDetalle } from '../models/farmacia.models';

export const ROLES_MOCK: RolDisponible[] = [
  { id_rol: 1, nombre_rol: 'ADMINISTRADOR' },
  { id_rol: 2, nombre_rol: 'ENCARGADO' },
  { id_rol: 3, nombre_rol: 'FARMACEUTICO' },
];

export const USUARIOS_MOCK: UsuarioApp[] = [
  { id: 1, username: '20123456', first_name: 'PEDRO', last_name: 'PÉREZ', email: 'pperez@dem.gob.ve', id_rol: 1, rol_nombre: 'ADMINISTRADOR', is_active: true },
  { id: 2, username: '22987654', first_name: 'MARÍA', last_name: 'DELGADO', email: 'mdelgado@dem.gob.ve', id_rol: 2, rol_nombre: 'ENCARGADO', is_active: true },
  { id: 3, username: '24111222', first_name: 'JUAN', last_name: 'LOZADA', email: 'jlozada@dem.gob.ve', id_rol: 3, rol_nombre: 'FARMACEUTICO', is_active: true },
  { id: 4, username: '25000999', first_name: 'ANA', last_name: 'RODRÍGUEZ', email: 'arodriguez@dem.gob.ve', id_rol: 3, rol_nombre: 'FARMACEUTICO', is_active: false },
];

export const DOTACIONES_MOCK: LoteDetalle[] = [
  { id_lote: 1, nombre_generico: 'Acetaminofén 500mg', nombre_presentacion: 'Tabletas', numero_lote: 'LOT-2024-001', cantidad_inicial: 1000, cantidad_actual: 500, fecha_vencimiento: '2026-10-15', fecha_ingreso: '2024-01-01', color_clase: 'success', estado_logico: 'ÓPTIMO' },
  { id_lote: 2, nombre_generico: 'Ibuprofeno 400mg', nombre_presentacion: 'Cápsulas', numero_lote: 'LOT-2024-002', cantidad_inicial: 800, cantidad_actual: 300, fecha_vencimiento: '2024-06-20', fecha_ingreso: '2024-01-05', color_clase: 'warning', estado_logico: 'PRÓXIMO A VENCER' },
  { id_lote: 3, nombre_generico: 'Amoxicilina 500mg', nombre_presentacion: 'Tabletas', numero_lote: 'LOT-2024-003', cantidad_inicial: 500, cantidad_actual: 150, fecha_vencimiento: '2025-12-05', fecha_ingreso: '2024-01-10', color_clase: 'success', estado_logico: 'ÓPTIMO' },
];
