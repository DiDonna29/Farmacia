import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusquedaMedicamento, DespachoHistorial, BeneficiarioWS } from '../models/farmacia.models';

@Injectable({ providedIn: 'root' })
export class DespachoService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  buscarMedicamento(q: string): Observable<BusquedaMedicamento[]> {
    let params = new HttpParams().set('q', q);
    return this.http.get<BusquedaMedicamento[]>(`${this.API}/despacho/buscar/`, { params });
  }

  procesarDespacho(data: {
    articulos: { id_lote: number; cantidad: number }[];
    cedula_beneficiario: string | number;
    nombre_beneficiario?: string;
    correo_beneficiario?: string;
    telefono_beneficiario?: string;
    parentesco_beneficiario?: string;
    sexo_beneficiario?: string;
    es_carga?: boolean;
    observaciones?: string;
    medico_tratante?: string;
    especialidad?: string;
    titular_cedula?: string | number;
    titular_nombre?: string;
  }): Observable<{ orden_id: string; message: string }> {
    return this.http.post<{ orden_id: string; message: string }>(`${this.API}/despacho/procesar/`, data);
  }

  getHistorial(filters?: { 
    desde?: string; 
    hasta?: string; 
    busqueda?: string;
    folio?: string;
    cedula?: string;
    farmaceutico?: string;
    page?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.folio) params = params.set('folio', filters.folio);
    if (filters?.cedula) params = params.set('cedula', filters.cedula);
    if (filters?.farmaceutico) params = params.set('farmaceutico', filters.farmaceutico);
    if (filters?.page) params = params.set('page', filters.page.toString());

    return this.http.get<any>(`${this.API}/despacho/historial/`, { params });
  }

  buscarBeneficiario(cedula: string): Observable<any> {
    return this.http.get<any>(`${this.API}/bienestar/${cedula}/`);
  }

  getComprobanteUrl(folio: string): string {
    return `${this.API}/despacho/comprobante/${folio}/`;
  }

  generarPDF(folio: string): Observable<Blob> {
    return this.http.get(`${this.API}/despacho/comprobante/${folio}/`, {
      responseType: 'blob'
    });
  }
}
