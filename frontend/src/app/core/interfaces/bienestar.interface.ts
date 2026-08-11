export interface CargaFamiliar {
  cedula_titular?: number;
  posee_cedula: boolean;
  cedula_beneficiario?: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string;
  edo_civil?: string;
  telefono_celular?: string;
  parentesco: string;
  status: string;
  certificado_medico: boolean;
  estado_registro_lugar?: string;
}

export interface Titular {
  cedula: number;
  nacionalidad: string;
  nombres_titular: string;
  apellidos_titular: string;
  sexo: string;
  estado_civil: string;
  fecha_nacimiento: string;
  correo_electronico: string;
  telefono_principal: string;
  segundo_telefono?: string;
  direccion: string;
  fecha_ingreso: string;
  dependencia: string;
  tipo_empleado: string;
  estado: string;
  cargo: string;
  status: string;
  fecha_egreso?: string;
  cuenta_nomina?: string;
  tipo_nomina?: string;
  cargas_familiares?: CargaFamiliar[];
}
