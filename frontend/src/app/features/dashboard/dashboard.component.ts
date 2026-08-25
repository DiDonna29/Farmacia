import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { InventarioService } from '../../core/services/inventario.service';
import { DashboardStats, LoteInventario } from '../../core/models/farmacia.models';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="anim-fade-in">
      <div class="mb-4 d-flex flex-wrap justify-content-between align-items-end gap-2">
      <div>
        <h2 class="mb-2 text-1100">Semáforo de Medicamentos</h2>
        <h5 class="text-700 fw-semi-bold">Resumen general de lotes y vigencias operativas</h5>
      </div>
      <a routerLink="/inventario" class="btn btn-sm btn-phoenix-secondary">
        <span class="fas fa-arrow-up-right-from-square me-1"></span>Ver Inventario completo
      </a>
    </div>

    <div class="row g-3 mb-4">
      <ng-container *ngIf="isLoading && !stats">
        <div class="col-sm-6 col-xl-2" *ngFor="let i of [1, 2, 3, 4, 5, 6]">
          <div class="card h-100 border-0 shadow-sm" style="background: rgba(255,255,255,0.02)">
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div class="w-100 me-3">
                  <div class="skeleton mb-2" style="height: 12px; width: 60%; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 28px; width: 40%; border-radius: 4px;"></div>
                </div>
                <div class="skeleton" style="width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0"></div>
              </div>
              <div class="skeleton mt-3" style="height: 10px; width: 80%; border-radius: 4px;"></div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="stats || !isLoading">
        <div class="col-sm-6 col-xl-2">
          <div
            class="card h-100 stat-card-hover anim-slide-up" style="animation-delay: 0ms"
            (click)="filtrarPor('')"
            [class.border-primary]="filtroActivo === ''"
            style="cursor:pointer"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1">Total Lotes</h6>
                  <h3 class="fw-bolder text-1100 mb-0">{{ stats?.total_lotes ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3"
                  style="width:38px;height:38px;background:rgba(37,99,235,0.1)"
                >
                  <span class="fas fa-layer-group text-primary"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600">Lotes en sistema</p>
            </div>
          </div>
        </div>

        <div class="col-sm-6 col-xl-2">
          <div
            class="card h-100 stat-card-hover anim-slide-up" style="animation-delay: 100ms"
            (click)="filtrarPor('OPTIMO')"
            [class.border-success]="filtroActivo === 'OPTIMO'"
            style="cursor:pointer"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1">Óptimos</h6>
                  <h3 class="fw-bolder text-success mb-0">{{ stats?.optimos ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3"
                  style="width:38px;height:38px;background:rgba(22,163,74,0.1)"
                >
                  <span class="fas fa-circle-check text-success"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600">🟢 Vigentes con Existencia</p>
            </div>
          </div>
        </div>

        <div class="col-sm-6 col-xl-2">
          <div
            class="card h-100 stat-card-hover anim-slide-up" style="animation-delay: 200ms"
            (click)="filtrarPor('PROXIMO')"
            [class.border-warning]="filtroActivo === 'PROXIMO'"
            style="cursor:pointer"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1">Próximos a Vencer</h6>
                  <h3 class="fw-bolder text-warning mb-0">{{ stats?.proximos_vencer ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3"
                  style="width:38px;height:38px;background:rgba(255,193,7,0.1)"
                >
                  <span class="fas fa-clock text-warning"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600">🟡 Menos de 4 meses</p>
            </div>
          </div>
        </div>

        <div class="col-sm-6 col-xl-2">
          <div
            class="card h-100 stat-card-hover anim-slide-up" style="animation-delay: 300ms"
            (click)="filtrarPor('VENCIDO')"
            [class.border-danger]="filtroActivo === 'VENCIDO'"
            style="cursor:pointer"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1">Vencidos</h6>
                  <h3 class="fw-bolder text-danger mb-0">{{ stats?.vencidos ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3"
                  style="width:38px;height:38px;background:rgba(220,38,38,0.1)"
                >
                  <span class="fas fa-circle-xmark text-danger"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600">🔴 Requieren baja</p>
            </div>
          </div>
        </div>

        <div class="col-sm-6 col-xl-2">
          <div
            class="card h-100 stat-card-hover anim-slide-up" style="animation-delay: 400ms"
            (click)="filtrarPor('AGOTADO')"
            [class.border-secondary]="filtroActivo === 'AGOTADO'"
            style="cursor:pointer"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1">Agotados</h6>
                  <h3 class="fw-bolder text-700 mb-0">{{ stats?.agotados ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3"
                  style="width:38px;height:38px;background:rgba(107,114,128,0.1)"
                >
                  <span class="fas fa-triangle-exclamation text-700"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600">⚪ Sin Existencia</p>
            </div>
          </div>
        </div>

        <div class="col-sm-6 col-xl-2">
          <div 
            class="card h-100 stat-card-hover border-info-subtle shadow-sm" 
            style="cursor:pointer"
            (click)="irAHistorialHoy()"
          >
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-700 mb-1 fs--1 text-uppercase fw-bold">Despachos Hoy</h6>
                  <h3 class="fw-bolder text-info mb-0">{{ stats?.despachos_hoy ?? '0' }}</h3>
                </div>
                <div
                  class="d-flex align-items-center justify-content-center rounded-3 bg-info-subtle"
                  style="width:38px;height:38px"
                >
                  <span class="fas fa-truck text-info"></span>
                </div>
              </div>
              <p class="mt-2 mb-0 fs--2 text-600 fw-semi-bold">
                <span class="fas fa-arrow-right me-1 fs--3"></span>Ver registros hoy
              </p>
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <div class="card anim-scale-up" style="animation-delay: 250ms">

      <div class="card-body px-0 pt-0">
        <div class="px-4 py-3 border-bottom d-flex flex-wrap gap-2 align-items-center">
          <div class="search-box" style="min-width:220px;flex:1">
            <div class="position-relative">
              <input
                type="text"
                class="form-control search-input search form-control-sm"
                placeholder="Buscar Medicamento, Componentes o lotes..."
                (input)="onBusqueda($event)"
                [value]="busqueda"
              /><span class="fas fa-search search-box-icon"></span>
            </div>
          </div>

          <select
            class="form-select form-select-sm w-auto"
            (change)="onEstadoChange($event)"
            [value]="filtroActivo"
          >
            <option value="">Todos los estados</option>
            <option value="OPTIMO">🟢 Óptimo</option>
            <option value="PROXIMO">🟡 Próximo a Vencer</option>
            <option value="VENCIDO">🔴 Vencido</option>
            <option value="AGOTADO">⚪ Agotado</option>
          </select>

          <select class="form-select form-select-sm w-auto" (change)="onPresentacionChange($event)">
            <option value="">Todas las presentaciones</option>
            <option *ngFor="let p of presentaciones" [value]="p.nombre">{{ p.nombre }}</option>
          </select>

          <button
            class="btn btn-sm btn-phoenix-secondary"
            (click)="limpiarFiltros()"
            *ngIf="filtroActivo || busqueda"
          >
            <span class="fas fa-broom me-1"></span>Limpiar
          </button>
        </div>

        <div class="table-responsive scrollbar" *ngIf="isLoading">
          <table class="table table-sm mb-0 fs--1">
            <thead>
              <tr>
                <th class="ps-4" style="width: 25%">Medicamento</th>
                <th style="width: 20%">Principios Activos / Componentes</th>
                <th style="width: 20%">Presentación</th>
                <th style="width: 15%">N° Lote</th>
                <th class="text-end pe-4" style="width: 10%">Existencia</th>
                <th class="ps-4" style="width: 15%">Vencimiento</th>
                <th class="text-center" style="width: 10%">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let i of [1, 2, 3, 4, 5, 6, 7]">
                <td class="ps-4 py-3 align-middle">
                  <div class="skeleton" style="height: 16px; width: 70%; border-radius: 4px;"></div>
                </td>
                <td class="py-3 align-middle">
                  <div class="skeleton" style="height: 20px; width: 65%; border-radius: 10px; background: rgba(255,255,255,0.04)"></div>
                </td>
                <td class="py-3 align-middle">
                  <div class="skeleton" style="height: 14px; width: 80%; border-radius: 4px;"></div>
                </td>
                <td class="py-3 align-middle">
                  <div class="skeleton" style="height: 22px; width: 60%; border-radius: 4px; background: rgba(255,255,255,0.06)"></div>
                </td>
                <td class="py-3 text-end pe-4 align-middle">
                  <div class="skeleton ms-auto" style="height: 16px; width: 30%; border-radius: 4px;"></div>
                </td>
                <td class="py-3 ps-4 align-middle">
                  <div class="skeleton" style="height: 14px; width: 50%; border-radius: 4px;"></div>
                </td>
                <td class="py-3 text-center align-middle">
                  <div class="skeleton mx-auto" style="height: 20px; width: 80px; border-radius: 12px; background: rgba(255,255,255,0.05)"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-responsive scrollbar" *ngIf="!isLoading">
          <table class="table table-sm table-hover mb-0 fs--1">
            <thead>
              <tr>
                <th class="sort white-space-nowrap align-middle ps-4" scope="col">Medicamento</th>
                <th class="sort white-space-nowrap align-middle" scope="col">Principios Activos / Componentes</th>
                <th class="sort white-space-nowrap align-middle" scope="col">Presentación</th>
                <th class="sort white-space-nowrap align-middle" scope="col">N° Lote</th>
                <th class="sort white-space-nowrap align-middle text-end pe-4" scope="col">Existencia</th>
                <th class="sort white-space-nowrap align-middle ps-4" scope="col">Vencimiento</th>
                <th class="sort white-space-nowrap align-middle text-center" scope="col">Estado</th>
              </tr>
            </thead>
            <tbody class="list">
              <tr *ngFor="let item of inventario; let idx = index" class="anim-slide-right" [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 300) + 'ms'">
                <td class="align-middle ps-4">
                  <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-body-emphasis fs-0 text-uppercase">{{ item.medicamento_detallado.split(' - ')[0] }}</span>
                  </div>
                </td>
                <td class="align-middle text-600">
                  <div class="d-flex flex-wrap gap-1" *ngIf="item.componentes_json?.length; else sinComponentes">
                    <span class="badge badge-phoenix badge-phoenix-secondary fs--2" *ngFor="let comp of item.componentes_json">
                      {{ comp.nombre_principio }} {{ comp.concentracion_valor }} {{ comp.nombre_unidad }}
                    </span>
                  </div>
                  <ng-template #sinComponentes>
                    <span class="text-500 fs--2">Sin especificar</span>
                  </ng-template>
                </td>
                <td class="align-middle text-900">{{ item.nombre_presentacion }}</td>
                <td class="align-middle">
                  <code class="text-700 fs--2 bg-200 px-2 py-1 rounded">{{
                    item.numero_lote
                  }}</code>
                </td>
                <td
                  class="align-middle text-end fw-bold pe-4"
                  [class.text-danger]="item.cantidad_actual === 0"
                  [class.text-1000]="item.cantidad_actual > 0"
                >
                  {{ item.cantidad_actual | number }}
                </td>
                <td
                  class="align-middle ps-4"
                  [class.text-danger]="item.color_clase === 'danger'"
                  [class.text-warning]="item.color_clase === 'warning'"
                  [class.text-success]="item.color_clase === 'success'"
                  [class.text-700]="item.color_clase === 'secondary'"
                >
                  {{ item.fecha_vencimiento | date: 'dd/MM/yyyy' }}
                </td>
                <td class="align-middle text-center">
                  <span
                    class="badge badge-phoenix fs--2"
                    [class.badge-phoenix-success]="item.color_clase === 'success'"
                    [class.badge-phoenix-warning]="item.color_clase === 'warning'"
                    [class.badge-phoenix-danger]="item.color_clase === 'danger'"
                    [class.badge-phoenix-secondary]="item.color_clase === 'secondary'"
                  >
                    {{ item.estado_logico }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="inventario.length === 0">
                <td colspan="6" class="text-center py-5 text-700">
                  <span class="fas fa-box-open d-block fs-3 mb-2 opacity-50"></span>
                  No se encontraron medicamentos con los filtros aplicados
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="d-flex align-items-center justify-content-between px-4 py-3 border-top"
          *ngIf="!isLoading && totalItems > 0"
        >
          <p class="mb-0 fs--1 text-700">Mostrando {{ inventario.length }} de {{ totalItems }}</p>
          <nav>
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary px-2" *ngIf="pageNumbers.length > 0 && pageNumbers[0] > 1" (click)="cambiarPagina(pageNumbers[0] - 1)" title="Bloque anterior">
                <span class="fas fa-angle-double-left"></span>
              </button>

              <ul class="mb-0 pagination pagination-sm">
                <li class="page-item" [class.disabled]="currentPage === 1">
                  <button class="page-link" (click)="cambiarPagina(currentPage - 1)">
                    <span class="fas fa-chevron-left"></span>
                  </button>
                </li>
                <li
                  *ngFor="let p of pageNumbers"
                  class="page-item"
                  [class.active]="p === currentPage"
                >
                  <button class="page-link" (click)="cambiarPagina(p)">{{ p }}</button>
                </li>
                <li class="page-item" [class.disabled]="currentPage === totalPages">
                  <button class="page-link" (click)="cambiarPagina(currentPage + 1)">
                    <span class="fas fa-chevron-right"></span>
                  </button>
                </li>
              </ul>

              <button class="btn btn-sm btn-outline-secondary px-2" *ngIf="pageNumbers.length > 0 && pageNumbers[pageNumbers.length - 1] < totalPages" (click)="cambiarPagina(pageNumbers[pageNumbers.length - 1] + 1)" title="Siguiente bloque">
                <span class="fas fa-angle-double-right"></span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
    </div>
  `,
  styles: [
    `

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideRight {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .anim-fade-in {
        animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .anim-slide-up {
        opacity: 0;
        animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .anim-scale-up {
        opacity: 0;
        animation: scaleUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .anim-slide-right {
        opacity: 0;
        animation: slideRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      .stat-card-hover {
        transition:
          transform 0.15s,
          box-shadow 0.15s;
      }
      .stat-card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
      }
      .search-box-icon {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #8a94ad;
        font-size: 0.75rem;
      }
      .search-input {
        padding-right: 2rem;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  stats: DashboardStats | null = null;
  inventario: LoteInventario[] = [];
  presentaciones: { id: number; nombre: string }[] = [];
  isLoading = false;
  filtroActivo = '';
  busqueda = '';
  presentacionFiltro = '';
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageNumbers: number[] = [];

  private busquedaSubject = new Subject<string>();

  irAHistorialHoy(): void {
    const hoy = new Date().toISOString().split('T')[0];
    this.router.navigate(['/historial'], { queryParams: { desde: hoy, hasta: hoy } });
  }

  ngOnInit(): void {
    this.cargarStats();
    this.cargarPresentaciones();
    this.cargarInventario();

    // Setup debounce for search (400ms)
    this.busquedaSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((q) => {
      this.busqueda = q;
      this.currentPage = 1;
      this.cargarInventario();
    });
  }

  cargarStats(): void {
    this.inventarioService.getDashboardStats().subscribe({
      next: (d) => {
        this.stats = d;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  cargarPresentaciones(): void {
    this.inventarioService.getPresentacionesFiltro().subscribe({
      next: (d) => {
        this.presentaciones = d;
        this.cdr.detectChanges(); // <-- ESTA ES LA LÍNEA QUE SOLUCIONA EL ERROR
      },
    });
  }

  cargarInventario(): void {
    this.isLoading = true;
    this.inventarioService
      .getInventario({
        page: this.currentPage,
        page_size: 15,
        estado: this.filtroActivo,
        presentacion: this.presentacionFiltro,
        busqueda: this.busqueda,
      })
      .subscribe({
        next: (r) => {
          this.inventario = r.results;
          this.totalItems = r.count;
          this.totalPages = Math.ceil(r.count / 15);
          this.actualizarPaginacion();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  filtrarPor(estado: string): void {
    this.filtroActivo = estado;
    this.currentPage = 1;
    this.cargarInventario();
  }
  onBusqueda(e: Event): void {
    const q = (e.target as HTMLInputElement).value;
    this.busquedaSubject.next(q);
  }
  onEstadoChange(e: Event): void {
    this.filtroActivo = (e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.cargarInventario();
  }
  onPresentacionChange(e: Event): void {
    this.presentacionFiltro = (e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.cargarInventario();
  }
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroActivo = '';
    this.presentacionFiltro = '';
    this.cargarInventario();
  }

  getGenerico(detallado: string): string {
    if (!detallado) return '';
    return detallado.split(' (')[0];
  }

  getComponentes(detallado: string): string {
    if (!detallado) return '';
    const parts = detallado.split(' (');
    return parts.length > 1 ? parts[1].replace(')', '') : 'Sin componentes';
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.cargarInventario();
  }

  private actualizarPaginacion(): void {
    const pages = [];
    const maxVisible = 5;
    
    // Calcular bloque estático (ej: 1-5, 6-10)
    const currentBlock = Math.floor((this.currentPage - 1) / maxVisible);
    let start = currentBlock * maxVisible + 1;
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.pageNumbers = pages;
  }
}
