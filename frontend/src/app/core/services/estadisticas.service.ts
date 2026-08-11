import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadisticasResumen, EstadoChart, EvolucionTemporal } from '../models/farmacia.models';

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private buildParams(desde?: string, hasta?: string, modo?: string, departamento?: string): HttpParams {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (modo) params = params.set('modo', modo);
    if (departamento) params = params.set('departamento', departamento);
    return params;
  }

  getResumen(desde?: string, hasta?: string, modo?: string, departamento?: string): Observable<EstadisticasResumen> {
    return this.http.get<EstadisticasResumen>(`${this.API}/estadisticas/resumen/`, { params: this.buildParams(desde, hasta, modo, departamento) });
  }

  getEstadoInventarioChart(modo?: string, desde?: string, hasta?: string, departamento?: string): Observable<EstadoChart[]> {
    return this.http.get<EstadoChart[]>(`${this.API}/estadisticas/inventario-chart/`, { params: this.buildParams(desde, hasta, modo, departamento) });
  }

  getInventarioPorCategoria(desde?: string, hasta?: string, departamento?: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/estadisticas/inventario-categorias/`, { params: this.buildParams(desde, hasta, undefined, departamento) });
  }

  getTopMedicamentos(desde?: string, hasta?: string, limit = 10, departamento?: string): Observable<any[]> {
    let params = this.buildParams(desde, hasta, undefined, departamento).set('limit', limit);
    return this.http.get<any[]>(`${this.API}/estadisticas/top-medicamentos/`, { params });
  }

  getEvolucionTemporal(desde?: string, hasta?: string, modo?: string, departamento?: string): Observable<EvolucionTemporal[]> {
    return this.http.get<EvolucionTemporal[]>(`${this.API}/estadisticas/evolucion/`, { params: this.buildParams(desde, hasta, modo, departamento) });
  }

  getIngresosDetalle(desde?: string, hasta?: string, ordering?: string, departamento?: string): Observable<any[]> {
    let params = this.buildParams(desde, hasta, undefined, departamento);
    if (ordering) params = params.set('ordering', ordering);
    return this.http.get<any[]>(`${this.API}/estadisticas/ingresos/`, { params });
  }

  /** Descarga usando HttpClient para que el interceptor JWT adjunte el token */
  exportar(formato: 'csv' | 'excel' | 'pdf', tipo: string, desde?: string, hasta?: string, departamento?: string): Observable<Blob> {
    let params = this.buildParams(desde, hasta, undefined, departamento)
      .set('formato', formato)
      .set('tipo', tipo);
      
    return this.http.get(`${this.API}/estadisticas/exportar/`, {
      params,
      responseType: 'blob'
    });
  }
}


