import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DotacionService } from '../../core/services/dotacion.service';
import { MedicamentosService } from '../../core/services/medicamentos.service';
import { SwalService } from '../../core/services/swal.service';
import { LoteDetalle } from '../../core/models/farmacia.models';
import { SoloNumerosDirective } from '../../shared/directives/solo-numeros.directive';
import { UppercaseDirective } from '../../shared/directives/uppercase.directive';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dotacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SoloNumerosDirective, UppercaseDirective, RouterLink],
  template: `
    <div class="mb-5">
      <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h2 class="mb-2 text-1100">Ingreso de Dotación</h2>
          <h5 class="text-700 fw-semi-bold">Registro de nuevos lotes y reposición de inventario centralizado</h5>
        </div>
        <div class="d-flex flex-wrap gap-2 justify-content-md-end">
          <a href="assets/docs/manual_carga_masiva.pdf" target="_blank" class="btn btn-phoenix-info" download="manual_carga_masiva.pdf">
            <span class="fas fa-file-pdf me-2"></span>Guía de Carga Masiva
          </a>
          <a href="assets/docs/plantilla_carga_masiva.xlsx" target="_blank" class="btn btn-phoenix-success" download="plantilla_carga_masiva.xlsx">
            <span class="fas fa-file-excel me-2"></span>Descargar Formato Excel
          </a>
          <button class="btn btn-phoenix-secondary" (click)="fileInput.click()">
            <span class="fas fa-file-import me-2"></span>Carga Masiva (Excel)
          </button>
          <input type="file" #fileInput class="d-none" accept=".csv, .xlsx" (change)="onFileSelected($event)">
        </div>
      </div>
    </div>

    <div class="row g-3 align-items-start">
      <!-- Columna Izquierda: Formulario -->
      <div class="col-12 col-xxl-4">
        <div class="card shadow-none border border-300">
          <div class="card-header border-bottom border-300 bg-body-tertiary py-3">
            <h4 class="mb-0 text-900"><span class="fas fa-plus-circle me-2 text-success"></span>Nuevo Lote</h4>
          </div>
          <div class="card-body">
            <form [formGroup]="loteForm" (ngSubmit)="onSubmit()">
              <!-- Destino de abastecimiento (Solo para Administrador) -->
              <div class="mb-4" *ngIf="isAdmin">
                <label class="form-label fs--1 fw-bold">DESTINO DEL ABASTECIMIENTO</label>
                <select formControlName="schema" class="form-select form-select-sm" (change)="onDestinoChange()">
                  <option value="farmacia">FARMACIA CENTRAL</option>
                  <option value="proveeduria">PROVEEDURÍA</option>
                </select>
                <div class="form-text fs--2 text-700">Seleccione el inventario destino a abastecer.</div>
              </div>

              <div class="mb-4">
                <label class="form-label fs--1 fw-bold">MEDICAMENTO EN CATÁLOGO</label>
                <div class="input-group">
                  <input type="text" class="form-control form-control-sm" placeholder="Haga clic en la lupa para seleccionar un medicamento" [value]="medicamentoSeleccionadoNombre" readonly (click)="abrirModalBusqueda()" style="cursor: pointer;" />
                  <button class="btn btn-phoenix-secondary btn-sm" type="button" (click)="abrirModalBusqueda()" title="Buscar medicamento">
                    <span class="fas fa-search"></span>
                  </button>
                </div>
                <div class="d-flex justify-content-between mt-1">
                  <div class="form-text fs--2 text-700">Seleccione del catálogo activo.</div>
                  <a routerLink="/medicamentos" class="fs--2 fw-bold text-primary">¿No existe? Añadir Medicamento</a>
                </div>

                <!-- Advertencia de dotación reciente -->
                <div class="alert alert-subtle-warning mt-2 p-2 fs--2" *ngIf="advertenciaReciente">
                  <span class="fas fa-exclamation-triangle me-1"></span>
                  <strong>¡Atención!</strong> {{ advertenciaReciente.mensaje }}
                  <ul class="mb-1 mt-1 ps-3">
                    <li *ngFor="let l of advertenciaReciente.lotes_recientes">
                      Lote <code>{{ l.numero_lote }}</code> — {{ l.cantidad }} uds. ingresadas el {{ l.fecha_ingreso }}
                    </li>
                  </ul>
                  <span class="text-600">Si es una dotación diferente, puede continuar normalmente.</span>
                </div>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-sm-6">
                  <label class="form-label fs--2 text-700 text-uppercase fw-bold">Número de Lote</label>
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-body-tertiary fw-bold">DEM-</span>
                    <input type="text" formControlName="numero_lote" class="form-control" placeholder="YYYY-XXXXXX" appUppercase maxlength="11"/>
                  </div>
                  <div class="form-text fs--2 text-600">Ej: 2026-000001. Automático si se deja vacío.</div>
                </div>

                <div class="col-sm-6">
                  <label class="form-label fs--1 fw-bold">CANTIDAD <span class="text-600 fw-normal">(máx. 20000)</span></label>
                  <input type="text" formControlName="cantidad" class="form-control" placeholder="0" appSoloNumeros maxlength="5"/>
                  <div class="form-text fs--2 text-danger" *ngIf="loteForm.get('cantidad')?.errors?.['max']">
                    Máximo permitido: 20000 unidades.
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label fs--1 fw-bold">FECHA DE VENCIMIENTO</label>
                <input type="date" formControlName="fecha_vencimiento" class="form-control" [min]="minDate"/>

                <div class="d-flex align-items-center mt-3 p-2 bg-body-tertiary rounded border border-200" *ngIf="previewEstado">
                  <span class="badge badge-phoenix fs--2 me-2" [class]="'badge-phoenix-' + previewEstado.color">
                    {{ previewEstado.label }}
                  </span>
                  <span class="fs--2 text-700">Estado proyectado al ingresar</span>
                </div>
              </div>

              <button type="submit" class="btn btn-primary w-100 py-2 fs-0" [disabled]="loteForm.invalid || isLoading">
                <span class="spinner-border spinner-border-sm me-2" [class.d-none]="!isLoading" role="status" aria-hidden="true"></span>
                <span class="fas fa-save me-2" [class.d-none]="isLoading"></span>
                <span>{{ isLoading ? 'Procesando...' : 'Registrar Dotación' }}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Últimos registros -->
      <div class="col-12 col-xxl-8">
        <div class="card shadow-none border border-300">
          <div class="card-header border-bottom border-300 py-3">
            <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
              <h4 class="mb-0 text-900"><span class="fas fa-history me-2"></span>Recién Ingresados</h4>
              <div class="d-flex flex-wrap align-items-center gap-2">
                <button class="btn btn-phoenix-primary btn-sm" (click)="cargarUltimosLotes()">
                  <span class="fas fa-sync-alt me-1"></span>Actualizar
                </button>
                <input type="month" class="form-control form-control-sm w-auto" [(ngModel)]="filtroMesAnio" (change)="cargarUltimosLotes()" />
                <button class="btn btn-phoenix-secondary btn-sm" (click)="limpiarFiltroFecha()">
                  <span class="fas fa-broom"></span>
                </button>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm fs--1 mb-0 border-top border-200 table-hover">
                <thead>
                  <tr>
                    <th class="white-space-nowrap align-middle ps-4" scope="col">Medicamento</th>
                    <th class="white-space-nowrap align-middle" scope="col">Principios Activos / Componentes</th>
                    <th class="white-space-nowrap align-middle" scope="col">Lote</th>
                    <th class="white-space-nowrap align-middle text-end" scope="col">Dotación</th>
                    <th class="white-space-nowrap align-middle" scope="col">Ingresado</th>
                    <th class="white-space-nowrap align-middle pe-4" scope="col">Vencimiento</th>
                  </tr>
                </thead>
                <tbody class="list">
                  <ng-container *ngIf="isLoadingLotes && ultimosLotes.length === 0">
                    <tr *ngFor="let i of [1,2,3,4,5]">
                      <td class="ps-4 py-3"><div class="skeleton skeleton-text-lg" style="width: 80%"></div></td>
                      <td class="py-3"><div class="skeleton skeleton-text" style="width: 70%"></div></td>
                      <td class="py-3"><div class="skeleton skeleton-text" style="width: 60px"></div></td>
                      <td class="py-3 text-end"><div class="skeleton skeleton-text" style="width: 40px; margin-left: auto"></div></td>
                      <td class="py-3"><div class="skeleton skeleton-text" style="width: 90px"></div></td>
                      <td class="py-3"><div class="skeleton skeleton-text" style="width: 80px"></div></td>
                      <td class="py-3 text-center pe-4"><div class="skeleton skeleton-rounded" style="height: 20px; width: 80px; margin: 0 auto"></div></td>
                    </tr>
                  </ng-container>

                  <tr *ngFor="let lote of ultimosLotes">
                    <td class="align-middle ps-4">
                      <div class="fw-bold text-1100 fs-0 text-uppercase">{{ lote.nombre_generico }}</div>
                      <div class="text-600 fs--2">{{ lote.nombre_presentacion }}</div>
                    </td>
                    <td class="align-middle text-600">
                      <div class="d-flex flex-wrap gap-1" *ngIf="lote.componentes_json?.length; else sinComponentes">
                        <span class="badge badge-phoenix badge-phoenix-secondary fs--2" *ngFor="let comp of lote.componentes_json">
                          {{ comp.nombre_principio }} {{ comp.concentracion_valor }} {{ comp.nombre_unidad }}
                        </span>
                      </div>
                      <ng-template #sinComponentes>
                        <span class="text-500 fs--2">Sin principios activos</span>
                      </ng-template>
                    </td>
                    <td class="align-middle"><code class="fs--2 text-700">{{ lote.numero_lote }}</code></td>
                    <td class="align-middle text-end fw-bold text-1000">
                      {{ lote.cantidad_inicial | number }}
                      <span class="d-block fs--2 fw-normal text-warning" *ngIf="lote.cantidad_actual > 0 && lote.cantidad_actual < lote.cantidad_inicial">
                        Restan: {{ lote.cantidad_actual | number }}
                      </span>
                      <span class="d-block fs--2 fw-bold text-danger" *ngIf="lote.cantidad_actual === 0">
                        Agotado (0)
                      </span>
                    </td>
                    <td class="align-middle">
                      <span class="text-700 fs--2">{{ lote.fecha_ingreso | date:'dd/MM/yyyy' }}</span><br>
                      <span class="text-500 fs--2">{{ lote.fecha_ingreso | date:'HH:mm' }}</span>
                    </td>
                    <td class="align-middle fw-semi-bold pe-4">
                      {{ lote.fecha_vencimiento | date:'dd/MM/yyyy' }}
                    </td>
                  </tr>

                  <tr *ngIf="ultimosLotes.length === 0 && !isLoadingLotes">
                    <td colspan="6" class="text-center py-4 text-600 fs--1">
                      <span class="fas fa-box-open me-2"></span>No hay lotes registrados aún.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación de lotes -->
            <div class="d-flex justify-content-between align-items-center px-4 py-3 border-top border-200" *ngIf="totalLotes > pageSize">
              <span class="fs--2 text-700">Página {{ paginaLotes }} de {{ totalPaginasLotes }} ({{ totalLotes }} total)</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-phoenix-secondary" [disabled]="paginaLotes === 1" (click)="irPaginaLotes(paginaLotes - 1)">
                  <span class="fas fa-chevron-left fs--2"></span>
                </button>
                <button class="btn btn-sm btn-phoenix-secondary" [disabled]="paginaLotes === totalPaginasLotes" (click)="irPaginaLotes(paginaLotes + 1)">
                  <span class="fas fa-chevron-right fs--2"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Búsqueda -->
    <div class="modal fade show" [class.d-block]="showModalBusqueda" tabindex="-1" style="background: rgba(0,0,0,0.5); z-index: 1050;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-300 shadow-lg">
          <div class="modal-header border-bottom border-300 bg-body-tertiary">
            <h5 class="modal-title">Catálogo de Medicamentos</h5>
            <button class="btn-close" type="button" (click)="showModalBusqueda = false"></button>
          </div>
          <div class="modal-body p-0">
            <div class="p-3 bg-body-secondary">
              <input type="text" class="form-control form-control-sm" placeholder="Escriba para filtrar..." [(ngModel)]="filtroModal" appUppercase />
            </div>
            <div class="table-responsive scrollbar" style="max-height: 400px;">
              <table class="table table-sm table-hover mb-0 fs--1">
                <thead class="sticky-top" style="z-index: 10;">
                  <tr>
                    <th class="ps-3 bg-body-tertiary">Nombre del Medicamento</th>
                    <th class="text-end pe-3 bg-body-tertiary">Agregar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of medicamentosFiltrados()" style="cursor:pointer" (click)="seleccionarMedicamento(m.id)">
                    <td class="ps-3 align-middle py-2">
                      <div class="fw-bold text-1100 fs--1">{{ m.nombre }}</div>
                      <div class="d-flex flex-wrap gap-1 mt-1" *ngIf="m.componentes_json?.length; else sinComponentes">
                        <span class="badge badge-phoenix badge-phoenix-secondary fs--2" *ngFor="let comp of m.componentes_json">
                          {{ comp.nombre_principio }} {{ comp.concentracion_valor }} {{ comp.nombre_unidad }}
                        </span>
                      </div>
                      <ng-template #sinComponentes>
                        <span class="text-500 fs--2">Sin principios activos</span>
                      </ng-template>
                    </td>
                    <td class="text-end align-middle pe-3 py-2">
                      <button class="btn btn-sm btn-phoenix-primary p-1 px-2"><span class="fas fa-plus"></span></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer border-top border-300">
            <button class="btn btn-phoenix-secondary btn-sm" type="button" (click)="showModalBusqueda = false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Previa de Carga Masiva -->
    <div class="modal fade show" [class.d-block]="showPreviewModal" tabindex="-1" style="background: rgba(0,0,0,0.5); z-index: 1055;">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-300 shadow-lg">
          <div class="modal-header border-bottom border-300 bg-body-tertiary">
            <h5 class="modal-title"><span class="fas fa-file-excel text-success me-2"></span>Vista Previa de Carga Masiva</h5>
            <button class="btn-close" type="button" (click)="showPreviewModal = false; archivoPreview = null"></button>
          </div>
          
          <div class="modal-body p-0">
            <div *ngIf="previewErrores.length > 0" class="alert alert-outline-danger m-3 d-flex align-items-center mb-0" role="alert">
              <span class="fas fa-times-circle text-danger fs-3 me-3"></span>
              <div>
                <h4 class="alert-heading text-danger fw-bold">Se encontraron errores en el archivo</h4>
                <p class="mb-0 fs--1">La carga no procederá hasta que se corrijan las siguientes filas en el Excel:</p>
                <ul class="mb-0 mt-2 fs--1 ps-3 text-danger">
                  <li *ngFor="let err of previewErrores" style="white-space: pre-line;">{{ err }}</li>
                </ul>
              </div>
            </div>

            <div class="p-3" *ngIf="previewData.length > 0">
              <h6 class="text-700 mb-2">Registros Válidos ({{ previewData.length }} lotes):</h6>
              <div class="table-responsive scrollbar border border-200 rounded-3" style="max-height: 400px;">
                <table class="table table-sm table-hover mb-0 fs--1">
                  <thead class="bg-body-secondary sticky-top" style="z-index: 10;">
                    <tr>
                      <th class="ps-3 bg-body-tertiary">Fila</th>
                      <th class="bg-body-tertiary">Medicamento Catálogo</th>
                      <th class="bg-body-tertiary">Componentes Detectados</th>
                      <th class="text-end bg-body-tertiary">Cantidad</th>
                      <th class="text-end pe-3 bg-body-tertiary">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let lote of previewData">
                      <td class="ps-3 fw-bold">{{ lote.idx }}</td>
                      <td>
                        <span class="fw-bold text-900">{{ lote.medicamento }}</span><br>
                        <span class="fs--2 text-600">{{ lote.presentacion }}</span>
                      </td>
                      <td class="text-600">{{ lote.componentes || 'N/A' }}</td>
                      <td class="text-end fw-bold">{{ lote.cantidad }}</td>
                      <td class="text-end pe-3">{{ lote.f_venc | date:'dd/MM/yyyy' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div *ngIf="previewData.length === 0 && previewErrores.length === 0" class="p-5 text-center">
              <span class="fas fa-spinner fa-spin fa-2x text-primary"></span>
            </div>
          </div>
          
          <div class="modal-footer border-top border-300">
            <button class="btn btn-phoenix-secondary btn-sm" type="button" (click)="showPreviewModal = false; archivoPreview = null">Cancelar</button>
            <button class="btn btn-primary btn-sm" type="button" (click)="confirmarCargaMasiva()" [disabled]="previewErrores.length > 0 || previewData.length === 0">
              <span class="fas fa-check me-2"></span>Confirmar Carga
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DotacionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  isAdmin = false;
  private dotacionService = inject(DotacionService);
  private medicamentosService = inject(MedicamentosService);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  loteForm: FormGroup;
  medicamentos: any[] = [];
  ultimosLotes: LoteDetalle[] = [];
  isLoading = false;
  isLoadingLotes = false;
  minDate = new Date().toISOString().split('T')[0];
  previewEstado: { label: string; color: string } | null = null;
  showModalBusqueda = false;
  filtroModal = '';
  advertenciaReciente: any = null;
  medicamentoSeleccionadoNombre: string = '';
  filtroMesAnio: string = '';

  // Paginación tabla de lotes
  paginaLotes = 1;
  readonly pageSize = 10;
  totalLotes = 0;

  get totalPaginasLotes(): number {
    return Math.max(1, Math.ceil(this.totalLotes / this.pageSize));
  }

  constructor() {
    this.loteForm = this.fb.group({
      id_med_base: ['', Validators.required],
      numero_lote: ['', [Validators.required, Validators.pattern(/^\d{4}-[A-Z0-9]{1,6}$/)]],
      cantidad: ['', [Validators.required, Validators.min(1), Validators.max(20000), Validators.pattern(/^\d+$/)]],
      fecha_vencimiento: ['', Validators.required],
      schema: ['farmacia']
    });

    this.loteForm.get('fecha_vencimiento')?.valueChanges.subscribe(val => {
      if (val) this.actualizarPreview(val);
    });

    // Solo generar lote automático si el campo está vacío
    this.loteForm.get('id_med_base')?.valueChanges.subscribe(val => {
      if (!val) {
        this.loteForm.patchValue({ numero_lote: '' }, { emitEvent: false });
        this.advertenciaReciente = null;
      }
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole('ADMINISTRADOR', 'ENCARGADO');
    this.cargarMedicamentos();
    this.limpiarFiltroFecha();
  }

  cargarMedicamentos(): void {
    this.medicamentosService.getMedicamentosParaLote().subscribe({
      next: (data) => this.medicamentos = data,
    });
  }

  onDestinoChange(): void {
    this.paginaLotes = 1;
    this.cargarUltimosLotes();
  }

  limpiarFiltroFecha(): void {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    this.filtroMesAnio = `${yyyy}-${mm}`;
    this.cargarUltimosLotes();
  }

  cargarUltimosLotes(): void {
    this.isLoadingLotes = true;
    let mes = '';
    let anio = '';
    if (this.filtroMesAnio) {
      const parts = this.filtroMesAnio.split('-');
      if (parts.length === 2) {
        anio = parts[0];
        mes = parts[1];
      }
    }
    const params: any = { page: this.paginaLotes, page_size: this.pageSize, mes, anio };
    if (this.isAdmin) {
      params.schema = this.loteForm.get('schema')?.value || 'farmacia';
    }
    this.dotacionService.getHistorialLotes(params).subscribe({
      next: (res: any) => {
        // Soporte para respuesta paginada { count, results } y también array plano (legacy)
        if (res && res.results) {
          this.ultimosLotes = res.results;
          this.totalLotes = res.count || res.results.length;
        } else if (Array.isArray(res)) {
          this.ultimosLotes = res;
          this.totalLotes = res.length;
        }
        this.isLoadingLotes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingLotes = false;
        this.cdr.detectChanges();
      }
    });
  }

  irPaginaLotes(p: number): void {
    if (p >= 1 && p <= this.totalPaginasLotes) {
      this.paginaLotes = p;
      this.cargarUltimosLotes();
    }
  }

  onMedicamentoChange(): void {
    const id = this.loteForm.get('id_med_base')?.value;
    if (!id) {
      this.advertenciaReciente = null;
      return;
    }
    // Generar lote si el campo está vacío
    if (!this.loteForm.get('numero_lote')?.value) {
      this.generarLote();
    }
    // Verificar dotación reciente
    this.http.get<any>(`${this.API}/dotacion/verificar-reciente/${id}/`).subscribe({
      next: (res) => {
        this.advertenciaReciente = res.tiene_reciente ? res : null;
        this.cdr.detectChanges();
      },
      error: () => this.advertenciaReciente = null
    });
  }

  abrirModalBusqueda(): void {
    this.showModalBusqueda = true;
    this.filtroModal = '';
  }

  private removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  medicamentosFiltrados(): any[] {
    if (!this.filtroModal) return this.medicamentos;
    const q = this.removeAccents(this.filtroModal.toUpperCase());
    
    return this.medicamentos.filter(m => {
      const nombreLimpio = this.removeAccents(m.nombre.toUpperCase());
      if (nombreLimpio.includes(q)) return true;
      
      if (m.componentes_json && m.componentes_json.length > 0) {
        return m.componentes_json.some((c: any) => {
          const compNombre = this.removeAccents(c.nombre_principio.toUpperCase());
          return compNombre.includes(q);
        });
      }
      return false;
    });
  }

  seleccionarMedicamento(id: number): void {
    const med = this.medicamentos.find(m => m.id === id);
    if (med) {
      this.medicamentoSeleccionadoNombre = med.nombre;
    }
    this.loteForm.patchValue({ id_med_base: id });
    this.showModalBusqueda = false;
    this.onMedicamentoChange();
  }

  actualizarPreview(fecha: string): void {
    const hoy = new Date();
    const vence = new Date(fecha);
    const meses = (vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (meses < 0) {
      this.previewEstado = { label: 'VENCIDO', color: 'danger' };
    } else if (meses <= 4) {
      this.previewEstado = { label: 'PRÓXIMO A VENCER', color: 'warning' };
    } else {
      this.previewEstado = { label: 'ÓPTIMO', color: 'success' };
    }
  }

  generarLote(): void {
    const year = new Date().getFullYear();
    let nextNum = 1;
    
    if (this.ultimosLotes.length > 0) {
      const nums = this.ultimosLotes
        .map(l => {
          const match = l.numero_lote.match(/DEM-(\d{4})-(\d+)/);
          return (match && parseInt(match[1], 10) === year) ? parseInt(match[2], 10) : 0;
        })
        .filter(n => n > 0);

      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }

    const formatted = `${year}-${nextNum.toString().padStart(6, '0')}`;
    this.loteForm.patchValue({ numero_lote: formatted });
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.loteForm.invalid || this.isLoading) return;

    // Validar cantidad máxima
    const cantidad = parseInt(this.loteForm.value.cantidad, 10);
    if (cantidad > 20000) {
      this.swal.error('Cantidad inválida', 'La cantidad máxima de dotación es 20000 unidades.');
      return;
    }

    this.isLoading = true;
        const rawLote = this.loteForm.value.numero_lote || '';
    const fullLote = rawLote.startsWith('DEM-') ? rawLote : `DEM-${rawLote}`;

    const data = { 
      ...this.loteForm.value, 
      cantidad,
      numero_lote: fullLote 
    };

    this.dotacionService.registrarLote(data).subscribe({
      next: () => {
        this.swal.success('¡Éxito!', 'Lote registrado correctamente en el inventario.');
        const currentSchema = this.loteForm.get('schema')?.value || 'farmacia';
        this.loteForm.reset();
        this.loteForm.patchValue({ schema: currentSchema }, { emitEvent: false });
        this.previewEstado = null;
        this.advertenciaReciente = null;
        this.isLoading = false;
        this.paginaLotes = 1;
        this.cargarUltimosLotes();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.swal.error('Error', err.error?.detail || 'No se pudo registrar el lote.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  showPreviewModal = false;
  previewData: any[] = [];
  previewErrores: string[] = [];
  archivoPreview: File | null = null;

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.subirArchivoPreview(file);
    event.target.value = ''; // Reset input
  }

  subirArchivoPreview(file: File): void {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('preview', 'true');
    if (this.isAdmin) formData.append('schema', this.loteForm.get('schema')?.value || 'farmacia');

    this.swal.loading('Verificando archivo...');
    
    this.http.post<any>(`${this.API}/dotacion/lotes/cargar-masivo/`, formData).subscribe({
      next: (res) => {
        this.previewData = res.preview_data || [];
        this.previewErrores = [];
        this.archivoPreview = file;
        this.showPreviewModal = true;
        this.swal.close();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.swal.close();
        if (err.error?.errores || err.error?.preview_data) {
          this.previewData = err.error.preview_data || [];
          this.previewErrores = err.error.errores || [];
          this.archivoPreview = file;
          this.showPreviewModal = true;
          this.cdr.detectChanges();
        } else {
          this.swal.error('Error', err.error?.detail || 'No se pudo verificar el archivo.');
        }
      }
    });
  }

  confirmarCargaMasiva(): void {
    if (!this.archivoPreview) return;
    const formData = new FormData();
    formData.append('archivo', this.archivoPreview);
    formData.append('preview', 'false');
    if (this.isAdmin) formData.append('schema', this.loteForm.get('schema')?.value || 'farmacia');

    this.showPreviewModal = false;
    this.swal.loading('Procesando carga masiva...');
    this.http.post<any>(`${this.API}/dotacion/lotes/cargar-masivo/`, formData).subscribe({
      next: (res) => {
        this.swal.success('Carga Completada', res.message);
        this.cargarUltimosLotes();
        this.archivoPreview = null;
      },
      error: (err) => {
        this.swal.error('Error en la Carga', err.error?.detail || 'No se pudo procesar el archivo.');
        this.archivoPreview = null;
      }
    });
  }
}
