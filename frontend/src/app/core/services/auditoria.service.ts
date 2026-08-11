import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly API = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient) {}

  getMedicamentosInactivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/bajas/medicamentos/`);
  }

  getLotesInactivos(schema: string = 'farmacia'): Observable<any[]> {
    const params = new HttpParams().set('schema', schema);
    return this.http.get<any[]>(`${this.API}/bajas/lotes/`, { params });
  }

  reactivar(tipo: 'medicamento' | 'lote', id: number, schema: string = 'farmacia'): Observable<any> {
    return this.http.post(`${this.API}/reactivar/`, { tipo, id, schema });
  }

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/logs/`);
  }
}
