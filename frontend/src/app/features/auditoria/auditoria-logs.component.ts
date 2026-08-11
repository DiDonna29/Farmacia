import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auditoria-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="mb-1 text-1100">Bitácora de Eventos</h2>
      <h5 class="text-700 fw-semi-bold">Seguimiento detallado de todas las acciones del sistema</h5>
    </div>

    <div class="card shadow-none border-translucent mb-3">
      <!-- Filtros -->
      <div class="card-header border-bottom border-translucent p-3">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-auto">
            <h5 class="mb-0 fw-bold">Historial de Eventos</h5>
          </div>
          <div class="col-auto">
            <label class="form-label fs--2 fw-bold text-700 mb-1">DESDE</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="desde" [min]="minDate" [max]="maxDate">
          </div>
          <div class="col-auto">
            <label class="form-label fs--2 fw-bold text-700 mb-1">HASTA</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="hasta" [min]="minDate" [max]="maxDate">
          </div>
          <div class="col-auto">
            <label class="form-label fs--2 fw-bold text-700 mb-1">ACCIÓN</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroAccion">
              <option value="">Todas las acciones</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="DESPACHO">DESPACHO</option>
              <option value="USUARIO_CREACION">USUARIO_CREACION</option>
              <option value="USUARIO_EDICION">USUARIO_EDICION</option>
              <option value="USUARIO_ESTADO">USUARIO_ESTADO</option>
              <option value="INVENTARIO_EGRESO">INVENTARIO_EGRESO</option>
              <option value="INVENTARIO_INCLUSION">INVENTARIO_INCLUSION</option>
              <option value="INVENTARIO_EDICION">INVENTARIO_EDICION</option>
              <option value="MEDICAMENTO_CREADO">MEDICAMENTO_CREADO</option>
              <option value="MEDICAMENTO_EDITADO">MEDICAMENTO_EDITADO</option>
              <option value="MEDICAMENTO_ELIMINADO">MEDICAMENTO_ELIMINADO</option>
              <option value="SOLICITUD_CREADA">SOLICITUD_CREADA</option>
              <option value="SOLICITUD_PROCESADA">SOLICITUD_PROCESADA</option>
              <option value="SOLICITUD_RECHAZADA">SOLICITUD_RECHAZADA</option>
              <option value="REACTIVACION">REACTIVACION</option>
              <option value="DESCARGA">DESCARGA</option>
            </select>
          </div>
          <div class="col col-md-3 ms-md-auto">
            <label class="form-label fs--2 fw-bold text-700 mb-1">BUSCAR</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text"><span class="fas fa-search"></span></span>
              <input type="text" class="form-control" placeholder="Usuario, descripción, IP..."
                     [(ngModel)]="filtroTexto" (ngModelChange)="filtrarLocal()">
            </div>
          </div>
          <div class="col-auto">
            <label class="form-label fs--2 fw-bold text-700 mb-1 opacity-0">.</label>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-phoenix-secondary" (click)="limpiarFiltros()" [disabled]="isLoading">
                <span class="fas fa-brush me-1"></span>Limpiar
              </button>
              <button class="btn btn-sm btn-phoenix-primary" (click)="cargar()" [disabled]="isLoading">
                <span class="fas fa-sync-alt me-1" [class.fa-spin]="isLoading"></span>Actualizar
              </button>
            </div>
          </div>
        </div>

        <!-- Exportar -->
        <div class="d-flex align-items-center gap-2 mt-3 pt-2 border-top border-translucent flex-wrap">
          <span class="fs--2 fw-bold text-700 me-1"><span class="fas fa-download me-1"></span>Exportar:</span>
          <!-- Se comenta el boton CSV para que el usuario no se confunda con este formato -->
          <!-- <button class="btn btn-sm btn-phoenix-secondary" (click)="exportar('csv')" [disabled]="exportando !== null || isLoading">
            <span [class]="exportando === 'csv' ? 'spinner-border spinner-border-sm me-1' : 'fas fa-file-csv me-1'"></span>
            CSV
          </button> -->

          <button class="btn btn-sm btn-phoenix-success" (click)="exportar('excel')" [disabled]="exportando !== null || isLoading">
            <span [class]="exportando === 'excel' ? 'spinner-border spinner-border-sm me-1' : 'fas fa-file-excel me-1'"></span>
            Excel
          </button>

          <button class="btn btn-sm btn-phoenix-danger" (click)="exportar('pdf')" [disabled]="exportando !== null || isLoading">
            <span [class]="exportando === 'pdf' ? 'spinner-border spinner-border-sm me-1' : 'fas fa-file-pdf me-1'"></span>
            PDF
          </button>

          <span class="ms-auto fs--2 text-600" *ngIf="!isLoading">
            Mostrando <strong>{{ logsFiltrados.length }}</strong> de <strong>{{ logs.length }}</strong> eventos
          </span>
        </div>
      </div>

      <div class="card-body p-0">
        <!-- Error -->
        <div *ngIf="!isLoading && errorMsg" class="alert alert-subtle-danger m-3 d-flex align-items-center gap-2">
          <span class="fas fa-exclamation-triangle"></span>
          <span>{{ errorMsg }}</span>
          <button class="btn btn-link btn-sm ms-auto text-danger" (click)="cargar()">Reintentar</button>
        </div>

        <!-- Tabla (con skeletons mientras carga) -->
        <div class="table-responsive" *ngIf="!errorMsg">
          <table class="table table-sm fs--1 mb-0 table-hover align-middle">
            <thead class="bg-body-secondary">
              <tr>
                <th class="ps-4 white-space-nowrap" style="width:155px">FECHA / HORA</th>
                <th class="white-space-nowrap" style="width:120px">USUARIO</th>
                <th class="white-space-nowrap" style="width:160px">ACCIÓN</th>
                <th>DESCRIPCIÓN</th>
                <th class="white-space-nowrap text-center" style="width:120px">DPTO.</th>
                <th class="text-end pe-4 white-space-nowrap" style="width:110px">IP</th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeletons mientras carga -->
              <ng-container *ngIf="isLoading">
                <tr *ngFor="let i of skeletonRows">
                  <td class="ps-4 py-3">
                    <div class="skeleton skeleton-text" style="width: 80px"></div>
                    <div class="skeleton skeleton-text mt-1" style="width: 60px"></div>
                  </td>
                  <td><div class="skeleton skeleton-text" style="width: 70px"></div></td>
                  <td><div class="skeleton skeleton-rounded" style="height: 20px; width: 100px"></div></td>
                  <td><div class="skeleton skeleton-text" style="width: 85%"></div></td>
                  <td class="text-center"><div class="skeleton skeleton-text" style="width: 60px; margin: auto"></div></td>
                  <td class="text-end pe-4"><div class="skeleton skeleton-text" style="width: 70px; margin-left: auto"></div></td>
                </tr>
              </ng-container>

              <!-- Datos reales -->
              <ng-container *ngIf="!isLoading">
                <tr *ngFor="let log of logsPaginados; trackBy: trackById">
                  <td class="ps-4 text-700 white-space-nowrap">
                    <span class="fas fa-clock me-1 text-400 fs--2"></span>
                    {{ log.fecha_hora | date:'dd/MM/yyyy' }}<br>
                    <span class="text-600 fs--2">{{ log.fecha_hora | date:'HH:mm:ss' }}</span>
                  </td>
                  <td>
                    <span class="fw-bold text-primary fs--1">{{ log.usuario }}</span>
                  </td>
                  <td>
                    <span class="badge badge-phoenix fs--2 text-uppercase" [ngClass]="getBadgeClass(log.accion)">
                      {{ log.accion }}
                    </span>
                  </td>
                  <td class="text-800 fs--1">{{ log.descripcion }}</td>
                  <td class="text-center">
                    <span class="badge badge-phoenix fs--2 text-uppercase" [ngClass]="log.departamento === 'PROVEEDURIA' ? 'badge-phoenix-info' : 'badge-phoenix-success'">
                      {{ log.departamento || 'SISTEMA' }}
                    </span>
                  </td>
                  <td class="text-end pe-4">
                    <code class="fs--2 text-600">{{ log.ip_address || '—' }}</code>
                  </td>
                </tr>
                <tr *ngIf="logsFiltrados.length === 0">
                  <td colspan="5" class="text-center py-5 text-700">
                    <span class="fas fa-file-shield fs-3 mb-2 d-block opacity-25"></span>
                    No se encontraron eventos con los filtros actuales.
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="d-flex justify-content-between align-items-center px-4 py-3 border-top" *ngIf="!isLoading && totalPaginas > 1">
          <span class="fs--2 text-700">Página {{ paginaActual }} de {{ totalPaginas }}</span>
          <nav>
            <ul class="pagination pagination-sm mb-0 gap-1">
              <li class="page-item" [class.disabled]="paginaActual === 1">
                <button class="page-link rounded" (click)="irPagina(paginaActual - 1)">
                  <span class="fas fa-chevron-left fs--2"></span>
                </button>
              </li>
              <li class="page-item" *ngFor="let p of paginasArray" [class.active]="p === paginaActual">
                <button class="page-link rounded" (click)="irPagina(p)">{{ p }}</button>
              </li>
              <li class="page-item" [class.disabled]="paginaActual === totalPaginas">
                <button class="page-link rounded" (click)="irPagina(paginaActual + 1)">
                  <span class="fas fa-chevron-right fs--2"></span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuditoriaLogsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly API = environment.apiUrl;

  logs: any[] = [];
  logsFiltrados: any[] = [];
  isLoading = false;
  errorMsg = '';
  exportando: string | null = null;

  filtroTexto = '';
  filtroAccion = '';

  desde: string;
  hasta: string;
  minDate: string;
  maxDate: string;

  paginaActual = 1;
  readonly itemsPorPagina = 20;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  private sub?: Subscription;
  private exportSub?: Subscription;

  constructor() {
    const hoy = new Date();
    this.maxDate = hoy.toISOString().split('T')[0];
    this.hasta = this.maxDate;

    const haceUnAno = new Date(hoy);
    haceUnAno.setFullYear(hoy.getFullYear() - 1);
    this.minDate = haceUnAno.toISOString().split('T')[0];

    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 30);
    this.desde = hace30.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    // Usar setTimeout para asegurar que el componente esté completamente inicializado
    setTimeout(() => this.cargar(), 0);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.exportSub?.unsubscribe();
  }

  cargar(): void {
    // Cancelar petición anterior si existe
    this.sub?.unsubscribe();

    this.isLoading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    const params = new URLSearchParams({ desde: this.desde, hasta: this.hasta, limit: '500' });
    if (this.filtroAccion) params.set('accion', this.filtroAccion);

    this.sub = this.http.get<any[]>(`${this.API}/auditoria/logs/?${params}`).subscribe({
      next: (data) => {
        this.logs = data || [];
        this.filtrarLocal();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'No se pudo cargar la bitácora. Verifique permisos.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroAccion = '';
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 30);
    this.hasta = hoy.toISOString().split('T')[0];
    this.desde = hace30.toISOString().split('T')[0];
    this.cargar();
  }

  filtrarLocal(): void {
    this.paginaActual = 1;
    const texto = this.filtroTexto.toLowerCase().trim();
    this.logsFiltrados = this.logs.filter(l => {
      return !texto
        || l.usuario?.toLowerCase().includes(texto)
        || l.accion?.toLowerCase().includes(texto)
        || l.descripcion?.toLowerCase().includes(texto)
        || l.ip_address?.includes(texto);
    });
  }

  exportar(formato: string): void {
    if (this.exportando !== null) return;

    this.exportando = formato;
    this.cdr.detectChanges();

    const extensiones: Record<string, string> = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };
    const params = new URLSearchParams({ formato, desde: this.desde, hasta: this.hasta });
    if (this.filtroAccion) params.set('accion', this.filtroAccion);

    // Cancelar export anterior si existe
    this.exportSub?.unsubscribe();

    this.exportSub = this.http.get(`${this.API}/auditoria/exportar/?${params}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `auditoria_${this.desde}_${this.hasta}.${extensiones[formato]}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.exportando = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.exportando = null;
          this.cdr.detectChanges();
          alert('No se pudo generar el archivo. Intente nuevamente.');
        }
      });
  }

  trackById(_: number, log: any): number { return log.id_log; }

  get logsPaginados(): any[] {
    const ini = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.logsFiltrados.slice(ini, ini + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.logsFiltrados.length / this.itemsPorPagina));
  }

  get paginasArray(): number[] {
    const total = this.totalPaginas;
    const current = this.paginaActual;
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  irPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) {
      this.paginaActual = p;
      this.cdr.detectChanges();
    }
  }

  getBadgeClass(accion: string): string {
    if (!accion) return 'badge-phoenix-secondary';
    const a = accion.toUpperCase();
    if (a.startsWith('LOGIN'))           return 'badge-phoenix-success';
    if (a.startsWith('LOGOUT'))          return 'badge-phoenix-secondary';
    if (a.startsWith('INVENTARIO'))      return 'badge-phoenix-info';
    if (a.startsWith('REACTIVACION'))    return 'badge-phoenix-warning';
    if (a.startsWith('USUARIO'))         return 'badge-phoenix-primary';
    if (a.startsWith('DESCARGA'))        return 'badge-phoenix-warning';
    if (a.startsWith('DESPACHO'))        return 'badge-phoenix-success';
    if (a.startsWith('SOLICITUD'))       return 'badge-phoenix-info';
    return 'badge-phoenix-primary';
  }
}
