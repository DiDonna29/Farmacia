import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { SoloNumerosDirective } from '../../../shared/directives/solo-numeros.directive';

@Component({
  selector: 'app-hoja-ruta',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneInputComponent, CurrencyMaskDirective, SoloNumerosDirective],
  templateUrl: './hoja-ruta.html',
})
export class HojaRutaComponent {
  private solicitudesService = inject(SolicitudesService);

  // Formularios mockeados
  datosAps: any = { dato1: '', monto: 0, dato2: '' };
  datosAval: any = { entidad: '', monto: 0 };
  datosReembolso: any = { lugar: '', monto: 0 };

  // Datos comunes para el paciente
  pacienteData = {
    titular: '',
    cedulaTitular: '',
    beneficiario: '',
    cedulaBeneficiario: '',
    parentesco: 'TITULAR',
    telefonoPrincipal: '',
    telefonoSecundario: '',
    correo: ''
  };

  centrosSalud = [
    'Entidad A', 'Sede Principal', 'Sucursal Norte',
    'Centro de Servicios G', 'Establecimiento Local'
  ];
  especialidades = ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'];

  abrirModal(tipo: string) {
    this.pacienteData = {
      titular: '', cedulaTitular: '', beneficiario: '', cedulaBeneficiario: '',
      parentesco: 'TITULAR', telefonoPrincipal: '', telefonoSecundario: '', correo: ''
    };
    if (tipo === 'solicitud-tipo1') this.datosAps = { dato1: '', monto: 0, dato2: '' };
    if (tipo === 'solicitud-tipo2') this.datosAval = { entidad: '', monto: 0 };
    if (tipo === 'solicitud-tipo3') this.datosReembolso = { lugar: '', monto: 0 };
  }

  generarTramite(tipo: string) {
    if (!this.pacienteData.titular || !this.pacienteData.cedulaTitular || !this.pacienteData.beneficiario) {
      Swal.fire('Atención', 'Datos básicos incompletos.', 'warning');
      return;
    }

    const payloadPaciente = {
      nombre: this.pacienteData.beneficiario,
      cedula: this.pacienteData.cedulaBeneficiario,
      tipo: this.pacienteData.parentesco === 'TITULAR' ? 'TITULAR' : 'BENEFICIARIO',
      titularVinculado: this.pacienteData.titular,
      cedulaTitular: this.pacienteData.cedulaTitular,
      parentesco: this.pacienteData.parentesco,
    };

    let formPayload: any = {
      telefonoPrincipal: this.pacienteData.telefonoPrincipal,
      telefonoSecundario: this.pacienteData.telefonoSecundario,
      correo: this.pacienteData.correo
    };

    let textoExito = '';

    if (tipo === 'solicitud-tipo1') {
      if (!this.datosAps.dato2) { Swal.fire('Error', 'Debe seleccionar opción', 'error'); return; }
      formPayload = { ...formPayload, especialidad: this.datosAps.dato2 };
      textoExito = 'Tipo 1';
      this.solicitudesService.crearSolicitud('solicitud-tipo1', payloadPaciente, formPayload);
    } 
    else if (tipo === 'solicitud-tipo2') {
      if (!this.datosAval.entidad || this.datosAval.monto <= 0) { Swal.fire('Error', 'Faltan datos de la solicitud', 'error'); return; }
      formPayload = { ...formPayload, clinica: this.datosAval.entidad, monto: this.datosAval.monto };
      textoExito = 'Tipo 2';
      this.solicitudesService.crearSolicitud('solicitud-tipo2', payloadPaciente, formPayload);
    } 
    else if (tipo === 'solicitud-tipo3') {
      if (!this.datosReembolso.lugar || this.datosReembolso.monto <= 0) { Swal.fire('Error', 'Faltan datos de la solicitud', 'error'); return; }
      formPayload = { ...formPayload, centroSalud: this.datosReembolso.lugar, montoTotal: this.datosReembolso.monto };
      textoExito = 'Tipo 3';
      this.solicitudesService.crearSolicitud('solicitud-tipo3', payloadPaciente, formPayload);
    }

    Swal.fire('Gestión Exitosa', `Solicitud de ${textoExito} enviada a revisión.`, 'success').then(() => {
      // close modals manually if needed via JS or keep it simple since we rely on bootstrap data-bs-dismiss
      const clse = document.querySelectorAll('.btn-close-modal');
      clse.forEach((btn: any) => btn.click());
    });
  }
}
