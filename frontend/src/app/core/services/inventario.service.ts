import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoteInventario, DashboardStats, PaginatedResponse } from '../models/farmacia.models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getInventario(filters: {
    page?: number;
    page_size?: number;
    estado?: string;
    presentacion?: string;
    busqueda?: string;
    ordering?: string;
    schema?: string;
  }): Observable<PaginatedResponse<LoteInventario>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.page_size) params = params.set('page_size', filters.page_size.toString());
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.presentacion) params = params.set('presentacion', filters.presentacion);
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.ordering) params = params.set('ordering', filters.ordering);
    if (filters.schema) params = params.set('schema', filters.schema);

    return this.http.get<PaginatedResponse<LoteInventario>>(`${this.API}/inventario/`, { params });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.API}/dashboard/stats/`);
  }

  despacharLote(id_lote: number, cantidad: number): Observable<any> {
    return this.http.post(`${this.API}/inventario/${id_lote}/despachar/`, { cantidad });
  }

  egresarLote(id_lote: number, schema: string = 'farmacia'): Observable<any> {
    return this.http.post(`${this.API}/inventario/${id_lote}/egresar/?schema=${schema}`, {});
  }

  getPresentacionesFiltro(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(`${this.API}/catalogos/presentaciones/`);
  }

  editarLote(id_lote: number, data: { cantidad: number; fecha_vencimiento: string; numero_lote?: string }, schema: string = 'farmacia'): Observable<any> {
    return this.http.post(`${this.API}/inventario/${id_lote}/editar/?schema=${schema}`, data);
  }

  getSiguienteLote(schema: string = 'farmacia'): Observable<{ siguiente_lote: string }> {
    return this.http.get<{ siguiente_lote: string }>(`${this.API}/dotacion/lotes/siguiente-numero/?schema=${schema}`);
  }
}
