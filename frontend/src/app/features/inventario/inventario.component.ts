import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../../core/services/inventario.service';
import { LoteInventario } from '../../core/models/farmacia.models';
import { ChangeDetectorRef } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  styles: [`
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
`],
  template: `
    <div class="anim-fade-in">
    <div class="mb-4">
      <h2 class="mb-2 text-1100">Inventario Completo</h2>
      <h5 class="text-700 fw-semi-bold">Gestión de existencias y control de vencimientos</h5>
    </div>

    <div class="row g-3 mb-5 anim-slide-up">
      <!-- Módulo 1: Existencia Global -->
      <div class="col-12 col-md-6">
        <div class="card shadow-none border-translucent h-100 bg-primary-subtle">
          <div class="card-body p-4 d-flex align-items-center justify-content-center h-100">
            <div class="d-flex align-items-center gap-4">
              <div class="p-3 bg-primary rounded-3 text-white shadow-sm">
                <span class="fas fa-warehouse fs-2"></span>
              </div>
              <div>
                <h6 class="mb-1 text-primary fw-bold uppercase fs--1">Total General en Existencia</h6>
                <h2 class="mb-0 text-primary-darker">{{ totalGeneralExistencia | number }} <small class="fs--1 fw-normal text-600">uds.</small></h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Módulo 3: Ordenamiento Inteligente -->
      <div class="col-12 col-md-6">
        <div class="card shadow-none border-translucent h-100">
          <div class="card-body p-3 d-flex flex-column justify-content-center">
            <h6 class="mb-2 text-700 fw-bold fs--2"><span class="fas fa-sort me-2"></span>Ordenamiento Inteligente</h6>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-sm flex-grow-1" 
                [class.btn-phoenix-primary]="ordering.includes('existencia')"
                [class.btn-phoenix-secondary]="!ordering.includes('existencia')"
                (click)="toggleOrden('existencia')">
                <span class="fas" [class.fa-sort-amount-up]="ordering === 'existencia_asc'" [class.fa-sort-amount-down]="ordering === 'existencia_desc' || !ordering.includes('existencia')"></span>
                Existencia
              </button>

              <button class="btn btn-sm flex-grow-1" 
                [class.btn-phoenix-primary]="ordering.includes('venc')"
                [class.btn-phoenix-secondary]="!ordering.includes('venc')"
                (click)="toggleOrden('venc')">
                <span class="fas fa-calendar-alt me-1"></span>
                Fecha
              </button>

              <button class="btn btn-sm flex-grow-1" 
                [class.btn-phoenix-primary]="ordering.includes('alpha')"
                [class.btn-phoenix-secondary]="!ordering.includes('alpha')"
                (click)="toggleOrden('alpha')">
                <span class="fas" [class.fa-sort-alpha-up]="ordering === 'alpha_asc'" [class.fa-sort-alpha-down]="ordering === 'alpha_desc' || !ordering.includes('alpha')"></span>
                A-Z
              </button>

              <button class="btn btn-sm btn-phoenix-secondary flex-grow-1" (click)="limpiarFiltrosSolo()" title="Limpiar Filtros">
                <span class="fas fa-broom me-2"></span>Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-none border-translucent mb-3 anim-scale-up delay-100">
      <div class="card-header border-bottom border-translucent p-4">
        <div class="row g-3 justify-content-between align-items-center">
          <div class="col-12 col-md-auto">
            <div class="search-box" style="width: 20rem; max-width: 100%;">
              <form class="position-relative">
                <input 
                  type="text" 
                  class="form-control form-control-sm search-input search shadow-sm" 
                  placeholder="Buscar Medicamento, Componentes o lotes..." 
                  (input)="onBusqueda($event)" 
                  [value]="busqueda"
                />
                <span class="fas fa-search search-box-icon"></span>
              </form>
            </div>
          </div>
          <div class="col-12 col-md-auto">
            <div class="d-flex flex-wrap gap-2">
              <select class="form-select form-select-sm w-auto" (change)="onEstado($event)" [value]="estado">
                <option value="">Estado (Todos)</option>
                <option value="OPTIMO">🟢 Óptimo</option>
                <option value="PROXIMO">🟡 Próximo a Vencer</option>
                <option value="VENCIDO">🔴 Vencido</option>
                <option value="AGOTADO">⚪ Agotado</option>
              </select>
              <select class="form-select form-select-sm w-auto" (change)="onPresentacion($event)" [value]="presentacion">
                <option value="">Presentación (Todas)</option>
                <option *ngFor="let p of presentaciones" [value]="p.nombre">{{ p.nombre }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive scrollbar">
          <table class="table table-sm fs--1 mb-0 border-top border-200 table-hover">
            <thead>
              <tr>
                <th class="white-space-nowrap align-middle ps-4 text-900" scope="col">Medicamento/Presentación</th>
                <th class="white-space-nowrap align-middle text-900" scope="col">Principios Activos / Componentes</th>
                <th class="white-space-nowrap align-middle text-900" scope="col">N° Lote</th>
                <th class="white-space-nowrap align-middle text-end text-900 pe-3" scope="col">Existencia</th>
                <th class="white-space-nowrap align-middle text-900 ps-3 border-start border-200" scope="col">Vencimiento</th>
                <th class="white-space-nowrap align-middle text-center text-900" scope="col">Semáforo</th>
                <th class="white-space-nowrap align-middle text-end pe-4 text-900" scope="col" style="width: 100px">Acciones</th>
              </tr>
            </thead>
            <tbody class="list">
              <ng-container *ngIf="isLoading">
                <tr [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 200) + 'ms'" class="anim-slide-right" *ngFor="let i of [1,2,3,4,5,6,7,8,9,10]; let idx = index">
                  <td class="ps-4 py-3"><div class="skeleton skeleton-text-lg"></div></td>
                  <td class="py-3"><div class="skeleton skeleton-text" style="width: 90%"></div></td>
                  <td class="py-3"><div class="skeleton skeleton-text" style="width: 70%"></div></td>
                  <td class="py-3 text-end pe-3"><div class="skeleton skeleton-text" style="width: 50%; margin-left: auto"></div></td>
                  <td class="py-3 ps-3 border-start border-200"><div class="skeleton skeleton-text" style="width: 60%"></div></td>
                  <td class="py-3 text-center"><div class="skeleton skeleton-rounded" style="height: 20px; width: 80px; margin: 0 auto"></div></td>
                </tr>
              </ng-container>

              <ng-container *ngIf="!isLoading">
                <tr [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 200) + 'ms'" class="anim-slide-right" *ngFor="let item of inventario; let idx = index">
                  <td class="align-middle fw-bold text-body-emphasis ps-4">
                    <div class="text-uppercase">{{ item.medicamento_detallado.split(' - ')[0] }}</div>
                    <div class="text-600 fs--2 fw-normal">{{ item.nombre_presentacion }}</div>
                  </td>
                  <td class="align-middle text-600">
                    <div class="d-flex flex-wrap gap-1" *ngIf="item.componentes_json?.length; else sinComponentes">
                      <span class="badge badge-phoenix badge-phoenix-secondary fs--2" *ngFor="let comp of item.componentes_json">
                        {{ comp.nombre_principio }} {{ comp.concentracion_valor }} {{ comp.nombre_unidad }}
                      </span>
                    </div>
                    <ng-template #sinComponentes>
                      <span class="text-500 fs--2">Sin principios activos</span>
                    </ng-template>
                  </td>
                  <td class="align-middle text-nowrap">
                    <code class="text-700 fs--2 bg-200 px-2 py-1 rounded">{{ item.numero_lote }}</code>
                  </td>
                  <td class="align-middle text-end fw-bolder text-nowrap pe-3" [class.text-danger]="item.cantidad_actual === 0">
                    {{ item.cantidad_actual | number }}
                  </td>
                  <td class="align-middle fw-semi-bold text-nowrap ps-3 border-start border-200"
                      [class.text-danger]="item.color_clase === 'danger'"
                      [class.text-warning]="item.color_clase === 'warning'"
                      [class.text-success]="item.color_clase === 'success'">
                    {{ item.fecha_vencimiento | date:'dd/MM/yyyy' }}
                  </td>
                  <td class="align-middle text-center text-nowrap">
                    <span class="badge badge-phoenix fs--2"
                      [class.badge-phoenix-success]="item.color_clase === 'success'"
                      [class.badge-phoenix-warning]="item.color_clase === 'warning'"
                      [class.badge-phoenix-danger]="item.color_clase === 'danger'"
                      [class.badge-phoenix-secondary]="item.color_clase === 'secondary'">
                      {{ item.estado_logico }}
                    </span>
                  </td>
                  <td class="align-middle text-end pe-4 text-nowrap">
                    <div class="d-flex justify-content-end gap-2 flex-nowrap">
                      <button *ngIf="esOperativo()"
                        class="btn btn-phoenix-secondary btn-sm p-1 px-2" 
                        title="Editar Lote"
                        (click)="editar(item)">
                        <span class="fas fa-edit"></span>
                      </button>
                      <button *ngIf="(item.estado_logico === 'VENCIDO' || item.estado_logico === 'AGOTADO') && esOperativo()" 
                        class="btn btn-phoenix-danger btn-sm p-1 px-2" 
                        title="Dar de baja (Egreso)"
                        (click)="egresar(item)">
                        <span class="fas fa-trash-alt"></span>
                      </button>
                    </div>
                  </td>
                </tr>
              </ng-container>
              <tr *ngIf="inventario.length === 0 && !isLoading">
                <td colspan="7" class="text-center py-5">
                  <span class="fas fa-box-open fs-3 text-300 d-block mb-3"></span>
                  <p class="text-700 mb-0">No se encontraron registros</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer border-top border-300 py-3" *ngIf="!isLoading && totalItems > 0">
        <div class="d-flex align-items-center justify-content-between">
          <p class="mb-0 fs--1 text-700">Mostrando {{ inventario.length }} de {{ totalItems }} registros</p>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="currentPage <= 5">
                <button class="page-link" (click)="actualizarPaginacion(currentPage - 5)" title="Anteriores 5">
                  <span class="fas fa-angle-double-left"></span>
                </button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === 1">
                <button class="page-link" (click)="paginar(currentPage - 1)">
                  <span class="fas fa-chevron-left"></span>
                </button>
              </li>
              <li *ngFor="let p of pageNums" class="page-item" [class.active]="p === currentPage">
                <button class="page-link" (click)="paginar(p)">{{ p }}</button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === totalPages">
                <button class="page-link" (click)="paginar(currentPage + 1)">
                  <span class="fas fa-chevron-right"></span>
                </button>
              </li>
              <li class="page-item" [class.disabled]="pageNums.length > 0 && pageNums[pageNums.length - 1] >= totalPages">
                <button class="page-link" (click)="actualizarPaginacion(currentPage + 5)" title="Siguientes 5">
                  <span class="fas fa-angle-double-right"></span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  
    </div>
  `
})
export class InventarioComponent implements OnInit {
  inventario: LoteInventario[] = [];
  presentaciones: { id: number; nombre: string }[] = [];
  isLoading = false;
  estado = ''; 
  busqueda = ''; 
  presentacion = ''; 
  ordering = '';
  totalExistencia = 0;
  totalGeneralExistencia = 0;
  currentPage = 1; 
  totalPages = 1;  
  totalItems = 0;
  pageNums: number[] = [];

