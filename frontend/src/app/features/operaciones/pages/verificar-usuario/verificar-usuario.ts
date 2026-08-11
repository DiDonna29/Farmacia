import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { TitularService } from '../../../../core/services/titular.service';
import { Titular, CargaFamiliar } from '../../../../core/interfaces/bienestar.interface';
import { BsFormatPipe } from '../../../../shared/pipes/formatos/bs-format.pipe';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';

import { SoloNumerosDirective } from '../../../../shared/directives/solo-numeros.directive';

@Component({
  selector: 'app-verificar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BsFormatPipe, CedulaFormatPipe, EdadPipe, GeneroPipe, SoloNumerosDirective],
  templateUrl: './verificar-usuario.html',
})
export class VerificarUsuarioComponent implements OnInit {
  cedulaBusqueda: string = '';
  usuarioEncontrado: Titular | null = null;
  
  // Variables para la Póliza Mockeada
  montoDisponibleBs = 150000;
  montoGastadoBs = 48000;
  porcentajeConsumido = 32; // (48000 / 150000) * 100
  
  tasaDolar: number = 0;
  tasaEuro: number = 0;
  Math = Math;


  constructor(
    private router: Router,
    private titularService: TitularService,
  ) {}

  ngOnInit() {
    this.obtenerTasas();
    
    // Recuperar búsqueda previa si existe
    const previa = sessionStorage.getItem('ultimaBusqueda');
    if (previa) {
      this.cedulaBusqueda = previa;
      this.buscar(true); // silent search
    }
  }

  async obtenerTasas() {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/cotizaciones');
      const data = await response.json();
      const dolar = data.find((m: any) => m.moneda === 'USD');
      const euro = data.find((m: any) => m.moneda === 'EUR');
      
      if (dolar) this.tasaDolar = dolar.promedio;
      if (euro) this.tasaEuro = euro.promedio;
    } catch (e) {
      console.error('Error obteniendo tasas BCV', e);
    }
  }

  buscar(silent = false) {
    if (!this.cedulaBusqueda) return;
    
    sessionStorage.setItem('ultimaBusqueda', this.cedulaBusqueda);

    this.titularService.buscarPorCedula(Number(this.cedulaBusqueda)).subscribe({
      next: (resultado) => {
        if (resultado) {
          this.usuarioEncontrado = resultado;
        } else {
          this.usuarioEncontrado = null;
          if (!silent) {
            Swal.fire({
              title: 'No encontrado',
              text: 'La cédula no coincide con los registros',
              icon: 'error',
              confirmButtonColor: '#3085d6',
            });
          }
        }
      },
    });
  }

  pacienteSeleccionado: any = null;

  seleccionarBeneficiario(persona: any, rol: 'TITULAR' | 'BENEFICIARIO') {
    this.pacienteSeleccionado = {
      nombre:
        rol === 'TITULAR'
          ? `${persona.nombres_titular} ${persona.apellidos_titular}`
          : `${persona.nombres} ${persona.apellidos}`,
      cedula: rol === 'TITULAR' ? persona.cedula : persona.cedula_beneficiario,
      tipo: rol,
      titularVinculado:
        rol === 'TITULAR'
          ? `${persona.nombres_titular} ${persona.apellidos_titular}`
          : `${this.usuarioEncontrado?.nombres_titular} ${this.usuarioEncontrado?.apellidos_titular}`,
      cedulaTitular: this.usuarioEncontrado?.cedula,
      parentesco: rol === 'TITULAR' ? 'TITULAR' : persona.parentesco,
      
      // Demograficos del titular siempre
      sexoTitular: this.usuarioEncontrado?.sexo,
      fechaNacimientoTitular: this.usuarioEncontrado?.fecha_nacimiento,
      
      // Datos del beneficiario si es uno
      sexoBeneficiario: rol === 'TITULAR' ? this.usuarioEncontrado?.sexo : persona.sexo,
      fechaNacimientoBeneficiario: rol === 'TITULAR' ? this.usuarioEncontrado?.fecha_nacimiento : persona.fecha_nacimiento,
      esCertificado: rol === 'TITULAR' ? false : (persona.certificado_medico || false),
      
      // Datos de contacto del titular para la solicitud
      telefono: this.usuarioEncontrado?.telefono_principal,
      segundo_telefono: this.usuarioEncontrado?.segundo_telefono,
      correo: this.usuarioEncontrado?.correo_electronico,
    };

    sessionStorage.setItem('datosSolicitante', JSON.stringify(this.pacienteSeleccionado));

    Swal.fire({
      title: 'Paciente Seleccionado',
      text: `Listo para iniciar trámite para: ${this.pacienteSeleccionado.nombre}`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  iniciarTramite(tipo: string) {
    if (!this.pacienteSeleccionado) {
      Swal.fire(
        'Atención',
        'Debe seleccionar un paciente (Titular o Beneficiario) de la lista primero',
        'warning',
      );
      return;
    }
    this.router.navigate(['/operaciones', tipo]);
  }

  cancelar() {
    this.cedulaBusqueda = '';
    this.usuarioEncontrado = null;
    sessionStorage.removeItem('ultimaBusqueda');
    sessionStorage.removeItem('datosSolicitante');
    this.titularService.limpiarSeleccion();
  }
}
