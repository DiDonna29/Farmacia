import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DespachoService } from '../../core/services/despacho.service';
import { SwalService } from '../../core/services/swal.service';
import { DespachoHistorial } from '../../core/models/farmacia.models';
import { FormsModule } from '@angular/forms';
import { CedulaPipe } from '../../shared/pipes/cedula.pipe';

interface DespachoAgrupado {
  folio: string;
  fecha: string;
  beneficiario_cedula: number;
  beneficiario_nombre: string;
  beneficiario_correo: string;
  beneficiario_telefono: string;
  beneficiario_parentesco: string;
  titular_nombre: string;
  titular_cedula: string;
  farmaceuta_nombre: string;
  farmaceuta_ci: string;
  items: DespachoHistorial[];
  total_unidades: number;
  observaciones: string;
  medico_tratante?: string;
  especialidad?: string;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, CedulaPipe],
  template: `
    <div class="mb-5">
      <div class="row g-3 justify-content-between align-items-center">
        <div class="col-auto">
          <h2 class="mb-1 text-1100 fw-bolder">Historial de Despachos</h2>
          <p class="mb-0 text-700 fw-semi-bold">Auditoría completa y trazabilidad de medicamentos entregados.</p>
        </div>
        <div class="col-auto">
          <button class="btn btn-phoenix-primary btn-sm px-4 shadow-sm" (click)="toggleFiltros()">
            <span class="fas" [class.fa-filter]="!mostrarFiltros" [class.fa-chevron-up]="mostrarFiltros"></span>
            {{ mostrarFiltros ? 'Ocultar Filtros' : 'Filtros Avanzados' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card shadow-none border border-300 mb-4 overflow-hidden" [class.d-none]="!mostrarFiltros" style="border-left: 4px solid var(--phoenix-primary) !important;">
      <div class="card-body bg-body-tertiary p-3">
        <div class="row g-3">
          <div class="col-md-3">
             <label class="form-label fs--2 fw-bold text-uppercase">Desde</label>
             <input type="date" class="form-control form-control-sm" [(ngModel)]="desde" [min]="minDate" [max]="maxDate"/>
          </div>
          <div class="col-md-3">
             <label class="form-label fs--2 fw-bold text-uppercase">Hasta</label>
             <input type="date" class="form-control form-control-sm" [(ngModel)]="hasta" [min]="minDate" [max]="maxDate"/>
          </div>
          <div class="col-md-3">
             <label class="form-label fs--2 fw-bold text-uppercase">Cédula</label>
             <input type="text" class="form-control form-control-sm" placeholder="Beneficiario..." [(ngModel)]="filtroCedula"/>
          </div>
          <div class="col-md-3">
             <label class="form-label fs--2 fw-bold text-uppercase">Folio #</label>
             <input type="text" class="form-control form-control-sm" placeholder="ID Despacho..." [(ngModel)]="filtroFolio"/>
          </div>
          <div class="col-12 text-end pt-2 border-top border-200 mt-2">
            <button class="btn btn-link btn-sm text-danger me-3" (click)="limpiar()"><span class="fas fa-brush me-1"></span>Limpiar</button>
            <button class="btn btn-primary btn-sm px-5" (click)="buscarRegistros()">Buscar Registros</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista -->
    <div class="row g-3">
      <!-- Skeleton Loader -->
      <div class="col-12" *ngIf="isLoading && grupos.length === 0">
        <div class="card border border-300 shadow-sm mb-4 placeholder-glow" *ngFor="let i of [1, 2, 3]">
          <div class="card-header bg-body-tertiary py-3 border-bottom">
            <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div class="d-flex flex-wrap flex-grow-1 gap-3 gap-md-4">
                
                <div class="border-end-md border-300 pe-md-3" style="min-width: 120px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold"><span class="placeholder col-8 rounded"></span></div>
                  <div class="fs-0 mt-1"><span class="placeholder col-10 rounded"></span></div>
                </div>
                
                <div class="border-end-md border-300 pe-md-3" style="min-width: 130px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold"><span class="placeholder col-8 rounded"></span></div>
                  <div class="fs--1 mt-1"><span class="placeholder col-12 rounded"></span></div>
                </div>

                <div class="border-end-md border-300 pe-md-3" style="width: 200px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold"><span class="placeholder col-7 rounded"></span></div>
                  <div class="fs-0 mt-1 mb-1"><span class="placeholder col-10 rounded"></span><br><span class="placeholder col-8 rounded mt-1"></span></div>
                  <div><span class="placeholder col-5 rounded"></span></div>
                </div>

                <div class="border-end-md border-300 pe-md-3" style="width: 200px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold"><span class="placeholder col-8 rounded"></span></div>
                  <div class="fs-0 mt-1 mb-1"><span class="placeholder col-11 rounded"></span><br><span class="placeholder col-6 rounded mt-1"></span></div>
                  <div><span class="placeholder col-4 rounded me-1"></span> <span class="placeholder col-6 rounded"></span></div>
                </div>

                <div style="width: 180px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold"><span class="placeholder col-7 rounded"></span></div>
                  <div class="fs--1 mt-1 mb-1"><span class="placeholder col-10 rounded"></span><br><span class="placeholder col-8 rounded mt-1"></span></div>
                  <div><span class="placeholder col-6 rounded"></span></div>
                </div>
              </div>

              <div class="mt-2 mt-lg-0 pt-2 pt-lg-0 border-top border-top-lg-0 border-300 text-end flex-shrink-0">
                 <button class="btn btn-phoenix-secondary btn-sm w-100 disabled placeholder rounded" style="min-width: 100px; height: 32px;"></button>
              </div>
            </div>
          </div>
          
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm mb-0 fs--1">
                <thead class="bg-body-secondary border-bottom border-200">
                  <tr>
                    <th class="ps-4"><span class="placeholder col-6 rounded"></span></th>
                    <th><span class="placeholder col-5 rounded"></span></th>
                    <th><span class="placeholder col-4 rounded"></span></th>
                    <th class="text-end pe-4"><span class="placeholder col-8 rounded"></span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="ps-4 py-3 align-middle">
                      <div class="fs-0 mb-1"><span class="placeholder col-5 rounded"></span></div>
                      <div><span class="placeholder col-4 rounded"></span></div>
                    </td>
                    <td class="align-middle"><span class="placeholder col-8 rounded"></span></td>
                    <td class="align-middle"><span class="placeholder col-6 rounded"></span></td>
                    <td class="align-middle text-end pe-4 fs-0"><span class="placeholder col-2 rounded"></span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-body-tertiary border-top py-2 px-4">
             <div class="row align-items-center">
               <div class="col-8">
                 <div class="fs--2 text-600 text-uppercase fw-bold mb-1"><span class="placeholder col-2 rounded"></span></div>
                 <div class="d-flex align-items-center">
                   <div style="width: 2px; height: 16px; background-color: var(--phoenix-primary); margin-right: 8px;"></div>
                   <span class="placeholder col-6 rounded"></span>
                 </div>
               </div>
               <div class="col-4 text-end">
                 <div class="fs--2 text-600 text-uppercase fw-bold mb-1"><span class="placeholder col-6 rounded"></span></div>
                 <div class="fs--2"><span class="placeholder col-8 rounded"></span><br><span class="placeholder col-5 rounded mt-1"></span></div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div class="col-12" *ngFor="let g of gruposPaginados">
        <div class="card border border-300 shadow-sm mb-4">
          <div class="card-header bg-body-tertiary py-3 border-bottom">
            <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div class="d-flex flex-wrap flex-grow-1 gap-3 gap-md-4">
                <!-- Folio -->
                <div class="border-end-md border-300 pe-md-3" style="min-width: 120px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold">Folio Acta</div>
                  <div class="fw-bolder text-primary fs-0">#{{ g.folio.toString().slice(0,8) | uppercase }}</div>
                </div>
                
                <!-- Fecha -->
                <div class="border-end-md border-300 pe-md-3" style="min-width: 130px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold">Fecha / Hora</div>
                  <div class="text-800 fw-bold fs--1">{{ g.fecha | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>

                <!-- Titular -->
                <div class="border-end-md border-300 pe-md-3" style="width: 200px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold">Titular Responsable</div>
                  <div class="text-1000 fw-bold fs-0 mb-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; min-height: 2.4em; line-height: 1.2;" [title]="g.titular_nombre || 'N/A'">{{ g.titular_nombre || 'N/A' }}</div>
                  <span class="badge badge-phoenix badge-phoenix-info fs--2">C.I: {{ g.titular_cedula | cedula }}</span>
                </div>

                <!-- Beneficiario -->
                <div class="border-end-md border-300 pe-md-3" style="width: 200px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold">Beneficiario Final</div>
                  <div class="text-1000 fw-bold fs-0 mb-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; min-height: 2.4em; line-height: 1.2;" [title]="g.beneficiario_nombre">
                    {{ g.beneficiario_nombre }}
                  </div>
                  <div class="d-flex flex-wrap gap-1 align-items-center">
                    <span class="badge badge-phoenix fs--2"
                          [ngClass]="g.beneficiario_parentesco === 'TITULAR' ? 'badge-phoenix-secondary' : 'badge-phoenix-warning'">
                      {{ g.beneficiario_parentesco }}
                    </span>
                    <span class="badge badge-phoenix badge-phoenix-info fs--2"
                          *ngIf="g.beneficiario_parentesco !== 'TITULAR'">
                      C.I / Cert: {{ g.beneficiario_cedula | cedula }}
                    </span>
                  </div>
                </div>

                <!-- Farmaceuta (solo nombre, sin CI en vista pública) -->
                <div style="width: 180px;">
                  <div class="fs--2 text-600 text-uppercase fw-bold">Entregado por</div>
                  <div class="text-800 fw-bold fs--1 mb-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; min-height: 2.8em; line-height: 1.4;" [title]="g.farmaceuta_nombre">{{ g.farmaceuta_nombre }}</div>
                  <span class="badge badge-phoenix badge-phoenix-secondary fs--2">C.I: {{ g.farmaceuta_ci | cedula }}</span>
                </div>
              </div>

              <!-- Botón PDF -->
              <div class="mt-2 mt-lg-0 pt-2 pt-lg-0 border-top border-top-lg-0 border-300 text-end flex-shrink-0">
                <button class="btn btn-phoenix-secondary btn-sm w-100" style="min-width: 100px;" (click)="imprimirComprobante(g.folio)">
                  <span class="fas fa-print me-1"></span>PDF
                </button>
              </div>
            </div>
          </div>
          
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0 fs--1">
                <thead class="bg-body-secondary border-bottom border-200">
                  <tr>
                    <th class="ps-4">Medicamento / Presentación</th>
                    <th>Principios Activos / Componentes</th>
                    <th>Lote</th>
                    <th class="text-end pe-4">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of g.items">
                    <td class="ps-4 py-3">
                      <div class="fw-bold text-1000 fs-0">{{ item.nombre_generico }}</div>
                      <div class="text-600 fs--2 mt-1">{{ item.nombre_presentacion }}</div>
                    </td>
                    <td class="align-middle">
                      <!-- Mostrar Componentes -->
                      <div class="text-600 fs--2" *ngIf="item.componentes_json && item.componentes_json.length > 0">
                        <span *ngFor="let comp of item.componentes_json; let last = last">
                          {{ comp.nombre_principio }} 
                          <span *ngIf="comp.concentracion_valor">{{ comp.concentracion_valor }}</span> 
                          <span *ngIf="comp.nombre_unidad">{{ comp.nombre_unidad }}</span><span *ngIf="!last">, </span>
                        </span>
                      </div>
                      <div class="text-warning fs--2" *ngIf="!item.componentes_json || item.componentes_json.length === 0">
                        Sin componentes
                      </div>
                    </td>
                    <td class="align-middle"><code>{{ item.numero_lote }}</code></td>
                    <td class="align-middle text-end pe-4 fw-bold text-primary fs-1">{{ item.cantidad_despachada }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="p-3 bg-body-tertiary border-top">
                <div class="row g-3">
                  <div class="col-md-8" *ngIf="g.observaciones">
                    <div class="fs--2 text-700 fw-bold text-uppercase mb-1">Notas del despacho:</div>
                    <div class="text-800 fs--1 border-start border-primary border-3 ps-3 italic">{{ g.observaciones }}</div>
                  </div>
                  <div class="col-md-4 text-end" *ngIf="g.medico_tratante">
                    <div class="fs--2 text-700 fw-bold text-uppercase mb-1">Médico / Especialidad:</div>
                    <div class="text-800 fs--1 fw-bold">{{ g.medico_tratante }}</div>
                    <div class="text-600 fs--2 text-uppercase">{{ g.especialidad || 'General' }}</div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado Vacío -->
      <div class="col-12 py-5 text-center" *ngIf="grupos.length === 0 && !isLoading">
        <span class="fas fa-folder-open fs-4 text-300 mb-2"></span>
        <h4 class="text-800">No se encontraron registros</h4>
      </div>

      <!-- Paginación -->
      <div class="col-12 mt-4" *ngIf="grupos.length > 0 && !isLoading">
        <div class="d-flex justify-content-center align-items-center gap-3">
          <button class="btn btn-phoenix-secondary btn-sm" [disabled]="paginaActual === 1" (click)="irPagina(paginaActual - 1)">
            <span class="fas fa-chevron-left me-1"></span>Anterior
          </button>
          
          <div class="d-flex align-items-center gap-2">
            <span class="fs--1 text-700">Página <strong>{{ paginaActual }}</strong> de {{ totalPaginas }}</span>
            <span class="fs--2 text-600">({{ totalRegistros }} registros totales)</span>
          </div>

          <button class="btn btn-phoenix-secondary btn-sm" [disabled]="paginaActual === totalPaginas" (click)="irPagina(paginaActual + 1)">
            Siguiente<span class="fas fa-chevron-right ms-1"></span>
          </button>
        </div>

        <!-- Números de página -->
        <div class="d-flex justify-content-center flex-wrap gap-2 mt-3 align-items-center">
          <button class="btn btn-sm btn-outline-secondary px-2" *ngIf="paginas[0] > 1" (click)="retrocederDiez()" title="Retroceder 10 páginas">
            <span class="fas fa-angle-double-left"></span>
          </button>

          <button 
            *ngFor="let p of paginas" 
            class="btn btn-sm btn-page-number" 
            [ngClass]="p === paginaActual ? 'btn-primary shadow-sm' : 'btn-outline-phoenix'"
            (click)="irPagina(p)"
          >
            {{ p }}
          </button>

          <button class="btn btn-sm btn-outline-secondary px-2" *ngIf="paginas[paginas.length - 1] < totalPaginas" (click)="adelantarDiez()" title="Avanzar 10 páginas">
            <span class="fas fa-angle-double-right"></span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .italic { font-style: italic; }
  `]
})
export class HistorialComponent implements OnInit, OnDestroy {
  private despachoService = inject(DespachoService);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  grupos: DespachoAgrupado[] = [];
  isLoading = false;
  mostrarFiltros = false;
  private reqSub?: Subscription;

