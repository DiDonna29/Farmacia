import { Injectable } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MedicamentoBase, CatalogoItem } from '../models/farmacia.models';
import { MEDICAMENTOS_MOCK } from '../mocks/medicamentos.mock';

@Injectable({ providedIn: 'root' })
export class MedicamentosService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMedicamentos(filters: { busqueda?: string; page?: number; page_size?: number } = {}): Observable<import('../models/farmacia.models').PaginatedResponse<MedicamentoBase>> {
    let params = new HttpParams();
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.page_size) params = params.set('page_size', filters.page_size.toString());
    
    return this.http.get<import('../models/farmacia.models').PaginatedResponse<MedicamentoBase>>(`${this.API}/medicamentos/`, { params });
  }

  getMedicamentosBase(): Observable<MedicamentoBase[]> {
    return this.http.get<MedicamentoBase[]>(`${this.API}/medicamentos/`, { params: { nopaginate: 'true' } });
  }

  getMedicamentosParaLote(q?: string): Observable<any[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<any[]>(`${this.API}/dotacion/medicamentos/`, { params });
  }

  crearMedicamento(data: Partial<MedicamentoBase>): Observable<any> {
    return this.http.post(`${this.API}/medicamentos/`, data);
  }

  verificarDuplicado(data: any): Observable<any> {
    return this.http.post<any>(`${this.API}/medicamentos/verificar-duplicado/`, data);
  }

  reactivarMedicamento(id: number): Observable<any> {
    return this.http.post(`${this.API}/auditoria/reactivar/`, { tipo: 'medicamento', id: id });
  }

  editarMedicamento(id: number, data: Partial<MedicamentoBase>): Observable<any> {
    return this.http.put(`${this.API}/medicamentos/${id}/`, data);
  }

  eliminarMedicamento(id: number): Observable<any> {
    return this.http.delete(`${this.API}/medicamentos/${id}/`);
  }

  // Catálogos auxiliares
  getPresentaciones(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.API}/catalogos/presentaciones/`);
  }
  eliminarPresentacion(id: number): Observable<any> {
    return this.http.delete(`${this.API}/catalogos/presentaciones/${id}/`);
  }

  getCategorias(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.API}/catalogos/categorias/`);
  }
  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.API}/catalogos/categorias/${id}/`);
  }

  getClasificaciones(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.API}/catalogos/clasificaciones/`);
  }

  getUnidades(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.API}/catalogos/unidades/`);
  }
  eliminarUnidad(id: number): Observable<any> {
    return this.http.delete(`${this.API}/catalogos/unidades/${id}/`);
  }

  getTallas(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.API}/catalogos/tallas/`);
  }
}
