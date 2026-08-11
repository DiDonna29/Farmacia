import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type TipoSolicitud = 'solicitud-tipo1' | 'solicitud-tipo2' | 'solicitud-tipo3';
export type EstadoSolicitud = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'FINALIZADO' | 'DEVUELTO';

export interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  fechaCreacion: string;
  datosPaciente: any; // Datos del titular/beneficiario
  datosFormulario: any; // Datos específicos (opciones, entidad, montos, etc)
  observaciones?: string; // Para cuando el administrador rechaza
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private baseDeDatos: Solicitud[] = [];
  private solicitudesSubject = new BehaviorSubject<Solicitud[]>([]);

  public solicitudes$ = this.solicitudesSubject.asObservable();

  constructor() {
    this.cargarDeStorage();
  }

  // Analista Front crea una nueva solicitud
  crearSolicitud(tipo: TipoSolicitud, datosPaciente: any, datosFormulario: any): Solicitud {
    const nueva: Solicitud = {
      id: this.generarIdProtocolo(),
      tipo,
      estado: 'EN_REVISION',
      fechaCreacion: new Date().toISOString(),
      datosPaciente,
      datosFormulario
    };

    this.baseDeDatos.unshift(nueva);
    this.guardarYNotificar();
    return nueva;
  }

  // Obtiene solicitudes filtrando por estado o tipo
  obtenerSolicitudes(estado?: EstadoSolicitud, tipo?: TipoSolicitud): Solicitud[] {
    return this.baseDeDatos.filter(s => {
      let coincide = true;
      if (estado && s.estado !== estado) coincide = false;
      if (tipo && s.tipo !== tipo) coincide = false;
      return coincide;
    });
  }

  // Administrador actualiza estado de la solicitud
  actualizarEstado(id: string, nuevoEstado: EstadoSolicitud, observaciones?: string): void {
    const indice = this.baseDeDatos.findIndex(s => s.id === id);
    if (indice !== -1) {
      this.baseDeDatos[indice].estado = nuevoEstado;
      if (observaciones) {
        this.baseDeDatos[indice].observaciones = observaciones;
      }
      this.guardarYNotificar();
    }
  }

  // Limpiar historial de gestiones
  limpiarHistorial(): void {
    this.baseDeDatos = [];
    this.guardarYNotificar();
  }

  // Analista corrige una solicitud devuelta
  actualizarDatosSolicitud(id: string, datosPaciente: any, datosFormulario: any): Solicitud | null {
    const indice = this.baseDeDatos.findIndex(s => s.id === id);
    if (indice !== -1) {
      this.baseDeDatos[indice].datosPaciente = datosPaciente;
      this.baseDeDatos[indice].datosFormulario = datosFormulario;
      this.baseDeDatos[indice].estado = 'EN_REVISION'; // Volver a revisión
      this.guardarYNotificar();
      return this.baseDeDatos[indice];
    }
    return null;
  }

  // Helpers persistencia y generación mock
  private cargarDeStorage(): void {
    const guardado = localStorage.getItem('mock_solicitudes');
    if (guardado) {
      this.baseDeDatos = JSON.parse(guardado);
      this.solicitudesSubject.next([...this.baseDeDatos]);
    }
  }

  private guardarYNotificar(): void {
    localStorage.setItem('mock_solicitudes', JSON.stringify(this.baseDeDatos));
    this.solicitudesSubject.next([...this.baseDeDatos]);
  }

  private generarIdProtocolo(): string {
    const prefijo = 'PRT-';
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${prefijo}${num}`;
  }
}