  // Filtros
  desde = '';
  hasta = '';
  busqueda = '';
  filtroCedula = '';
  filtroFolio = '';
  filtroFarma = '';

  // Paginación (Backend)
  paginaActual = 1;
  totalRegistros = 0;
  itemsPorPagina = 5;

  // Fechas limites
  minDate = '';
  maxDate = '';

  ngOnInit(): void {
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    const format = (d: Date) => {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    
    this.minDate = (hoy.getFullYear() - 5) + '-01-01';
    this.maxDate = format(hoy);
    
    this.desde = format(ayer);
    this.hasta = format(hoy);
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.reqSub) {
      this.reqSub.unsubscribe();
    }
    this.swal.close();
  }

  toggleFiltros(): void { this.mostrarFiltros = !this.mostrarFiltros; }

  limpiar(): void {
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    const format = (d: Date) => {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    this.busqueda = '';
    this.filtroCedula = '';
    this.filtroFolio = '';
    this.filtroFarma = '';
    this.desde = format(ayer);
    this.hasta = format(hoy);
    this.paginaActual = 1;
    this.cargar();
  }

  buscarRegistros(): void {
    this.paginaActual = 1;
    if ((this.filtroCedula || '').trim() || (this.filtroFolio || '').trim()) {
      const hoy = new Date();
      const haceUnAno = new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
      const format = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      };
      this.desde = format(haceUnAno);
      this.hasta = format(hoy);
    }
    this.cargar();
  }

