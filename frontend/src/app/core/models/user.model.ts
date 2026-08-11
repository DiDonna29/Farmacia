export type UserRole = 'ADMINISTRADOR' | 'ENCARGADO' | 'FARMACEUTICO' | 'AUDITOR' | 'PROVEEDURIA' | 'DIRECTOR_SERVICIO_MEDICO';

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  rol: UserRole;
  is_active: boolean;
}

export interface AuthResponse {
  access: string;
  refresh?: string;
  user: User;
  code?: string;
  detail?: string;
}
