import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SolicitudesService, Solicitud, EstadoSolicitud } from '../../../../core/services/solicitudes.service';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';

@Component({
  selector: 'app-bandeja-revision',
  standalone: true,
  imports: [CommonModule, CedulaFormatPipe, EdadPipe, GeneroPipe],
  templateUrl: './bandeja-revision.html',
  styleUrl: './bandeja-revision.css',
})
export class BandejaRevision implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  
  solicitudes: Solicitud[] = [];
  solicitudSeleccionada: Solicitud | null = null;
  observaciones: string = '';

  ngOnInit(): void {
    // Suscribirnos a los cambios en el servicio
    this.solicitudesService.solicitudes$.subscribe(todas => {
      this.solicitudes = todas.filter(s => s.estado === 'EN_REVISION');
    });
  }

  verDetalle(solicitud: Solicitud): void {
    this.solicitudSeleccionada = solicitud;
  }

  cerrarDetalle(): void {
    this.solicitudSeleccionada = null;
    this.observaciones = '';
  }

  cambiarEstado(nuevoEstado: EstadoSolicitud): void {
    if (!this.solicitudSeleccionada) return;

    if (nuevoEstado === 'APROBADO') {
      Swal.fire({
        title: '¿Confirmar Aprobación?',
        text: 'La solicitud pasará a la bandeja de los analistas de área.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Aprobar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarCambioEstado(nuevoEstado, 'Solicitud aprobada por el administrador.');
        }
      });
      return;
    }

    // Para DEVOLVER o RECHAZAR, solicitamos motivo
    const esDevolucion = nuevoEstado === 'DEVUELTO';
    Swal.fire({
      title: esDevolucion ? 'Motivo de Devolución' : 'Motivo de Rechazo',
      text: esDevolucion 
        ? 'Indique qué requisitos faltan o qué debe corregir el analista front.' 
        : 'Indique por qué se rechaza la solicitud definitivamente.',
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Escriba aquí...',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return '¡Debe escribir un motivo!';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarCambioEstado(nuevoEstado, result.value);
      }
    });
  }

  private ejecutarCambioEstado(estado: EstadoSolicitud, obs?: string): void {
    if (!this.solicitudSeleccionada) return;

    this.solicitudesService.actualizarEstado(this.solicitudSeleccionada.id, estado, obs);
    
    Swal.fire(
      'Actualizado',
      `La solicitud ${this.solicitudSeleccionada.id} ahora está en estado: ${estado}`,
      'success'
    );
    
    this.cerrarDetalle();
  }
}
