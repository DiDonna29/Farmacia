import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogoItem } from '../models/farmacia.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrincipiosActivosService {
  private apiUrl = `${environment.apiUrl}/catalogos/principios-activos/`;

  constructor(private http: HttpClient) {}

  getPrincipiosActivos(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(this.apiUrl);
  }

  createPrincipioActivo(nombre: string): Observable<CatalogoItem> {
    return this.http.post<CatalogoItem>(this.apiUrl, { nombre });
  }

  eliminarPrincipioActivo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }
}
