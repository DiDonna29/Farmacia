import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UsuarioApp, RolDisponible } from '../models/farmacia.models';
import { USUARIOS_MOCK, ROLES_MOCK } from '../mocks/app.mock';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<UsuarioApp[]> {
    return this.http.get<UsuarioApp[]>(`${this.API}/usuarios/`);
  }

  crearUsuario(data: {
    cedula: string;
    nombres: string;
    apellidos: string;
    id_rol: number;
    password: string;
    password_confirm: string;
  }): Observable<any> {
    return this.http.post(`${this.API}/usuarios/`, data);
  }

  editarUsuario(id: number, data: {
    nombres: string;
    apellidos: string;
    id_rol: number;
    password?: string;
  }): Observable<any> {
    return this.http.patch(`${this.API}/usuarios/${id}/`, data);
  }

  toggleEstado(id: number): Observable<{ message: string; is_active: boolean }> {
    return this.http.patch<{ message: string; is_active: boolean }>(`${this.API}/usuarios/${id}/toggle-status/`, {});
  }

  getRolesDisponibles(): Observable<RolDisponible[]> {
    return this.http.get<RolDisponible[]>(`${this.API}/usuarios/roles/`);
  }

  verificarCedula(cedula: string): Observable<{ existe: boolean }> {
    return this.http.get<{ existe: boolean }>(`${this.API}/usuarios/verificar/${cedula}/`);
  }

  buscarEnBienestar(cedula: string): Observable<any> {
    return this.http.get(`${this.API}/bienestar/${cedula}/`);
  }
}