  private busquedaSubject = new Subject<string>();

  constructor(
    private svc: InventarioService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private authSvc: AuthService
  ) {}

  ngOnInit(): void {
    this.svc.getPresentacionesFiltro().subscribe(d => this.presentaciones = d);
    this.cargar();

    this.busquedaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(q => {
      this.busqueda = q;
      this.currentPage = 1;
      this.cargar();
    });
  }

  cargar(): void {
    this.isLoading = true;
    this.svc.getInventario({ 
      page: this.currentPage, 
      page_size: 15, 
      estado: this.estado, 
      presentacion: this.presentacion, 
      busqueda: this.busqueda,
      ordering: this.ordering 
    }).subscribe({
      next: r => {
        this.inventario = r.results;
        this.totalItems = r.count;
        this.totalPages = Math.ceil(r.count / 15);
        this.pageNums = Array.from({ length: Math.min(5, this.totalPages) }, (_, i) => i + 1);
        
        // Existencia Filtrado (Suma de lo que hay en la tabla actualmente)
        this.totalExistencia = this.inventario.reduce((acc, curr) => acc + curr.cantidad_actual, 0);
        
        // Existencia Global (Viene del backend)
        this.totalGeneralExistencia = r.total_general_existencia || 0;

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onBusqueda(e: Event): void {
    const q = (e.target as HTMLInputElement).value;
    this.busquedaSubject.next(q);
  }

  onEstado(e: Event): void {
    this.estado = (e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.cargar();
  }

  onPresentacion(e: Event): void {
    this.presentacion = (e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.cargar();
  }

  toggleOrden(tipo: 'existencia' | 'venc' | 'alpha'): void {
    if (tipo === 'existencia') {
      this.ordering = this.ordering === 'existencia_asc' ? 'existencia_desc' : 'existencia_asc';
    } else if (tipo === 'venc') {
      this.ordering = this.ordering === 'venc_asc' ? 'venc_desc' : 'venc_asc';
    } else if (tipo === 'alpha') {
      this.ordering = this.ordering === 'alpha_asc' ? 'alpha_desc' : 'alpha_asc';
    }
    this.currentPage = 1;
    this.cargar();
  }

  limpiarTodo(): void {
    this.estado = '';
    this.busqueda = '';
    this.presentacion = '';
    this.ordering = '';
    this.currentPage = 1;
    this.cargar();
  }

  paginar(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.cargar();
  }

  actualizarPaginacion(nuevaPagina: number): void {
    if (nuevaPagina < 1) nuevaPagina = 1;
    if (nuevaPagina > this.totalPages) nuevaPagina = this.totalPages;
    this.currentPage = nuevaPagina;
    
    // Calculate new block of 5
    const bloqueActual = Math.floor((this.currentPage - 1) / 5);
    const startPage = bloqueActual * 5 + 1;
    const endPage = Math.min(startPage + 4, this.totalPages);
    
    this.pageNums = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pageNums.push(i);
    }
    
    this.cargar();
  }

  esOperativo(): boolean {
    return this.authSvc.hasRole('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO');
  }

  egresar(lote: LoteInventario): void {
    const motivo = lote.estado_logico === 'AGOTADO' ? 'agotamiento' : 'vencimiento';
    Swal.fire({
      title: '¿Confirmar Egreso?',
      text: `Se dará de baja el lote ${lote.numero_lote} por motivo de ${motivo}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja'
    }).then(result => {
      if (result.isConfirmed) {
        this.svc.egresarLote(lote.id_lote).subscribe(() => {
          Swal.fire('¡Egreso Exitoso!', '', 'success');
          this.cargar();
        });
      }
    });
  }

  limpiarFiltrosSolo(): void {
    this.estado = '';
    this.presentacion = '';
    this.ordering = '';
    this.currentPage = 1;
    this.cargar();
  }

  editar(lote: LoteInventario): void {
    const today = new Date().toISOString().split('T')[0];
    const isAgotado = lote.cantidad_actual === 0;

    Swal.fire({
      title: `Editar Lote: ${lote.numero_lote}`,
      html: `
        <div class="text-start">
          <label class="form-label fs--1">Existencia Actual</label>
          <input id="swal-input1" class="form-control mb-3" type="number" min="${isAgotado ? '0' : '1'}" max="20000" step="1" maxlength="5" value="${lote.cantidad_actual}" onkeydown="return !['e', 'E', '+', '-', '.', ','].includes(event.key)" ${isAgotado ? 'readonly disabled' : ''}>
          <div class="form-text fs--2 text-danger mb-3 mt-0" style="display: none;" id="swal-error-cant"></div>
          
          <label class="form-label fs--1">Fecha de Vencimiento <span class="text-danger">*</span></label>
          <input id="swal-input2" class="form-control" type="date" min="${today}" value="${lote.fecha_vencimiento}" required>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        const input1 = document.getElementById('swal-input1') as HTMLInputElement;
        const cantStr = input1.value;
        const fecha = (document.getElementById('swal-input2') as HTMLInputElement).value;
        const cant = Number(cantStr);
        
        if (!isAgotado && (!cantStr || isNaN(cant) || cant <= 0)) {
          Swal.showValidationMessage('La existencia debe ser mayor a 0. Si desea dejarla en 0, elimine (egrese) el lote a la papelera.');
          return false;
        }
        
        if (cant > 20000) {
          Swal.showValidationMessage('La existencia no puede superar las 20000 unidades');
          return false;
        }
        
        if (!fecha) {
          Swal.showValidationMessage('La fecha de vencimiento es obligatoria.');
          return false;
        }
        
        if (fecha < today) {
          Swal.showValidationMessage('La fecha de vencimiento debe ser vigente (igual o mayor a hoy).');
          return false;
        }
        
        return { cantidad: isAgotado ? 0 : cant, fecha_vencimiento: fecha };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.svc.editarLote(lote.id_lote, result.value).subscribe(() => {
          Swal.fire('¡Actualizado!', '', 'success');
          this.cargar();
        });
      }
    });
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
}
