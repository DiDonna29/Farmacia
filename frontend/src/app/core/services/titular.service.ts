import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Titular } from '../interfaces/bienestar.interface';

@Injectable({
  providedIn: 'root',
})
export class TitularService {
  private seleccionadoSubject = new BehaviorSubject<Titular | null>(null);
  titularSeleccionado$ = this.seleccionadoSubject.asObservable();

  constructor(private http: HttpClient) {}

  buscarPorCedula(cedula: number | string): Observable<Titular | undefined> {
    const API_URL = `${environment.apiUrl}/bienestar/${cedula}/`;
    
    return this.http.get<any>(API_URL).pipe(
      map(res => {
        if (!res || (!res.nombres && !res.nombres_titular)) return undefined;
        // Transformamos la respuesta del WS al modelo de la App si es necesario
        const titular: Titular = {
          cedula: Number(res.cedula),
          nacionalidad: res.nacionalidad || 'V',
          nombres_titular: res.nombres || res.nombres_titular,
          apellidos_titular: res.apellidos || res.apellidos_titular,
          sexo: res.sexo || '',
          estado_civil: res.estado_civil || '',
          fecha_nacimiento: res.fecha_nacimiento || '',
          correo_electronico: res.correo_electronico || '',
          telefono_principal: res.telefono_principal || '',
          direccion: res.direccion || '',
          fecha_ingreso: res.fecha_ingreso || '',
          dependencia: res.dependencia || '',
          tipo_empleado: res.tipo_empleado || '',
          estado: res.estado || '',
          cargo: res.cargo || '',
          status: res.status || '',
          cargas_familiares: res.cargas_familiares || []
        };
        this.seleccionadoSubject.next(titular);
        return titular;
      }),
      catchError(() => {
        this.seleccionadoSubject.next(null);
        return of(undefined);
      })
    );
  }

  getActual(): Titular | null {
    return this.seleccionadoSubject.value;
  }

  limpiarSeleccion(): void {
    this.seleccionadoSubject.next(null);
  }
}
