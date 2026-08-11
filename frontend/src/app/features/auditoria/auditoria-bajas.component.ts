import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { SwalService } from '../../core/services/swal.service';
import { AuthService } from '../../core/services/auth.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-auditoria-bajas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-5">
      <div class="row g-3 justify-content-between align-items-end">
        <div class="col-auto">
          <h2 class="mb-2 text-1100">Auditoría de Bajas y Egresos</h2>
          <h5 class="text-700 fw-semi-bold">Gestión de ítems inhabilitados y trazabilidad de mermas</h5>
        </div>
        <!-- Selector de departamento solo para admin/director -->
        <div class="col-auto" *ngIf="puedeVerAmbos()">
          <div class="d-flex align-items-center gap-2">
            <label class="form-label fw-bold fs--2 text-700 text-uppercase mb-0">Departamento</label>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn"
                [class.btn-primary]="departamento === 'farmacia'"
                [class.btn-phoenix-secondary]="departamento !== 'farmacia'"
                (click)="cambiarDepartamento('farmacia')">
                <span class="fas fa-clinic-medical me-1"></span>Farmacia
              </button>
              <button type="button" class="btn"
                [class.btn-primary]="departamento === 'proveeduria'"
                [class.btn-phoenix-secondary]="departamento !== 'proveeduria'"
                (click)="cambiarDepartamento('proveeduria')">
                <span class="fas fa-warehouse me-1"></span>Proveeduría
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pestañas -->
    <ul class="nav nav-links mb-3 border-bottom border-300">
      <li class="nav-item">
        <a class="nav-link" [class.active]="tab === 'meds'" (click)="tab = 'meds'; cargarMeds()" href="javascript:void(0)">
          <span class="fas fa-pills me-1"></span>Medicamentos Inhabilitados
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" [class.active]="tab === 'lotes'" (click)="tab = 'lotes'; cargarLotes()" href="javascript:void(0)">
          <span class="fas fa-box me-1"></span>Lotes Egresados / Vencidos
          <span class="ms-1 text-600 fs--2">({{ departamentolabel }})</span>
        </a>
      </li>
    </ul>

    <!-- Contenido Medicamentos -->
    <div class="card shadow-none border border-300" *ngIf="tab === 'meds'">
      <div class="card-header border-bottom border-300 py-3 px-4">
        <p class="mb-0 fs--1 text-600">
          <span class="fas fa-info-circle me-1"></span>
          El catálogo de medicamentos es compartido entre ambos departamentos.
        </p>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive scrollbar">
          <table class="table table-sm fs--1 mb-0 table-hover">
            <thead class="bg-body-tertiary">
              <tr>
                <th class="ps-4 py-3">Medicamento</th>
                <th>Componentes / Principios</th>
                <th>Presentación</th>
                <th class="text-end pe-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="cargandoMeds">
                <tr *ngFor="let i of [1,2,3]">
                  <td class="ps-4 py-3"><div class="skeleton skeleton-text-lg"></div></td>
                  <td><div class="skeleton skeleton-text" style="width:80%"></div></td>
                  <td><div class="skeleton skeleton-text" style="width:60%"></div></td>
                  <td class="text-end pe-4"><div class="skeleton skeleton-rounded" style="height:24px;width:80px;margin-left:auto"></div></td>
                </tr>
              </ng-container>
              <tr *ngFor="let m of medsInactivos">
                <td class="ps-4 align-middle">
                    <div class="fw-bold text-uppercase">{{ m.nombre_generico }}</div>
                </td>
                <td class="align-middle">
                  <span class="text-600 fs--2">{{ m.componentes || '—' }}</span>
                </td>
                <td class="align-middle">{{ m.nombre_presentacion }}</td>
                <td class="text-end pe-4 align-middle">
                  <button class="btn btn-phoenix-success btn-sm" (click)="reactivar('medicamento', m.id_med_base)">
                    <span class="fas fa-undo me-1"></span>Reactivar
                  </button>
                </td>
              </tr>
              <tr *ngIf="medsInactivos.length === 0 && !cargandoMeds">
                <td colspan="4" class="text-center py-5">
                  <span class="fas fa-check-circle fs-3 text-success d-block mb-3"></span>
                  <p class="text-700 mb-0">No hay medicamentos inhabilitados en el catálogo</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Contenido Lotes -->
    <div class="card shadow-none border border-300" *ngIf="tab === 'lotes'">
      <div class="card-header border-bottom border-300 py-3 px-4 d-flex align-items-center justify-content-between">
        <p class="mb-0 fs--1 text-600">
          <span class="fas fa-warehouse me-1"></span>
          Mostrando lotes egresados de <strong>{{ departamentolabel }}</strong>
        </p>
        <span class="badge fs--2"
          [class.bg-primary]="departamento === 'farmacia'"
          [class.bg-warning]="departamento === 'proveeduria'">
          {{ lotesInactivos.length }} lote(s)
        </span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive scrollbar">
          <table class="table table-sm fs--1 mb-0 table-hover">
            <thead class="bg-body-tertiary">
              <tr>
                <th class="ps-4 py-3">Lote</th>
                <th>Medicamento / Insumo</th>
                <th class="text-end">Cant. Inicial</th>
                <th>Vencimiento</th>
                <th>Fecha Ingreso</th>
                <th class="text-end pe-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="cargandoLotes">
                <tr *ngFor="let i of [1,2,3]">
                  <td class="ps-4 py-3"><div class="skeleton skeleton-text" style="width:80px"></div></td>
                  <td><div class="skeleton skeleton-text-lg"></div></td>
                  <td class="text-end"><div class="skeleton skeleton-text" style="width:50px;margin-left:auto"></div></td>
                  <td><div class="skeleton skeleton-text" style="width:70px"></div></td>
                  <td><div class="skeleton skeleton-text" style="width:70px"></div></td>
                  <td class="text-end pe-4"><div class="skeleton skeleton-rounded" style="height:24px;width:110px;margin-left:auto"></div></td>
                </tr>
              </ng-container>
              <tr *ngFor="let l of lotesInactivos">
                <td class="ps-4 align-middle fw-bold"><code>{{ l.numero_lote }}</code></td>
                <td class="align-middle">
                    <div>{{ l.nombre_generico }}</div>
                    <div class="text-600 fs--2">{{ l.nombre_presentacion }}</div>
                </td>
                <td class="align-middle text-end">{{ l.cantidad_inicial | number }}</td>
                <td class="align-middle">{{ l.fecha_vencimiento | date:'dd/MM/yyyy' }}</td>
                <td class="align-middle">{{ l.fecha_ingreso | date:'dd/MM/yyyy' }}</td>
                <td class="text-end pe-4 align-middle">
                  <button class="btn btn-phoenix-success btn-sm" (click)="reactivar('lote', l.id_lote)">
                    <span class="fas fa-undo me-1"></span>Restaurar Lote
                  </button>
                </td>
              </tr>
              <tr *ngIf="lotesInactivos.length === 0 && !cargandoLotes">
                <td colspan="6" class="text-center py-5">
                  <span class="fas fa-check-circle fs-3 text-success d-block mb-3"></span>
                  <p class="text-700 mb-0">No hay lotes egresados en <strong>{{ departamentolabel }}</strong></p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-link { cursor: pointer; }
    .nav-link.active { font-weight: bold; color: var(--phoenix-primary) !important; border-bottom: 2px solid var(--phoenix-primary); }
  `]
})
export class AuditoriaBajasComponent implements OnInit {
  tab: 'meds' | 'lotes' = 'meds';
  medsInactivos: any[] = [];
  lotesInactivos: any[] = [];
  cargandoMeds = false;
  cargandoLotes = false;
  departamento: 'farmacia' | 'proveeduria' = 'farmacia';

  constructor(
    private auditoriaService: AuditoriaService,
    private swal: SwalService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get departamentolabel(): string {
    return this.departamento === 'farmacia' ? 'Farmacia' : 'Proveeduría';
  }

  puedeVerAmbos(): boolean {
    return this.auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO');
  }

  ngOnInit(): void {
    // Si es rol PROVEEDURIA, forzar su departamento
    if (this.auth.hasRole('PROVEEDURIA') && !this.auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO')) {
      this.departamento = 'proveeduria';
    }
    this.cargarMeds();
  }

  cambiarDepartamento(dep: 'farmacia' | 'proveeduria'): void {
    this.departamento = dep;
    if (this.tab === 'meds') this.cargarMeds();
    else this.cargarLotes();
  }

  cargarMeds(): void {
    this.cargandoMeds = true;
    this.auditoriaService.getMedicamentosInactivos().subscribe({
      next: (res: any) => {
        this.medsInactivos = res;
        this.cargandoMeds = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoMeds = false; }
    });
  }

  cargarLotes(): void {
    this.cargandoLotes = true;
    this.auditoriaService.getLotesInactivos(this.departamento).subscribe({
      next: (res: any) => {
        this.lotesInactivos = res;
        this.cargandoLotes = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoLotes = false; }
    });
  }

  reactivar(tipo: 'medicamento' | 'lote', id: number): void {
    this.swal.confirm(
      '¿Desea reactivar este ítem?',
      'Volverá a aparecer en el catálogo e inventario normal.',
      'Reactivar'
    ).then((res: any) => {
      if (res.isConfirmed) {
        this.auditoriaService.reactivar(tipo, id, this.departamento).subscribe({
          next: () => {
            this.swal.success('¡Reactivado!', 'El ítem está disponible nuevamente.');
            if (tipo === 'medicamento') this.cargarMeds();
            else this.cargarLotes();
          },
          error: (err: any) => {
            const msg = err?.error?.detail || 'Ocurrió un error al reactivar.';
            this.swal.error('Error', msg);
          }
        });
      }
    });
  }
}
