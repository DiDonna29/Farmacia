import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SolicitudesService, Solicitud } from '../../../../core/services/solicitudes.service';
import { BsFormatPipe } from '../../../../shared/pipes/formatos/bs-format.pipe';

@Component({
  selector: 'app-bandeja-tipo2',
  standalone: true,
  imports: [CommonModule, BsFormatPipe],
  template: `
    <div class="card shadow-none border border-300">
      <div class="card-header border-bottom d-flex justify-content-between align-items-center bg-light">
        <h5 class="mb-0 text-uppercase fw-bolder text-800">
          <i class="fas fa-file-invoice-dollar text-primary me-2"></i>Bandeja Solicitud Tipo 2
        </h5>
        <span class="badge badge-phoenix badge-phoenix-primary rounded-pill">
          {{ solicitudes.length }} Aprobadas
        </span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm fs--1 mb-0 align-middle">
            <thead class="bg-200 text-900">
              <tr>
                <th class="ps-3 border-0">NRO. SOLICITUD</th>
                <th class="border-0">FECHA</th>
                <th class="border-0">SOLICITANTE</th>
                <th class="border-0">ENTIDAD/LUGAR</th>
                <th class="border-0">MONTO</th>
                <th class="text-end pe-3 border-0">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="solicitudes.length === 0">
                <td colspan="6" class="text-center py-4 text-500 fw-bold">
                  No hay solicitudes Tipo 2 pendientes por procesamiento
                </td>
              </tr>
              <tr *ngFor="let sol of solicitudes">
                <td class="ps-3 fw-bold text-primary">{{ sol.id }}</td>
                <td>{{ sol.fechaCreacion | date:'dd/MM/yyyy' }}</td>
                <td>{{ sol.datosPaciente.nombre | titlecase }}</td>
                <td>{{ sol.datosFormulario.clinica | uppercase }}</td>
                <td>Bs. {{ sol.datosFormulario.monto | bsFormat }}</td>
                <td class="text-end pe-3">
                  <button class="btn btn-sm btn-success fw-bold" (click)="procesar(sol)">
                    Completar Proceso
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class BandejaTipo2Component implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  solicitudes: Solicitud[] = [];

  ngOnInit(): void {
    this.solicitudesService.solicitudes$.subscribe(todas => {
      this.solicitudes = todas.filter(s => s.estado === 'APROBADO' && s.tipo === 'solicitud-tipo2');
    });
  }

  procesar(sol: Solicitud): void {
    Swal.fire({
      title: 'Procesar Solicitud',
      text: `¿Desea finalizar el procesamiento para la Solicitud ${sol.id}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar'
    }).then(result => {
      if (result.isConfirmed) {
        this.solicitudesService.actualizarEstado(sol.id, 'FINALIZADO');
        Swal.fire('Procesado', 'La solicitud se finalizó exitosamente.', 'success');
      }
    });
  }
}
