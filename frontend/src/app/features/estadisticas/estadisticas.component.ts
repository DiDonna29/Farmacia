import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadisticasService } from '../../core/services/estadisticas.service';
import { EstadisticasResumen, EstadoChart, EvolucionTemporal } from '../../core/models/farmacia.models';
import { Chart, registerables } from 'chart.js';
import { SwalService } from '../../core/services/swal.service';
import { forkJoin, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Header -->
    <div class="mb-4">
      <h2 class="mb-1 text-1100">Reportes y Gráficas</h2>
      <h5 class="text-700 fw-semi-bold">Análisis profundo del rendimiento operativo y balance de inventario</h5>
    </div>

    <!-- Filtros de Control -->
    <div class="card shadow-none border border-300 mb-4 bg-body-tertiary">
      <div class="card-body p-3">
        <div class="row g-3 align-items-end">
          
          <div class="col-12 col-lg-auto">
            <label class="form-label fs--2 fw-bold text-700 text-uppercase mb-1">Rango de Consulta</label>
            <div class="d-flex align-items-center gap-2">
              <input type="date" class="form-control form-control-sm flex-grow-1" [(ngModel)]="desde" (change)="onFechaChange()" [min]="minDate" [max]="maxDate" style="max-width: 140px;"/>
              <span class="text-600 fs--2">al</span>
              <input type="date" class="form-control form-control-sm flex-grow-1" [(ngModel)]="hasta" (change)="onFechaChange()" [min]="minDate" [max]="maxDate" style="max-width: 140px;"/>
            </div>
          </div>

          <div class="col-12 col-lg-auto border-start-lg ps-lg-3">
            <label class="form-label fs--2 fw-bold text-700 text-uppercase mb-1">Filtro Rápido</label>
            <div class="d-flex gap-1 flex-wrap">
              <button *ngFor="let p of periodos" class="btn btn-xs px-2"
                [class.btn-phoenix-primary]="filtroPeriodo === p.key"
                [class.btn-outline-secondary]="filtroPeriodo !== p.key"
                (click)="periodoRapido(p.key)">{{ p.label }}</button>
            </div>
          </div>

          <div class="col-12 col-lg-auto border-start-lg ps-lg-3">
            <label class="form-label fs--2 fw-bold text-700 text-uppercase mb-1">Vista de Análisis</label>
            <div class="btn-group btn-group-sm w-100">
               <button class="btn" [class.btn-phoenix-primary]="modo === 'medicamentos'" (click)="cambiarModo('medicamentos')">
                 <span class="fas fa-pills me-1"></span>Medicamentos
               </button>
               <button class="btn" [class.btn-phoenix-primary]="modo === 'lotes'" (click)="cambiarModo('lotes')">
                 <span class="fas fa-barcode me-1"></span>Lotes
               </button>
            </div>
          </div>

          <div class="col-12 col-xl-auto ms-xl-auto mt-3 mt-xl-0 d-flex gap-2">
            <button class="btn btn-sm btn-phoenix-secondary flex-grow-1 flex-xl-grow-0" (click)="limpiarFiltros()" [disabled]="isLoading" style="white-space: nowrap;">
              <span class="fas fa-brush me-1"></span>Limpiar
            </button>
            <button class="btn btn-sm btn-phoenix-primary flex-grow-1 flex-xl-grow-0" (click)="cargarTodo()" [disabled]="isLoading" style="white-space: nowrap;">
              <span class="fas fa-sync-alt me-1" [class.fa-spin]="isLoading"></span>Sincronizar
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Panel de Exportación Pro -->
    <div class="card border border-primary border-opacity-25 bg-primary-subtle shadow-none">
      <div class="card-body p-4">
         <div class="row g-3 align-items-center">
            <div class="col-12 col-xl-auto">
               <h5 class="mb-1"><span class="fas fa-file-export me-2"></span>Generador de Reportes Ejecutivos</h5>
               <p class="fs--2 text-700 mb-0">Seleccione el formato y tipo de auditoría para exportar la data filtrada.</p>
            </div>
            <div class="col-12 col-md-6 col-xl-3">
               <select class="form-select form-select-sm" [(ngModel)]="tipoExport">
                  <option value="despachos">Registro General de Despachos (Histórico)</option>
                  <option value="inventario">Estado de Existencia Actual (Inventario)</option>
                  <option value="ingresos">Auditoría de Ingresos/Dotaciones</option>
                  <option value="top_medicamentos">Medicamentos más despachados</option>
               </select>
            </div>
            <div class="col-12 col-md-6 col-xl-2">
               <select class="form-select form-select-sm" [(ngModel)]="departamento" (change)="cargarTodo()">
                  <option value="ambos">Ambos Departamentos</option>
                  <option value="farmacia">Farmacia</option>
                  <option value="proveeduria">Proveeduría</option>
               </select>
            </div>
            <div class="col-12 col-xl-auto ms-xl-auto d-flex gap-2">
              <!-- Se comenta el boton CSV para que el usuario no se confunda con este formato -->
               <!-- <button class="btn btn-sm btn-phoenix-secondary flex-grow-1 flex-xl-grow-0" (click)="descargar('csv')" [disabled]="exportando">
                  <span class="fas fa-file-csv me-1"></span>CSV
               </button> -->
               <button class="btn btn-sm btn-phoenix-success flex-grow-1 flex-xl-grow-0" (click)="descargar('excel')" [disabled]="exportando">
                  <span class="fas fa-file-excel me-1"></span>EXCEL
               </button>
               <button class="btn btn-sm btn-danger flex-grow-1 flex-xl-grow-0" (click)="descargar('pdf')" [disabled]="exportando">
                  <span class="fas fa-file-pdf me-1"></span>PDF
               </button>
            </div>
         </div>
      </div>
    </div>

    <!-- KPIs de Alto Nivel -->
    <div class="row mt-3 g-3 mb-4">
      <div class="col-6 col-md-3" *ngFor="let kpi of kpis">
        <div class="card h-100 border border-300 shadow-none overflow-hidden">
          <div class="card-body p-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
               <div class="bg-primary-subtle p-2 rounded-2 text-primary">
                  <span class="fas fs-1" [class]="kpi.icon"></span>
               </div>
               <span class="badge badge-phoenix fs--2" [class.badge-phoenix-success]="kpi.trend === 'up'" [class.badge-phoenix-info]="kpi.trend === 'stable'">
                  <span class="fas me-1" [class.fa-chart-line]="kpi.trend === 'up'" [class.fa-minus]="kpi.trend === 'stable'"></span>Balance
               </span>
            </div>
            <p class="fs--2 fw-bold text-700 text-uppercase mb-1">{{ kpi.label }}</p>
            <h3 class="mb-0 fw-bolder">{{ (isLoading ? 0 : kpi.value) | number }}</h3>
            <div class="progress mt-2" style="height: 4px;">
               <div class="progress-bar bg-primary" [style.width]="'70%'"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de Gráficos Principales -->
    <div class="row g-4 mb-4">
      <!-- Balance de Movimiento -->
      <div class="col-12 col-xxl-8">
        <div class="card h-100 border border-300 shadow-none">
          <div class="card-header border-bottom border-300 d-flex justify-content-between align-items-center py-3 px-4">
            <h5 class="mb-0">Flujo de {{ modo === 'medicamentos' ? 'Unidades Totales' : 'Movimiento de Lotes' }} (Entradas vs Salidas)</h5>
            <div class="d-flex gap-2">
               <div class="d-flex align-items-center gap-1"><span class="dot bg-primary"></span><span class="fs--2 text-700">Ingresos</span></div>
               <div class="d-flex align-items-center gap-1"><span class="dot bg-warning"></span><span class="fs--2 text-700">Egresos</span></div>
            </div>
          </div>
          <div class="card-body p-4">
            <div style="height: 350px; position: relative;">
               <canvas #evolucionChart></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado Actual Donut -->
      <div class="col-12 col-md-6 col-xxl-4">
        <div class="card h-100 border border-300 shadow-none">
          <div class="card-header border-bottom border-300 py-3 px-4">
            <h5 class="mb-0">Balance de Inventario Actual</h5>
          </div>
          <div class="card-body d-flex flex-column justify-content-center p-4">
            <div style="height: 250px; position: relative;" class="mb-3">
               <canvas #estadoChart></canvas>
            </div>
            <div class="row g-2" *ngIf="!isLoading && estadoData.length > 0">
               <div class="col-6" *ngFor="let st of estadoData">
                  <div class="p-2 border border-300 rounded-2 text-center bg-body-tertiary" style="height: 60px;">
                     <div class="d-flex align-items-center justify-content-center gap-1 mb-1">
                        <span class="dot" [style.background-color]="st.color_clase"></span>
                        <p class="fs--2 text-700 fw-bold mb-0 text-uppercase" style="font-size: 0.65rem !important;">{{ st.estado }}</p>
                     </div>
                     <h5 class="mb-0 fw-bolder">{{ st.cantidad | number }}</h5>
                  </div>
               </div>
            </div>
            <!-- Mensaje Sin Datos -->
            <div *ngIf="!isLoading && estadoData.length === 0" class="text-center py-4">
              <span class="fas fa-database fs-3 text-300 mb-2"></span>
              <p class="text-600 fs--1">No hay datos de inventario para este periodo.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ranking Medicamentos -->
      <div class="col-12 col-md-6 col-xxl-6">
        <div class="card h-100 border border-300 shadow-none">
          <div class="card-header border-bottom border-300 py-3 px-4">
            <h5 class="mb-0 text-uppercase fs--1 fw-bolder">Top 10 Medicamentos más Movilizados</h5>
          </div>
          <div class="card-body p-4">
            <div style="height: 300px; position: relative;">
               <canvas #topChart></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribución por Categorías -->
      <div class="col-12 col-xxl-6">
        <div class="card h-100 border border-300 shadow-none">
          <div class="card-header border-bottom border-300 py-3 px-4">
            <h5 class="mb-0 text-uppercase fs--1 fw-bolder">Análisis de Movimientos por Categoría ({{ filtroPeriodo === 'custom' ? 'Rango' : filtroPeriodo }})</h5>
          </div>
          <div class="card-body p-4">
             <div class="table-responsive scrollbar">
                <table class="table table-sm fs--1 mb-0 align-middle">
                   <thead class="bg-body-secondary">
                      <tr>
                         <th class="ps-3 py-2">Categoría Médica</th>
                         <th class="text-center">Variedad (Tipos)</th>
                         <th class="text-end pe-3">Ingresos Totales (Período)</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr *ngFor="let cat of categoriasData">
                         <td class="ps-3 py-2 fw-bold text-700">{{ cat.categoria }}</td>
                         <td class="text-center">{{ cat.variedad }}</td>
                         <td class="text-end pe-3 fw-bolder text-primary">{{ cat.unidades | number }}</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Informes y Auditoría (Tabla Paginada) -->
    <div class="card shadow-none border border-300 mb-4">
      <div class="card-header border-bottom border-300 bg-body-tertiary py-3 px-4 d-flex align-items-center justify-content-between">
        <h5 class="mb-0"><span class="fas fa-list-ul me-2 text-primary"></span>Detalle de Movimientos en el Período</h5>
        <div class="d-flex gap-2">
           <button class="btn btn-sm btn-phoenix-secondary" (click)="cambiarOrdenIngresos('nombre_generico')">A-Z</button>
           <button class="btn btn-sm btn-phoenix-info" (click)="cambiarOrdenIngresos('fecha_ingreso')">Recientes</button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm fs--1 mb-0 table-hover align-middle">
            <thead class="bg-body-secondary text-uppercase fs--2 fw-bolder">
              <tr>
                <th class="ps-4 py-2">Fecha/Hora</th>
                <th>Medicamento</th>
                <th>Componentes / Principios Activos</th>
                <th>Lote</th>
                <th class="text-end">Cantidad</th>
                <th>Operador</th>
                <th class="pe-4 text-center">Modalidad</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ing of paginatedIngresos">
                <td class="ps-4 white-space-nowrap">{{ ing.fecha_ingreso | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="fw-bold">{{ ing.nombre_generico }}</td>
                <td><small class="text-600">{{ ing.componentes || 'N/A' }}</small></td>
                <td><code class="fs--2">{{ ing.numero_lote }}</code></td>
                <td class="text-end fw-bolder text-primary">{{ ing.cantidad_inicial | number }}</td>
                <td>{{ ing.usuario || 'Sistema' }}</td>
                <td class="text-center pe-4">
                  <span class="badge fs--2" [class]="ing.tipo_carga === 'MASIVO' ? 'badge-phoenix-info' : 'badge-phoenix-primary'">
                    {{ ing.tipo_carga }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer border-top border-300 py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
         <span class="fs--2 text-700">Mostrando {{ paginatedIngresos.length }} registros de {{ ingresosDetalle.length }} encontrados</span>
         <nav *ngIf="ingresosDetalle.length > pageSizeIngresos">
           <ul class="pagination pagination-sm mb-0">
             <li class="page-item" [class.disabled]="currentPageIngresos === 1">
               <button class="page-link" (click)="currentPageIngresos = currentPageIngresos - 1"><span class="fas fa-chevron-left"></span></button>
             </li>
             <li class="page-item active"><span class="page-link">{{ currentPageIngresos }}</span></li>
             <li class="page-item" [class.disabled]="currentPageIngresos * pageSizeIngresos >= ingresosDetalle.length">
               <button class="page-link" (click)="currentPageIngresos = currentPageIngresos + 1"><span class="fas fa-chevron-right"></span></button>
             </li>
           </ul>
         </nav>
      </div>
    </div>

    
  `,
  styles: [`
    .dot { height: 8px; width: 8px; border-radius: 50%; display: inline-block; }
    .border-start-lg { border-left: 1px solid var(--phoenix-border-color); }
    @media (max-width: 991px) { .border-start-lg { border-left: none; } }
  `]
})
export class EstadisticasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('estadoChart') estadoChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('evolucionChart') evolucionRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topChart') topChartRef!: ElementRef<HTMLCanvasElement>;

  resumen: EstadisticasResumen | null = null;
  estadoData: EstadoChart[] = [];
  evolucionData: EvolucionTemporal[] = [];
  ingresosDetalle: any[] = [];
  topMedicamentos: any[] = [];
  categoriasData: any[] = [];
  trimestres = [
    { label: 'Q1 (Ene-Mar)', start: '-01-01', end: '-03-31' },
    { label: 'Q2 (Abr-Jun)', start: '-04-01', end: '-06-30' },
    { label: 'Q3 (Jul-Sep)', start: '-07-01', end: '-09-30' },
    { label: 'Q4 (Oct-Dic)', start: '-10-01', end: '-12-31' }
  ];
  
  modo: 'medicamentos' | 'lotes' = 'medicamentos';
  currentPageIngresos = 1;
  pageSizeIngresos = 10;
  Math = Math;
  hoveredIndex: number | null = null;

  minDate = '';
  maxDate = '';

  desde = '';
  hasta = '';
  filtroPeriodo = 'mes';
  isLoading = false;
  exportando = false;
  tipoExport = 'despachos';
  departamento = 'ambos';

  periodos = [
    { label: 'Hoy', key: 'hoy' },
    { label: 'Semana', key: 'semana' },
    { label: 'Mes', key: 'mes' },
    { label: 'Ene-Mar', key: 'q1' },
    { label: 'Abr-Jun', key: 'q2' },
    { label: 'Jul-Sep', key: 'q3' },
    { label: 'Oct-Dic', key: 'q4' },
    { label: 'Año', key: 'anio' }
  ];

  charts: { [key: string]: Chart } = {};
  private sub = new Subscription();

  constructor(
    private svc: EstadisticasService,
    private swal: SwalService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    const hoy = new Date();
    this.maxDate = hoy.toISOString().split('T')[0];
    const anioAnterior = new Date();
    anioAnterior.setFullYear(hoy.getFullYear() - 1);
    this.minDate = anioAnterior.toISOString().split('T')[0];
    this.periodoRapido('mes', false);
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    Object.values(this.charts).forEach(c => c.destroy());
  }

  get paginatedIngresos() {
    const start = (this.currentPageIngresos - 1) * this.pageSizeIngresos;
    return this.ingresosDetalle.slice(start, start + this.pageSizeIngresos);
  }

  periodoRapido(key: string, recargar = true): void {
    this.filtroPeriodo = key;
    const hoy = new Date();
    let d = new Date();
    let h = new Date();
    
    switch(key) {
      case 'hoy': d = hoy; break;
      case 'semana': d.setDate(hoy.getDate() - 7); break;
      case 'mes': d.setMonth(hoy.getMonth() - 1); break;
      case 'q1': d = new Date(hoy.getFullYear(), 0, 1); h = new Date(hoy.getFullYear(), 2, 31); break;
      case 'q2': d = new Date(hoy.getFullYear(), 3, 1); h = new Date(hoy.getFullYear(), 5, 30); break;
      case 'q3': d = new Date(hoy.getFullYear(), 6, 1); h = new Date(hoy.getFullYear(), 8, 30); break;
      case 'q4': d = new Date(hoy.getFullYear(), 9, 1); h = new Date(hoy.getFullYear(), 11, 31); break;
      case 'anio': d.setFullYear(hoy.getFullYear() - 1); break;
    }
    
    this.desde = d.toISOString().split('T')[0];
    if (['q1','q2','q3','q4'].includes(key)) {
        this.hasta = h.toISOString().split('T')[0];
    } else {
        this.hasta = hoy.toISOString().split('T')[0];
    }
    
    if (recargar) this.cargarTodo();
  }

  onFechaChange(): void {
    this.filtroPeriodo = 'custom';
    this.cargarTodo();
  }

  limpiarFiltros(): void {
    this.modo = 'medicamentos';
    this.departamento = 'ambos';
    this.tipoExport = 'despachos';
    this.periodoRapido('mes', false);
    this.cargarTodo();
  }

  cambiarModo(m: 'medicamentos' | 'lotes'): void {
    this.modo = m;
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.isLoading = true;
    this.sub.add(
      forkJoin({
        resumen: this.svc.getResumen(this.desde, this.hasta, this.modo, this.departamento),
        estado: this.svc.getEstadoInventarioChart(this.modo, this.desde, this.hasta, this.departamento),
        evolucion: this.svc.getEvolucionTemporal(this.desde, this.hasta, this.modo, this.departamento),
        ingresos: this.svc.getIngresosDetalle(this.desde, this.hasta, undefined, this.departamento),
        top: this.svc.getTopMedicamentos(this.desde, this.hasta, 10, this.departamento),
        categorias: this.svc.getInventarioPorCategoria(this.desde, this.hasta, this.departamento)
      }).pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (res) => {
          this.resumen = res.resumen;
          this.estadoData = res.estado;
          this.evolucionData = res.evolucion;
          this.ingresosDetalle = res.ingresos;
          this.topMedicamentos = res.top;
          this.categoriasData = res.categorias;
          this.currentPageIngresos = 1;
          this.renderCharts();
        },
        error: () => this.swal.error('Error', 'Error al sincronizar analíticas.')
      })
    );
  }

  cambiarOrdenIngresos(orden: string): void {
    this.svc.getIngresosDetalle(this.desde, this.hasta, orden, this.departamento).subscribe(d => {
      this.ingresosDetalle = d;
      this.currentPageIngresos = 1;
      this.cdr.detectChanges();
    });
  }

  private renderCharts(): void {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.initEstadoChart();
        this.initEvolucionChart();
        this.initTopChart();
      }, 0);
    });
  }

  private initEstadoChart(): void {
    if (!this.estadoChartRef) return;
    if (this.charts['estado']) this.charts['estado'].destroy();
    const ctx = this.estadoChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts['estado'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.estadoData.map(d => d.estado),
        datasets: [{
          data: this.estadoData.map(d => d.cantidad),
          backgroundColor: this.estadoData.map(d => d.color_clase),
          borderWidth: 0,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        cutout: '80%',
        animation: { duration: 0 }
      }
    });
  }

  private initEvolucionChart(): void {
    if (!this.evolucionRef) return;
    if (this.charts['evolucion']) this.charts['evolucion'].destroy();
    const ctx = this.evolucionRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts['evolucion'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.evolucionData.map(d => d.fecha),
        datasets: [
          {
            label: this.modo === 'medicamentos' ? 'Unidades Ingresadas' : 'Lotes Ingresados',
            data: this.modo === 'medicamentos' 
              ? this.evolucionData.map(d => d.dotaciones_unidades)
              : this.evolucionData.map(d => d.dotaciones_cantidad),
            borderColor: '#3874ff',
            backgroundColor: 'rgba(56, 116, 255, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: 2
          },
          {
            label: this.modo === 'medicamentos' ? 'Unidades Despachadas' : 'Lotes Despachados',
            data: this.modo === 'medicamentos'
              ? this.evolucionData.map(d => d.despachos_unidades)
              : this.evolucionData.map(d => d.despachos_cantidad),
            borderColor: '#e5780b',
            tension: 0.4,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  private initTopChart(): void {
    if (!this.topChartRef) return;
    if (this.charts['top']) this.charts['top'].destroy();
    const ctx = this.topChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts['top'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topMedicamentos.map(d => d.nombre_generico),
        datasets: [{
          label: 'Unidades Despachadas',
          data: this.topMedicamentos.map(d => d.total_despachado),
          backgroundColor: '#3874ff',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  descargar(formato: 'csv' | 'excel' | 'pdf'): void {
    this.exportando = true;
    this.svc.exportar(formato, this.tipoExport, this.desde, this.hasta, this.departamento).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = formato === 'excel' ? 'xlsx' : formato;
        a.download = `reporte_${this.tipoExport}_${this.desde}_${this.hasta}.${ext}`;
        a.click();
        this.exportando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.exportando = false;
        this.swal.error('Error', 'No se pudo generar el reporte.');
        this.cdr.detectChanges();
      }
    });
  }

  get kpis() {
    if (!this.resumen) return [];
    if (this.modo === 'medicamentos') {
      return [
        { label: 'Variedad en Existencia', value: this.resumen.inventario_count, icon: 'fa-pills', trend: 'stable' },
        { label: 'Unidades Disponibles', value: this.resumen.inventario_unidades, icon: 'fa-boxes', trend: 'up' },
        { label: 'Variedad Movilizada', value: this.resumen.despachos_count, icon: 'fa-file-medical', trend: 'stable' },
        { label: 'Unidades Entregadas', value: this.resumen.despachos_unidades, icon: 'fa-capsules', trend: 'up' }
      ];
    } else {
      return [
        { label: 'Lotes en Existencia', value: this.resumen.inventario_count, icon: 'fa-barcode', trend: 'stable' },
        { label: 'Unidades en Lotes', value: this.resumen.inventario_unidades, icon: 'fa-layer-group', trend: 'up' },
        { label: 'Despachos Realizados', value: this.resumen.despachos_transacciones, icon: 'fa-hand-holding-medical', trend: 'stable' },
        { label: 'Unidades Entregadas', value: this.resumen.despachos_unidades, icon: 'fa-shipping-fast', trend: 'up' }
      ];
    }
  }
}