  cargar(): void {
    this.isLoading = true;
    this.swal.loadingToast('Cargando historial de despachos...');

    if (this.reqSub) {
      this.reqSub.unsubscribe();
    }

    this.reqSub = this.despachoService.getHistorial({
      desde: this.desde,
      hasta: this.hasta,
      busqueda: this.busqueda,
      cedula: this.filtroCedula,
      folio: this.filtroFolio,
      farmaceutico: this.filtroFarma,
      page: this.paginaActual
    }).pipe(finalize(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    })).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.totalRegistros = res.count || res.results.length;
          this.grupos = this.agrupar(res.results);
        } else if (Array.isArray(res)) {
          this.totalRegistros = res.length;
          this.grupos = this.agrupar(res);
        } else {
          this.grupos = [];
          this.totalRegistros = 0;
        }
      },
      error: () => this.swal.error('Error', 'No se pudo cargar el historial.')
    });
  }

  agrupar(data: DespachoHistorial[]): DespachoAgrupado[] {
    const mapa = new Map<string, DespachoAgrupado>();
    data.forEach(item => {
      const key = item.folio_grupo || item.orden_id;
      if (!mapa.has(key)) {
        mapa.set(key, {
          folio: key,
          fecha: item.fecha_hora,
          beneficiario_cedula: item.cedula_beneficiario,
          beneficiario_nombre: item.nombre_beneficiario || 'NO IDENTIFICADO',
          beneficiario_correo: (item as any).correo_beneficiario || '',
          beneficiario_telefono: (item as any).telefono_beneficiario || '',
          beneficiario_parentesco: (item as any).parentesco_beneficiario || 'TITULAR',
          titular_nombre: (item as any).titular_nombre || '',
          titular_cedula: (item as any).titular_cedula || '',
          farmaceuta_nombre: item.farmaceuta_nombre,
          farmaceuta_ci: item.farmaceuta_ci || '',
          items: [],
          total_unidades: 0,
          observaciones: item.observaciones || '',
          medico_tratante: item.medico_tratante,
          especialidad: item.especialidad
        });
      }
      mapa.get(key)!.items.push(item);
      mapa.get(key)!.total_unidades += item.cantidad_despachada;
    });
    return Array.from(mapa.values());
  }

  get totalPaginas(): number { return Math.ceil(this.totalRegistros / this.itemsPorPagina); }
  get gruposPaginados(): DespachoAgrupado[] { return this.grupos; } 
  
  get paginas(): number[] {
    const total = this.totalPaginas;
    if (total <= 1) return [];
    
    const maxVisible = 10;
    let start = Math.max(1, this.paginaActual - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  retrocederDiez(): void {
    this.irPagina(Math.max(1, this.paginaActual - 10));
  }

  adelantarDiez(): void {
    this.irPagina(Math.min(this.totalPaginas, this.paginaActual + 10));
  }

  irPagina(p: number): void { 
    if (p >= 1 && p <= this.totalPaginas) {
      this.paginaActual = p;
      this.cargar();
      window.scrollTo(0, 0);
    }
  }

  imprimirComprobante(folio: string): void {
    this.despachoService.generarPDF(folio).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url);
      },
      error: () => this.swal.error('Error', 'No se pudo generar el comprobante PDF.')
    });
  }
}
