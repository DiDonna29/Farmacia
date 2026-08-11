import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';

@Component({
  selector: 'app-solicitud-tipo2',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CedulaFormatPipe, PhoneInputComponent, CurrencyMaskDirective, EdadPipe, GeneroPipe],
  templateUrl: './solicitud-tipo2.html',
})
export class SolicitudTipo2Component implements OnInit {
  private router = inject(Router);
  private solicitudesService = inject(SolicitudesService);

  datos: any = {};
  centroSeleccionado: string = '';
  busquedaCentro: string = '';
  centros = [
    { id: 1, nombre: 'Entidad A' },
    { id: 2, nombre: 'Sucursal Principal' },
    { id: 3, nombre: 'Centro de Servicios X' },
    { id: 4, nombre: 'Oficina Central' },
    { id: 5, nombre: 'Punto de Atención 1' },
    { id: 6, nombre: 'Sede Regional' },
    { id: 7, nombre: 'Establecimiento Local' },
    { id: 8, nombre: 'Unidad de Gestión' },
    { id: 9, nombre: 'Punto de Venta' },
    { id: 10, nombre: 'Zona Industrial' }
  ];

  paginaActual = 1;
  itemsPorPagina = 5;

  solicitudId: string | null = null;
  observacionesRechazo: string | null = null;

  ngOnInit(): void {
    const devuelta = sessionStorage.getItem('solicitudDevuelta');
    if (devuelta) {
      const s = JSON.parse(devuelta);
      if (s.tipo === 'solicitud-tipo2') {
        this.solicitudId = s.id;
        this.observacionesRechazo = s.observaciones || null;
        const u = s.datosPaciente;
        const f = s.datosFormulario;

        this.centroSeleccionado = f.clinica || '';
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
          monto: f.monto || 0,
          diagnostico: f.diagnostico || '',
          observaciones: f.observaciones || '',
          telefonoPrincipal: f.telefonoPrincipal || u.telefono || '',
          telefonoSecundario: f.telefonoSecundario || u.segundo_telefono || '',
          correo: f.correo || u.correo || '',
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
        monto: 0,
        diagnostico: '',
        observaciones: '',
        telefonoPrincipal: u.telefono || '',
        telefonoSecundario: u.segundo_telefono || '',
        correo: u.correo || '',
      };
    }
  }

  get centrosFiltrados() {
    return this.centros.filter((c) =>
      c.nombre.toLowerCase().includes(this.busquedaCentro.toLowerCase()),
    );
  }

  get totalPaginas() {
    return Math.ceil(this.centrosFiltrados.length / this.itemsPorPagina) || 1;
  }

  get centrosPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.centrosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  cambiarPagina(delta: number) {
    const nueva = this.paginaActual + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas) {
      this.paginaActual = nueva;
    }
  }

  alBuscar() {
    this.paginaActual = 1;
  }

  seleccionar(c: string): void {
    this.centroSeleccionado = c;
  }

  registrar(): void {
    if (!this.centroSeleccionado || this.datos.monto <= 0) {
      Swal.fire('Atención', 'Debe indicar entidad y monto', 'warning');
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
      clinica: this.centroSeleccionado,
      monto: this.datos.monto,
      diagnostico: this.datos.diagnostico,
      observaciones: this.datos.observaciones,
      telefonoPrincipal: this.datos.telefonoPrincipal,
      telefonoSecundario: this.datos.telefonoSecundario,
      correo: this.datos.correo,
    };

    if (this.solicitudId) {
       const sol = this.solicitudesService.actualizarDatosSolicitud(this.solicitudId, pacienteData, formDatos);
       Swal.fire({
          title: 'Actualizada',
          text: `Solicitud ${sol?.id} enviada de nuevo a revisión.`,
          icon: 'success',
          confirmButtonText: 'Terminar'
       }).then(() => {
          this.router.navigate(['/operaciones/devueltos']);
       });
       return;
    }

    const sol = this.solicitudesService.crearSolicitud('solicitud-tipo2', pacienteData, formDatos);

    Swal.fire({
      title: 'Procesado',
      text: `Solicitud ${sol.id} enviada a revisión.`,
      icon: 'success',
      confirmButtonText: 'Terminar'
    }).then(() => {
      sessionStorage.removeItem('datosSolicitante');
      this.router.navigate(['/inicio']);
    });
  }
}
