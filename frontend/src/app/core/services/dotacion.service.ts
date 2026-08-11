import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoteDetalle } from '../models/farmacia.models';

@Injectable({ providedIn: 'root' })
export class DotacionService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  registrarLote(data: { id_med_base: number; numero_lote: string; cantidad: number; fecha_vencimiento: string }): Observable<any> {
    return this.http.post(`${this.API}/dotacion/lotes/registrar/`, data);
  }

  getHistorialLotes(filters?: { limit?: number; busqueda?: string; page?: number; page_size?: number; mes?: string; anio?: string }): Observable<any> {
    let params = new HttpParams();
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.page_size) params = params.set('page_size', filters.page_size.toString());
    if (filters?.mes) params = params.set('mes', filters.mes);
    if (filters?.anio) params = params.set('anio', filters.anio);
    return this.http.get<any>(`${this.API}/dotacion/lotes/`, { params });
  }
}
