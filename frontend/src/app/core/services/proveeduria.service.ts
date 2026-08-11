import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProveeduriaService {
  private apiUrl = `${environment.apiUrl}/proveeduria`;

  constructor(private http: HttpClient) {}

  getInventario(schema: string = 'proveeduria'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inventario/?schema=${schema}`);
  }

  getSolicitudes(params?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes/`, { params });
  }

  getDetalleSolicitud(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes/${id}/`);
  }

  crearSolicitud(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/`, data);
  }

  procesarSolicitud(id: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${id}/procesar/`, data);
  }

  getPDFData(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/solicitudes/${id}/pdf/`, { responseType: 'blob' });
  }

  actualizarLote(id_lote: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/inventario/${id_lote}/`, data);
  }

  egresarLote(id_lote: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/inventario/${id_lote}/`);
  }

  getDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departamentos/`);
  }

  crearDepartamento(nombre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/departamentos/`, { nombre });
  }

  eliminarDepartamento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/departamentos/${id}/`);
  }
}
