import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { CedulaFormatPipe } from '../../../../shared/pipes/formatos/cedula-format.pipe';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';
import { GeneroPipe } from '../../../../shared/pipes/formatos/genero.pipe';
import { EdadPipe } from '../../../../shared/pipes/formatos/edad.pipe';

@Component({
  selector: 'app-solicitud-tipo3',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CedulaFormatPipe, PhoneInputComponent, CurrencyMaskDirective, EdadPipe, GeneroPipe],
  templateUrl: './solicitud-tipo3.html',
})
export class SolicitudTipo3Component implements OnInit {
  private router = inject(Router);
  private solicitudesService = inject(SolicitudesService);

  datos: any = {};
  centroSeleccionado: string = '';
  busquedaCentro: string = '';
  fechaHoy: Date = new Date();
  centrosSalud = [
    { id: 1, nombre: 'Establecimiento A' },
    { id: 2, nombre: 'Punto de Venta 1' },
    { id: 3, nombre: 'Centro Logístico' },
    { id: 4, nombre: 'Sede Administrativa' },
    { id: 5, nombre: 'Almacén Central' },
    { id: 6, nombre: 'Oficina Norte' },
    { id: 7, nombre: 'Sucursal Este' },
    { id: 8, nombre: 'Punto de Atención X' },
    { id: 9, nombre: 'Sede Principal' },
    { id: 10, nombre: 'Centro Local' }
  ];

  paginaActual = 1;
  itemsPorPagina = 5;

  solicitudId: string | null = null;
  observacionesRechazo: string | null = null;

  ngOnInit(): void {
    const devuelta = sessionStorage.getItem('solicitudDevuelta');
    if (devuelta) {
      const s = JSON.parse(devuelta);
      if (s.tipo === 'solicitud-tipo3') {
        this.solicitudId = s.id;
        this.observacionesRechazo = s.observaciones || null;
        
        const u = s.datosPaciente;
        const f = s.datosFormulario;
        
        this.centroSeleccionado = f.centroSalud || '';

        this.datos = {
          nombre: u.nombre,
          cedula: u.cedula,
          esCertificado: u.esCertificado || false,
          sexoBeneficiario: u.sexoBeneficiario || '',
          fechaNacimientoBeneficiario: u.fechaNacimientoBeneficiario || '',
          titular: u.tipo === 'TITULAR' ? u.nombre : u.titularVinculado,
          cedulaTitular: u.tipo === 'TITULAR' ? u.cedula : u.cedulaTitular,
          sexoTitular: u.sexoTitular || '',
          fechaNacimientoTitular: u.fechaNacimientoTitular || '',
          parentesco: u.parentesco || 'TITULAR',
          montoTotal: f.montoTotal || 0,
          motivoReembolso: f.motivoReembolso || '',
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
        nombre: u.nombre,
        cedula: u.cedula,
        esCertificado: u.esCertificado || false,
        sexoBeneficiario: u.sexoBeneficiario || '',
        fechaNacimientoBeneficiario: u.fechaNacimientoBeneficiario || '',
        titular: u.tipo === 'TITULAR' ? u.nombre : u.titularVinculado,
        cedulaTitular: u.tipo === 'TITULAR' ? u.cedula : u.cedulaTitular,
        sexoTitular: u.sexoTitular || '',
        fechaNacimientoTitular: u.fechaNacimientoTitular || '',
        parentesco: u.parentesco || 'TITULAR',
        montoTotal: 0,
        motivoReembolso: '',
        telefonoPrincipal: u.telefono || '',
        telefonoSecundario: u.segundo_telefono || '',
        correo: u.correo || '',
      };
    }
  }

  get centrosFiltrados() {
    return this.centrosSalud.filter((c) =>
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

  seleccionarCentro(nombre: string): void {
    this.centroSeleccionado = nombre;
  }

  registrarSolicitud(): void {
    if (this.datos.montoTotal <= 0) {
      Swal.fire('Error', 'Debe indicar el monto total', 'error');
      return;
    }
    
    // Crear solicitud
    const pacienteData = {
      nombre: this.datos.nombre,
      cedula: this.datos.cedula,
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
      centroSalud: this.centroSeleccionado,
      montoTotal: this.datos.montoTotal,
      motivoReembolso: this.datos.motivoReembolso,
      telefonoPrincipal: this.datos.telefonoPrincipal,
      telefonoSecundario: this.datos.telefonoSecundario,
      correo: this.datos.correo,
    };

    if (this.solicitudId) {
       const sol = this.solicitudesService.actualizarDatosSolicitud(this.solicitudId, pacienteData, formDatos);
       Swal.fire({
          title: 'Registrado',
          text: `Solicitud ${sol?.id} enviada de nuevo a revisión.`,
          icon: 'success',
          confirmButtonText: 'Terminar'
       }).then(() => {
          this.router.navigate(['/operaciones/devueltos']);
       });
       return;
    }

    const sol = this.solicitudesService.crearSolicitud('solicitud-tipo3', pacienteData, formDatos);

    Swal.fire({
      title: 'Registrado',
      text: `Solicitud ${sol.id} enviada a revisión.`,
      icon: 'success',
      confirmButtonText: 'Terminar'
    }).then(() => {
      sessionStorage.removeItem('datosSolicitante');
      this.router.navigate(['/inicio']);
    });
  }
}
