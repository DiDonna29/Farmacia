import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudesService, Solicitud, EstadoSolicitud } from '../../../../core/services/solicitudes.service';
import { SolicitudStatusPipe } from '../../../../shared/pipes/solicitudes/solicitud-status.pipe';
import { SolicitudColorPipe } from '../../../../shared/pipes/solicitudes/solicitud-color.pipe';
import { TruncateTextPipe } from '../../../../shared/pipes/formatos/truncate-text.pipe';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';

@Component({
  selector: 'app-historial-revision',
  standalone: true,
  imports: [CommonModule, SolicitudStatusPipe, SolicitudColorPipe, TruncateTextPipe, CedulaFormatPipe, EdadPipe, GeneroPipe],
  templateUrl: './historial-revision.html',
})
export class HistorialRevision implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  solicitudes: Solicitud[] = [];

  ngOnInit(): void {
    this.solicitudesService.solicitudes$.subscribe(todas => {
      // Filtramos las que ya no están pendientes de revisión inicial
      this.solicitudes = todas.filter(s => s.estado !== 'EN_REVISION');
    });
  }

  getBadgeClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'APROBADO': return 'badge-phoenix-success';
      case 'RECHAZADO': return 'badge-phoenix-danger';
      case 'DEVUELTO': return 'badge-phoenix-warning';
      case 'FINALIZADO': return 'badge-phoenix-info';
      default: return 'badge-phoenix-secondary';
    }
  }

  solicitudSeleccionada: Solicitud | null = null;
  
  verDetalle(sol: Solicitud) {
    this.solicitudSeleccionada = sol;
  }
  
  getModalHeaderClass(estado: EstadoSolicitud): string {
    switch(estado) {
      case 'APROBADO': return 'bg-success';
      case 'RECHAZADO': return 'bg-danger';
      case 'DEVUELTO': return 'bg-warning';
      default: return 'bg-primary';
    }
  }

  getModalHeaderIcon(estado: EstadoSolicitud): string {
    switch(estado) {
      case 'APROBADO': return 'fa-check-circle';
      case 'RECHAZADO': return 'fa-times-circle';
      case 'DEVUELTO': return 'fa-exclamation-triangle';
      default: return 'fa-info-circle';
    }
  }
}
