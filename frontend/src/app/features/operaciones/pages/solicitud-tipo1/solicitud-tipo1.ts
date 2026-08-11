// aps2.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';

@Component({
  selector: 'app-solicitud-tipo1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CedulaFormatPipe, PhoneInputComponent, EdadPipe, GeneroPipe],
  templateUrl: './solicitud-tipo1.html',
})
export class SolicitudTipo1Component implements OnInit {
  private router = inject(Router);
  private solicitudesService = inject(SolicitudesService);

  datos: any = {};
  fechaHoy: string = new Date().toISOString().split('T')[0];
  especialidades = [
    'Opción A',
    'Opción B',
    'Opción C',
    'Opción D',
    'Opción E',
    'Opción F',
  ];

  solicitudId: string | null = null;
  observacionesRechazo: string | null = null;

  ngOnInit(): void {
    const devuelta = sessionStorage.getItem('solicitudDevuelta');
    if (devuelta) {
      const s = JSON.parse(devuelta);
      if (s.tipo === 'solicitud-tipo1') {
        this.solicitudId = s.id;
        this.observacionesRechazo = s.observaciones || null;
        
        const u = s.datosPaciente;
        const f = s.datosFormulario;
        
        this.datos = {
          titular: u.tipo === 'TITULAR' ? u.nombre : u.titularVinculado,
          cedulaTitular: u.tipo === 'TITULAR' ? u.cedula : u.cedulaTitular,
          sexoTitular: u.sexoTitular || '',
          fechaNacimientoTitular: u.fechaNacimientoTitular || '',
          beneficiario: u.nombre,
          cedulaBeneficiario: u.cedula,
          esCertificado: u.esCertificado || false,
          sexoBeneficiario: u.sexoBeneficiario || '',
          fechaNacimientoBeneficiario: u.fechaNacimientoBeneficiario || '',
          parentesco: u.parentesco || 'TITULAR',
          correo: f.correo || '',
          especialidad: f.especialidad || '',
          telefono: f.telefono || f.telefonoPrincipal || '',
          telefonoSecundario: f.telefonoSecundario || '',
        };
        sessionStorage.removeItem('solicitudDevuelta');
        return;
      }
    }

    const raw = sessionStorage.getItem('datosSolicitante');
    if (raw) {
      const u = JSON.parse(raw);
      this.datos = {
        titular: u.tipo === 'TITULAR' ? u.nombre : u.titularVinculado,
        cedulaTitular: u.tipo === 'TITULAR' ? u.cedula : u.cedulaTitular,
        sexoTitular: u.sexoTitular || '',
        fechaNacimientoTitular: u.fechaNacimientoTitular || '',
        beneficiario: u.nombre,
        cedulaBeneficiario: u.cedula,
        esCertificado: u.esCertificado || false,
        sexoBeneficiario: u.sexoBeneficiario || '',
        fechaNacimientoBeneficiario: u.fechaNacimientoBeneficiario || '',
        parentesco: u.parentesco || 'TITULAR',
        correo: u.correo || '',
        especialidad: '',
        telefonoPrincipal: u.telefono || '',
        telefonoSecundario: u.segundo_telefono || '',
      };
    }
  }

  registrarSolicitud(): void {
    if (!this.datos.especialidad) {
      Swal.fire('Error', 'Debe seleccionar una opción', 'error');
      return;
    }
    
    // Crear solicitud
    const pacienteData = {
      nombre: this.datos.beneficiario,
      cedula: this.datos.cedulaBeneficiario,
      tipo: this.datos.parentesco === 'TITULAR' ? 'TITULAR' : 'BENEFICIARIO',
      titularVinculado: this.datos.titular,
      cedulaTitular: this.datos.cedulaTitular,
      parentesco: this.datos.parentesco,
      sexoTitular: this.datos.sexoTitular,
      fechaNacimientoTitular: this.datos.fechaNacimientoTitular,
      esCertificado: this.datos.esCertificado,
      sexoBeneficiario: this.datos.sexoBeneficiario,
      fechaNacimientoBeneficiario: this.datos.fechaNacimientoBeneficiario
    };
    
    const formDatos = {
      especialidad: this.datos.especialidad,
      telefono: this.datos.telefono,
      telefonoSecundario: this.datos.telefonoSecundario,
      correo: this.datos.correo
    };

    if (this.solicitudId) {
      const sol = this.solicitudesService.actualizarDatosSolicitud(this.solicitudId, pacienteData, formDatos);
      Swal.fire({
        title: 'Actualizada',
        text: `Solicitud ${sol?.id} enviada de nuevo a revisión.`,
        icon: 'success',
        confirmButtonText: 'Terminar'
      }).then(() => {
        this.router.navigate(['/operaciones/devueltos']); // o /inicio
      });
      return;
    }

    const sol = this.solicitudesService.crearSolicitud('solicitud-tipo1', pacienteData, formDatos);

    Swal.fire({
      title: 'Generada',
      text: `Solicitud ${sol.id} enviada a revisión.`,
      icon: 'success',
      confirmButtonText: 'Terminar'
    }).then(() => {
      sessionStorage.removeItem('datosSolicitante');
      this.router.navigate(['/inicio']);
    });
  }
}
