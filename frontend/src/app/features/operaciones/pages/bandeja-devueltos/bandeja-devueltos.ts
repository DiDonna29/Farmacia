import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SolicitudesService, Solicitud } from '../../../../core/services/solicitudes.service';
import { Router } from '@angular/router';
import { TruncateTextPipe } from '../../../../shared/pipes/formatos/truncate-text.pipe';

@Component({
  selector: 'app-bandeja-devueltos',
  standalone: true,
  imports: [CommonModule, TruncateTextPipe],
  templateUrl: './bandeja-devueltos.html',
})
export class BandejaDevueltosComponent implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  private router = inject(Router);
  
  solicitudes: Solicitud[] = [];

  ngOnInit(): void {
    this.solicitudesService.solicitudes$.subscribe(todas => {
      this.solicitudes = todas.filter(s => s.estado === 'DEVUELTO');
    });
  }

  corregirSolicitud(sol: Solicitud): void {
    Swal.fire({
      title: 'Corregir Solicitud',
      text: `El administrador indicó: "${sol.observaciones}". ¿Desea cargar los datos para re-enviar?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, Editar'
    }).then(result => {
      if (result.isConfirmed) {
        // Enviar toda la solicitud para recuperar todo en el formulario (modo edición)
        sessionStorage.setItem('solicitudDevuelta', JSON.stringify(sol));
        this.router.navigate(['/front', sol.tipo]);
      }
    });
  }
}
