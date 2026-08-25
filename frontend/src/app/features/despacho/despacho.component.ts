import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DespachoService } from '../../core/services/despacho.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, finalize, timeout, delay } from 'rxjs/operators';
import { SwalService } from '../../core/services/swal.service';
import { AuthService } from '../../core/services/auth.service';
import { BusquedaMedicamento, ItemDespacho } from '../../core/models/farmacia.models';
import { Titular, CargaFamiliar } from '../../core/interfaces/bienestar.interface';
import { SoloNumerosDirective } from '../../shared/directives/solo-numeros.directive';
import { UppercaseDirective } from '../../shared/directives/uppercase.directive';
import { CedulaPipe } from '../../shared/pipes/cedula.pipe';

@Component({
  selector: 'app-despacho',
  standalone: true,
  imports: [CommonModule, FormsModule, SoloNumerosDirective, UppercaseDirective, CedulaPipe],
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
    <div class="mb-5">
      <div class="row g-3 justify-content-between align-items-end">
        <div class="col-auto">
          <h2 class="mb-2 text-body-emphasis">Despacho de Medicamentos</h2>
          <h5 class="text-700 fw-semi-bold">
            Gestión de entregas bajo el sistema 
            <span class="badge badge-phoenix badge-phoenix-info fs--2">FEFO ACTIVADO</span>
          </h5>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- Columna Principal: Formulario de Despacho -->
      <div class="col-12 col-xl-8">
        <div class="card shadow-none border-translucent anim-scale-up">
          <div class="card-header border-bottom border-translucent bg-body-tertiary py-3">
            <h4 class="mb-0 text-body-emphasis"><span class="fas fa-file-invoice me-2"></span>Nueva Entrega</h4>
          </div>
          <div class="card-body">
            
            <!-- Paso 1: Selección de Medicamento -->
            <div class="mb-4 pb-4 border-bottom border-translucent">
              <div class="d-flex align-items-center mb-3">
                <span class="step-number me-2">1</span>
                <h5 class="mb-0 text-body-emphasis">Seleccionar Medicamentos (Inventario)</h5>
              </div>
              
              <div class="search-box mb-3" style="width: 100%;">
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Haga clic en la lupa para buscar medicamentos..."
                    [(ngModel)]="medicamentoBusqueda"
                    (keyup.enter)="abrirModalLupa()"
                    readonly
                    style="cursor: pointer"
                    (click)="abrirModalLupa()"
                  />
                  <button class="btn btn-phoenix-primary px-3" (click)="abrirModalLupa()">
                    <span class="fas fa-search-plus"></span>
                  </button>
                </div>
              </div>

              <!-- Tabla de Items Seleccionados -->
              <div class="table-responsive scrollbar mb-3" *ngIf="itemsSeleccionados.length > 0">
                <table class="table table-sm table-hover border border-300 fs--1">
                  <thead class="bg-body-secondary">
                    <tr>
                      <th class="ps-3" style="width: 25%">Medicamento / Presentación</th>
                      <th style="width: 25%">Principios Activos / Componentes</th>
                      <th>Lote</th>
                      <th class="text-end" style="width: 110px">Cantidad</th>
                      <th class="text-end pe-3" style="width: 50px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of itemsSeleccionados; let i = index">
                      <td class="ps-3 align-middle">
                        <div class="d-flex align-items-center">
                          <span class="badge-dot me-2" [class]="'bg-' + (item.color_clase || 'secondary')"></span>
                          <div>
                            <div class="fw-bold text-1100 fs-0 text-uppercase">{{ (item.medicamento_detallado || item.nombre_generico).split(' - ')[0] }}</div>
                            <div class="text-600 fs--2">{{ item.presentacion }}</div>
                          </div>
                        </div>
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
                      <td class="align-middle text-700"><code>{{ item.numero_lote }}</code></td>
                      <td class="align-middle" style="min-width: 120px">
                        <input
                          type="text"
                          class="form-control form-control-sm text-end fw-bold"
                          [(ngModel)]="item.cantidadSolicitada"
                          (input)="validarExistenciaItem(item)"
                          [class.border-danger]="item.cantidadSolicitada >= item.existencia"
                          appSoloNumeros
                        />
                        <div class="text-end mt-1">
                          <span class="fs--2 fw-bold" [class.text-danger]="item.cantidadSolicitada >= item.existencia" [class.text-700]="item.cantidadSolicitada < item.existencia">
                            Disponible: {{ item.existencia }}
                          </span>
                        </div>
                      </td>
                      <td class="align-middle text-end pe-3">
                        <button class="btn btn-link p-0 text-danger" (click)="removerItem(i)">
                          <span class="fas fa-trash-alt"></span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="p-2 fs--2 bg-transparent text-info fw-bold d-flex align-items-center" *ngIf="itemsSeleccionados.length === 0">
                <span class="fas fa-info-circle me-2 fs-0"></span> 
                <span>No se han seleccionado medicamentos. Máximo 5 tipos distintos por entrega.</span>
              </div>
            </div>

            <!-- Paso 2: Información del Receptor -->
            <div class="mb-4 pb-4 border-bottom border-translucent">
              <div class="d-flex align-items-center mb-3">
                <span class="step-number me-2">2</span>
                <h5 class="mb-0 text-body-emphasis">Información del Receptor (Beneficiario)</h5>
              </div>
              
              <!-- Buscador de Titular -->
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fs--2 text-700 text-uppercase fw-bold">Cédula del Titular (Responsable)</label>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control form-control-sm fw-bold border-primary"
                      placeholder="Ej: 11123456"
                      name="cedula_visual"
                      [ngModel]="cedulaVisual"
                      (ngModelChange)="onCedulaChange($event)"
                      maxlength="10"
                      appSoloNumeros
                    />
                    <button class="btn btn-primary btn-sm" (click)="buscarBeneficiario()" [disabled]="!cedulaVisual">
                      <span class="fas fa-search"></span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Ficha del Beneficiario Seleccionado -->
              <div class="card bg-body-quaternary border-translucent shadow-none" *ngIf="titularEncontrado && beneficiarioSeleccionado">
                <div class="card-body p-3">
                  
                  <!-- SECCIÓN 1: DATOS DEL TITULAR (SIEMPRE ARRIBA) -->
                  <div class="mb-3">
                    <div class="d-flex align-items-center mb-2">
                      <div class="avatar avatar-l bg-primary-subtle text-primary rounded-circle me-2">
                        <span class="fas fa-user-tie"></span>
                      </div>
                      <h6 class="mb-0 text-uppercase text-800 fs--2 fw-bold ls-1">Titular Responsable</h6>
                    </div>
                    
                    <div class="ps-1">
                      <h3 class="mb-1 text-1000">{{ titularEncontrado.nombres_titular }} {{ titularEncontrado.apellidos_titular }}</h3>
                      <div class="d-flex flex-wrap align-items-center gap-2">
                        <span class="badge badge-phoenix badge-phoenix-info fs--1">
                          <span class="fas fa-fingerprint me-1"></span>
                          V-{{ titularEncontrado.cedula | cedula }}
                        </span>
                        <span class="badge badge-phoenix badge-phoenix-info fs--1 text-uppercase text-wrap text-start mw-100" style="line-height: 1.4; white-space: normal !important; word-break: break-word;">
                          <span class="fas fa-network-wired me-1"></span>
                          {{ titularEncontrado.dependencia }}
                        </span>
                      </div>

                      <div class="row g-3 mt-3">
                        <div class="col-md-6">
                          <label class="form-label fs--2 text-700 text-uppercase fw-bold">Correo del Titular</label>
                          <input 
                            type="email" 
                            class="form-control form-control-sm bg-body-emphasis" 
                            [(ngModel)]="titularEncontrado.correo_electronico" 
                            placeholder="correo@ejemplo.com"
                          >
                        </div>
                        <div class="col-md-6">
                          <label class="form-label fs--2 text-700 text-uppercase fw-bold">Teléfono del Titular</label>
                          <input 
                            type="text" 
                            class="form-control form-control-sm bg-body-emphasis" 
                            [(ngModel)]="titularEncontrado.telefono_principal" 
                            placeholder="04XXXXXXXXX"
                          >
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- SECCIÓN 2: CARGA BENEFICIARIA (SOLO SI SE SELECCIONA UNA CARGA, APARECE ABAJO) -->
                  <div class="mt-4 pt-4 border-top border-dashed border-400" *ngIf="beneficiarioSeleccionado.es_carga">
                    <div class="d-flex align-items-center mb-2">
                      <div class="avatar avatar-l bg-info-subtle text-info rounded-circle me-2">
                        <span class="fas fa-users"></span>
                      </div>
                      <h6 class="mb-0 text-uppercase text-800 fs--2 fw-bold ls-1">Carga Familiar (Receptor Final)</h6>
                    </div>
                    
                    <div class="ps-1">
                      <div class="p-3 bg-soft-info-fefo border border-info-subtle rounded-3">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <h4 class="mb-2 text-1000">{{ beneficiarioSeleccionado.nombres }} {{ beneficiarioSeleccionado.apellidos }}</h4>
                            <div class="d-flex flex-wrap align-items-center gap-2 mt-1">
                              <span class="badge badge-phoenix badge-phoenix-info text-uppercase">
                                {{ beneficiarioSeleccionado.parentesco }}
                              </span>
                              <ng-container *ngIf="beneficiarioSeleccionado.posee_cedula; else sinCedulaSeleccionado">
                                <span class="badge badge-phoenix badge-phoenix-info fs--1">
                                  <span class="fas fa-id-card me-1"></span>
                                  V-{{ beneficiarioSeleccionado.cedula | cedula }}
                                </span>
                              </ng-container>
                              <ng-template #sinCedulaSeleccionado>
                                <span class="badge badge-phoenix badge-phoenix-warning fs--1" *ngIf="beneficiarioSeleccionado.cedula">
                                  <span class="fas fa-id-card me-1"></span>
                                  {{ beneficiarioSeleccionado.cedula }}
                                </span>
                                <span class="badge badge-phoenix badge-phoenix-danger fs--1" *ngIf="!beneficiarioSeleccionado.cedula">
                                  <span class="fas fa-id-card me-1"></span>
                                  NO POSEE CI / CERTIFICADO
                                </span>
                              </ng-template>
                            </div>
                          </div>
                          <button class="btn btn-phoenix-secondary btn-sm fs--2" (click)="showModalBeneficiarios = true">
                            <span class="fas fa-user-edit me-1"></span>Cambiar Carga
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- SECCIÓN SI EL RECEPTOR ES EL MISMO TITULAR -->
                  <div class="mt-4 pt-3 border-top border-dashed border-400 text-center" *ngIf="!beneficiarioSeleccionado.es_carga">
                    <div class="d-inline-block px-3 py-1 rounded-pill bg-soft-success-fefo border border-success-subtle">
                      <span class="fas fa-check-circle text-success me-2"></span>
                      <span class="fs--1 fw-bold text-success-emphasis text-uppercase">El beneficio será entregado directamente al titular</span>
                    </div>
                    <div class="mt-2 text-center">
                        <button class="btn btn-phoenix-secondary btn-sm fs--2" (click)="showModalBeneficiarios = true">
                            <span class="fas fa-users me-1"></span>Asignar a Carga Familiar
                        </button>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Placeholder cuando no hay selección -->
              <div class="py-4 text-center border-200 border border-dashed rounded-3" *ngIf="!beneficiarioSeleccionado">
                <span class="fas fa-id-card fs-2 text-300 mb-2"></span>
                <p class="text-600 mb-0">Consulte un titular por cédula para seleccionar el receptor.</p>
              </div>
            </div>

            <!-- Paso 3: Observaciones y Finalizado -->
            <div>
              <div class="d-flex align-items-center mb-3">
                <span class="step-number me-2">3</span>
                <h5 class="mb-0 text-1000">Resumen y Observaciones</h5>
              </div>
              
              <div class="row g-3 mb-4 align-items-stretch">
                <div class="col-md-2 d-flex flex-column">
                  <label class="form-label fs--2 text-700 text-uppercase">Total</label>
                  <div class="form-control form-control-sm bg-body-quaternary fw-bold d-flex align-items-center justify-content-center flex-grow-1">
                    <span class="badge badge-phoenix badge-phoenix-info fs-0">{{ getTotalUnidades() }}</span>
                  </div>
                </div>
                <div class="col-md-3 d-flex flex-column">
                  <label class="form-label fs--2 text-700 text-uppercase fw-bold">Médico Tratante</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="medicoTratante" placeholder="NOMBRE DEL MÉDICO..." appUppercase (keydown)="prevenirCaracteresInvalidos($event, false)" (input)="filtrarTexto($event, 'medicoTratante', false)">
                </div>
                <div class="col-md-3 d-flex flex-column">
                  <label class="form-label fs--2 text-700 text-uppercase fw-bold">Especialidad</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="especialidad" placeholder="EJ: PEDIATRÍA..." appUppercase (keydown)="prevenirCaracteresInvalidos($event, false)" (input)="filtrarTexto($event, 'especialidad', false)">
                </div>
                <div class="col-md-4 d-flex flex-column">
                  <label class="form-label fs--2 text-700 text-uppercase">Nota / Observación</label>
                  <textarea 
                    class="form-control form-control-sm flex-grow-1" 
                    [(ngModel)]="observaciones" 
                    placeholder="MOTIVO O REFERENCIA..."
                    rows="1"
                    maxlength="250"
                    style="resize: none;"
                    appUppercase
                    (keydown)="prevenirCaracteresInvalidos($event, true)"
                    (input)="filtrarTexto($event, 'observaciones', true)"
                  ></textarea>
                </div>
              </div>

              <button
                class="btn btn-primary w-100 fs-0 py-2"
                (click)="procesarDespacho()"
                [disabled]="!puedeDespachar() || isLoading"
              >
                <span class="fas fa-truck-loading me-2" *ngIf="!isLoading"></span>
                <span class="spinner-border spinner-border-sm me-2" *ngIf="isLoading"></span>
                {{ isLoading ? 'Procesando entrega...' : 'Confirmar y Entregar Medicamentos' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra Lateral Informativa -->
      <div class="col-12 col-xl-4">
        <div class="card shadow-none border border-300 mb-3 anim-scale-up delay-100">
          <div class="card-header border-bottom border-300 bg-body-tertiary py-3">
            <h5 class="mb-0 text-1000"><span class="fas fa-info-circle me-2 text-primary"></span>Acerca del Sistema FEFO</h5>
          </div>
          <div class="card-body">
            <p class="fs--1 text-900 lh-sm"><strong>FEFO</strong> (First Expired, First Out) Prioriza automáticamente los lotes más cercanos a su vencimiento.</p>
            <h6 class="text-uppercase text-800 fs--2 mb-2 fw-bold">Leyenda de Semáforo</h6>
            <div class="d-flex flex-column gap-2">
              <div class="p-2 border border-success rounded-2 bg-soft-success-fefo">
                <span class="fas fa-circle text-success me-2 fs--2"></span>
                <span class="fs--2 text-1000 fw-bold">ÓPTIMO: Vigente y saludable.</span>
              </div>
              <div class="p-2 border border-warning rounded-2 bg-soft-warning-fefo">
                <span class="fas fa-circle text-warning me-2 fs--2"></span>
                <span class="fs--2 text-1000 fw-bold">PRÓXIMO: Vence en < 4 meses.</span>
              </div>
              <div class="p-2 border border-danger rounded-2 bg-soft-danger-fefo">
                <span class="fas fa-circle text-danger me-2 fs--2"></span>
                <span class="fs--2 text-1000 fw-bold">VENCIDO: No despachable.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Búsqueda de Medicamentos (Fijo) -->
    <div class="modal fade show" [class.d-block]="showModalLupa" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-translucent shadow-lg">
          <div class="modal-header border-bottom border-translucent bg-body-tertiary">
            <h5 class="modal-title text-body-emphasis">Catálogo de Inventario Disponible</h5>
            <button class="btn-close" type="button" (click)="showModalLupa = false"></button>
          </div>
          <div class="modal-body p-0">
            <div class="p-3 border-bottom border-translucent bg-body-secondary">
              <div class="search-box w-100">
                <div class="input-group">
                  <span class="input-group-text bg-transparent"><span class="fas fa-search"></span></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    placeholder="Buscar por nombre genérico o número de lote..." 
                    [(ngModel)]="medicamentoBusqueda" 
                    (input)="buscarMedicamento()" 
                    appUppercase 
                  />
                </div>
              </div>
            </div>
            
            <div class="table-responsive scrollbar" style="min-height: 420px;">
              <table class="table table-sm table-hover mb-0 fs--1">
                <thead class="bg-body-secondary sticky-top">
                  <tr>
                    <th class="ps-3 py-2" style="width: 25%">Medicamento / Presentación</th>
                    <th class="py-2" style="width: 25%">Principios Activos / Componentes</th>
                    <th class="py-2">Lote</th>
                    <th class="text-center py-2">Estado</th>
                    <th class="text-end pe-3 py-2">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Estado: Skeletons (Cargando) -->
                  <ng-container *ngIf="isLoadingModal">
                    <tr [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 200) + 'ms'" class="anim-slide-right" *ngFor="let n of [1,2,3,4,5]; let idx = index">
                      <td class="ps-3 align-middle py-3">
                        <div class="skeleton-h8 w-75 mb-2"></div>
                        <div class="skeleton-h5 w-50"></div>
                      </td>
                      <td class="align-middle py-3">
                        <div class="skeleton-h8 w-90"></div>
                      </td>
                      <td class="align-middle py-3">
                        <div class="skeleton-h8 w-75"></div>
                      </td>
                      <td class="align-middle text-center py-3">
                        <div class="skeleton-h12 w-50 mx-auto rounded-pill"></div>
                      </td>
                      <td class="align-middle text-end pe-3 py-3">
                        <div class="skeleton-h8 w-25 ms-auto"></div>
                      </td>
                    </tr>
                  </ng-container>

                  <!-- Estado: Lista Pagina -->
                  <ng-container *ngIf="!isLoadingModal">
                    <tr [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 200) + 'ms'" class="anim-slide-right" *ngFor="let m of pagedMedicines; let idx = index" (click)="seleccionarMedicamento(m)" style="cursor: pointer">
                      <td class="ps-3 align-middle py-2">
                        <div class="fw-bold text-1100 fs-0 text-uppercase">{{ (m.medicamento_detallado || m.nombre_generico).split(' - ')[0] }}</div>
                        <div class="text-600 fs--2">{{ m.presentacion }}</div>
                      </td>
                      <td class="align-middle text-600 py-2">
                        <div class="d-flex flex-wrap gap-1" *ngIf="m.componentes_json?.length; else sinComponentesModal">
                          <span class="badge badge-phoenix badge-phoenix-secondary fs--2" *ngFor="let comp of m.componentes_json">
                            {{ comp.nombre_principio }} {{ comp.concentracion_valor }} {{ comp.nombre_unidad }}
                          </span>
                        </div>
                        <ng-template #sinComponentesModal>
                          <span class="text-500 fs--2">Sin principios activos</span>
                        </ng-template>
                      </td>
                      <td class="align-middle py-2"><code class="text-primary fw-bold">{{ m.numero_lote }}</code></td>
                      <td class="align-middle text-center py-2">
                        <span class="badge badge-phoenix fs--2" [class]="'badge-phoenix-' + m.color_clase">
                          {{ m.estado_logico }}
                        </span>
                      </td>
                      <td class="align-middle text-end pe-3 py-2">
                        <span class="fw-bolder fs-0 text-1000">{{ m.existencia }}</span>
                      </td>
                    </tr>
                  </ng-container>

                  <!-- Estado: Sin Resultados -->
                  <tr *ngIf="!isLoadingModal && resultadosMedicamentos.length === 0">
                    <td colspan="5" class="text-center py-5">
                      <span class="fas fa-search-minus fs-3 text-300 d-block mb-2"></span>
                      <p class="text-700 mb-0">No se encontraron resultados para "{{ medicamentoBusqueda }}"</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer border-top border-translucent justify-content-between bg-body-tertiary py-2" *ngIf="resultadosMedicamentos.length > 0 && !isLoadingModal">
            <div class="fs--2 text-700">
               Mostrando <b>{{ (paginaActual-1)*itemsPorPagina + 1 }}</b>-<b>{{ Math.min(paginaActual*itemsPorPagina, resultadosMedicamentos.length) }}</b> de <b>{{ resultadosMedicamentos.length }}</b> medicinas
            </div>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" [class.disabled]="paginaActual === 1">
                  <a class="page-link" href="javascript:void(0)" (click)="paginaActual = paginaActual - 1"><span class="fas fa-chevron-left"></span></a>
                </li>
                <li class="page-item active"><a class="page-link" href="javascript:void(0)">{{ paginaActual }} de {{ totalPaginas }}</a></li>
                <li class="page-item" [class.disabled]="paginaActual === totalPaginas">
                  <a class="page-link" href="javascript:void(0)" (click)="paginaActual = paginaActual + 1"><span class="fas fa-chevron-right"></span></a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Selección de Beneficiario (Titular/Cargas) -->
    <div class="modal fade show" [class.d-block]="showModalBeneficiarios" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-300 shadow-lg">
          <div class="modal-header border-bottom border-300 bg-body-tertiary">
            <h5 class="modal-title text-1000">Seleccionar Receptor del Beneficio</h5>
            <button class="btn-close" type="button" (click)="showModalBeneficiarios = false"></button>
          </div>
          <div class="modal-body p-0" *ngIf="titularEncontrado">
            <!-- Mini Ficha del Titular (Cabecera del Modal) -->
            <div class="p-3 bg-body-secondary border-bottom border-300">
              <div class="row align-items-center g-3">
                <div class="col-auto">
                  <div class="avatar avatar-3xl bg-primary-subtle text-primary rounded-circle shadow-sm">
                    <span class="fas fa-id-badge fs-2"></span>
                  </div>
                </div>
                <div class="col">
                  <div class="d-flex align-items-center mb-1">
                    <h6 class="text-uppercase text-800 fs--2 fw-bold ls-1 mb-0">Titular Responsable</h6>
                    <span class="badge badge-phoenix badge-phoenix-primary ms-2 fs--2">ACTIVO</span>
                  </div>
                  <h4 class="mb-1 text-1000 fw-bolder">{{ titularEncontrado.nombres_titular }} {{ titularEncontrado.apellidos_titular }}</h4>
                  <div class="d-flex flex-wrap align-items-center gap-x-3 gap-y-1">
                    <div class="text-700 fs--1">
                      <span class="fas fa-fingerprint me-1 text-primary"></span>
                      <span class="fw-bold">V-{{ titularEncontrado.cedula | cedula }}</span>
                    </div>
                    <div class="text-300 d-none d-sm-block">|</div>
                    <div class="text-700 fs--1 text-uppercase">
                      <span class="fas fa-network-wired me-1 text-primary"></span>
                      {{ titularEncontrado.dependencia }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="table-responsive">
              <table class="table table-hover mb-0 fs--1">
                <thead class="bg-body-tertiary">
                  <tr>
                    <th class="ps-3" style="width: 50px"></th>
                    <th>Nombre Completo</th>
                    <th>CI / Certificado</th>
                    <th class="text-center">Parentesco</th>
                    <th class="text-center">Sexo</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Opción: Titular mismo -->
                  <tr (click)="seleccionarBeneficiarioFinal(titularEncontrado, 'TITULAR')" style="cursor: pointer">
                    <td class="ps-3 align-middle text-center">
                      <div class="form-check mb-0">
                        <input class="form-check-input" type="radio" name="benef_radio" [checked]="beneficiarioSeleccionado?.parentesco === 'TITULAR'" />
                      </div>
                    </td>
                    <td class="align-middle fw-bold text-primary">
                      <div class="d-flex align-items-center">
                        <span class="fas fa-user-check me-2 fs--1"></span>
                        {{ titularEncontrado.nombres_titular }} {{ titularEncontrado.apellidos_titular }}
                      </div>
                    </td>
                    <td class="align-middle">
                      <span class="badge badge-phoenix badge-phoenix-primary fs--1">V-{{ titularEncontrado.cedula | cedula }}</span>
                    </td>
                    <td class="align-middle text-center">
                      <span class="badge badge-phoenix badge-phoenix-primary">TITULAR</span>
                    </td>
                    <td class="align-middle text-center">
                      <span class="badge" [class]="titularEncontrado.sexo === 'M' ? 'badge-gender-blue' : 'badge-gender-pink'">
                        {{ titularEncontrado.sexo }}
                      </span>
                    </td>
                  </tr>

                  <!-- Opciones: Cargas Familiares -->
                  <tr [style.animation-delay]="((idx < 8 ? idx * 50 : 400) + 200) + 'ms'" class="anim-slide-right" *ngFor="let carga of titularEncontrado.cargas_familiares; let idx = index" (click)="seleccionarBeneficiarioFinal(carga, 'CARGA')" style="cursor: pointer">
                    <td class="ps-3 align-middle text-center">
                      <div class="form-check mb-0">
                        <input class="form-check-input" type="radio" name="benef_radio" [checked]="beneficiarioSeleccionado?.id_original === (carga.cedula_beneficiario)" />
                      </div>
                    </td>
                    <td class="align-middle fw-bold text-1000">
                       <div class="d-flex align-items-center">
                        <span class="fas fa-user-friends me-2 fs--1 text-500"></span>
                        {{ carga.nombres }} {{ carga.apellidos }}
                      </div>
                    </td>
                    <td class="align-middle">
                      <ng-container *ngIf="carga.posee_cedula; else sinCedula">
                        <span class="badge badge-phoenix badge-phoenix-primary fs--1">
                          V-{{ carga.cedula_beneficiario | cedula }}
                        </span>
                      </ng-container>
                      <ng-template #sinCedula>
                        <span class="badge badge-phoenix badge-phoenix-warning fs--1" *ngIf="carga.cedula_beneficiario">
                          {{ carga.cedula_beneficiario }}
                        </span>
                        <span class="badge badge-phoenix badge-phoenix-danger fs--1" *ngIf="!carga.cedula_beneficiario">
                          NO POSEE CI / CERTIFICADO
                        </span>
                      </ng-template>
                    </td>
                    <td class="align-middle text-center">
                      <span class="badge badge-phoenix badge-phoenix-info text-uppercase">{{ carga.parentesco }}</span>
                    </td>
                    <td class="align-middle text-center">
                      <span class="badge" [class]="carga.sexo === 'M' ? 'badge-gender-blue' : 'badge-gender-pink'">
                        {{ carga.sexo }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer border-top border-300">
            <button class="btn btn-phoenix-secondary btn-sm" type="button" (click)="showModalBeneficiarios = false">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  
    </div>
  `
})
export class DespachoComponent implements OnInit {
  medicamentoBusqueda = '';
  resultadosMedicamentos: BusquedaMedicamento[] = [];
  itemsSeleccionados: ItemDespacho[] = [];
  cedulaInput = '';
  cedulaVisual = '';
  titularEncontrado: Titular | null = null;
  beneficiarioSeleccionado: any = null;
  buscandoBenef = false;
  observaciones = '';
  medicoTratante = '';
  especialidad = '';
  isLoading = false;
  showModalLupa = false;
  showModalBeneficiarios = false;
  isLoadingModal = false;
  currentTime = new Date();
  private clockInterval: any;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private cedulaPipe = new CedulaPipe();
  protected readonly Math = Math;

  // Paginación de Medicina
  paginaActual = 1;
  itemsPorPagina = 5;
  get totalPaginas(): number {
    return Math.ceil(this.resultadosMedicamentos.length / this.itemsPorPagina);
  }
  get pagedMedicines(): BusquedaMedicamento[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.resultadosMedicamentos.slice(inicio, inicio + this.itemsPorPagina);
  }

  readonly MAX_ITEMS_DISTINTOS = 5;
  readonly MAX_CANTIDAD_POR_ITEM = 50;
  readonly MAX_CEDULA = 99999999;

  getGenerico(detallado: string): string {
    if (!detallado) return '';
    return detallado.split(' (')[0];
  }

  getComponentes(detallado: string): string {
    if (!detallado) return '';
    const parts = detallado.split(' (');
    return parts.length > 1 ? parts[1].replace(')', '') : 'Sin componentes';
  }

  constructor(
    private despachoService: DespachoService,
    private swal: SwalService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Reloj en tiempo real para el despacho
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    }, 1000);

    // Escuchar cambios en los parámetros de consulta (ID de lote desde inventario)
    this.route.queryParams.subscribe(params => {
      const idLote = params['id_lote'];
      if (idLote) {
        this.despachoService.buscarMedicamento('').subscribe(res => {
          const found = res.find(m => m.id_lote === Number(idLote));
          if (found) {
            this.seleccionarMedicamento(found);
            this.cdr.detectChanges();
          }
        });
      }
    });

    // Configurar el buscador con Debounce y SwitchMap para evitar "Broken Pipes"
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(350),           // Esperar 350ms después de que el usuario deje de escribir
      switchMap(termino => {
        this.isLoadingModal = true;
        this.paginaActual = 1; // Resetear página al buscar
        this.cdr.detectChanges();
        return this.despachoService.buscarMedicamento(termino).pipe(
          timeout(10000),
          finalize(() => {
            this.isLoadingModal = false;
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe({
      next: (res) => {
        this.resultadosMedicamentos = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error en búsqueda:', err);
        // Si hay un error real (no cancelación), mostramos el mensaje
        this.swal.error('Error', 'No se pudo consultar el inventario. Intente de nuevo.');
        this.isLoadingModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
  }

  onCedulaChange(valor: string): void {
    // 1. Limpiamos: Solo números
    const soloNumeros = valor.replace(/\D/g, '');
    
    // 2. Validamos Rango (1 a 99.999.999)
    let num = Number(soloNumeros);
    if (num > this.MAX_CEDULA) {
      num = this.MAX_CEDULA;
    }
    
    // 3. Guardamos el valor crudo para el API
    this.cedulaInput = num > 0 ? num.toString() : '';
    
    // 4. Formateamos visualmente con puntos (regex de mil)
    this.cedulaVisual = num > 0 ? num.toLocaleString('de-DE') : '';
    
    this.cdr.detectChanges();
  }

  buscarMedicamento(): void {
    // Simplemente notificamos al subject, el pipe configurado en ngOnInit hará el resto
    this.searchSubject.next(this.medicamentoBusqueda);
  }

  abrirModalLupa(): void {
    this.swal.loading('Cargando Catálogo FEFO...', 'Sincronizando inventario con farmacia...');
    
    // Consultar medicinas antes de abrir el modal con un breve delay estético de 1s
    this.despachoService.buscarMedicamento('').pipe(delay(1000)).subscribe({
      next: (data) => {
        this.resultadosMedicamentos = data;
        this.medicamentoBusqueda = '';
        this.paginaActual = 1;
        this.isLoadingModal = false;
        
        // Cerramos el loading y abrimos el modal limpio
        this.swal.close();
        this.showModalLupa = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.swal.error('Error de Conexión', 'No se pudo obtener el inventario disponible.');
      }
    });
  }

  seleccionarMedicamento(m: BusquedaMedicamento): void {
    if (m.existencia <= 0) {
      this.swal.warning('Sin Existencia', 'Este lote no tiene existencias.');
      return;
    }
    if (m.estado_logico === 'VENCIDO') {
      this.swal.error('Lote Vencido', 'No se pueden despachar medicamentos vencidos.');
      return;
    }

    const index = this.itemsSeleccionados.findIndex(i => i.id_lote === m.id_lote);
    if (index >= 0) {
      const actual = this.itemsSeleccionados[index].cantidadSolicitada;
      
      // Priorizar mensaje de existencia físico
      if (actual >= m.existencia) {
        const txtUnidad = m.existencia === 1 ? 'unidad' : 'unidades';
        this.swal.warning('Existencia Insuficiente', `Solo queda ${m.existencia} ${txtUnidad} de ${m.nombre_generico} en el inventario.`);
        return;
      }

      // Luego validación de política (50 unidades)
      if (actual >= this.MAX_CANTIDAD_POR_ITEM) {
        this.swal.warning('Límite Alcanzado', `Por políticas del sistema, el máximo permitido es de ${this.MAX_CANTIDAD_POR_ITEM} unidades por medicamento.`);
        return;
      }

      this.itemsSeleccionados[index].cantidadSolicitada++;
    } else {
      if (this.itemsSeleccionados.length >= this.MAX_ITEMS_DISTINTOS) {
        this.swal.warning('Límite de Items', `Máximo ${this.MAX_ITEMS_DISTINTOS} medicamentos distintos por despacho.`);
        return;
      }
      this.itemsSeleccionados.push({ ...m, cantidadSolicitada: 1 });
    }

    this.medicamentoBusqueda = '';
    this.showModalLupa = false;
  }

  removerItem(i: number): void { this.itemsSeleccionados.splice(i, 1); }

  validarExistenciaItem(item: ItemDespacho): void {
    const val = Number(item.cantidadSolicitada);
    
    // 1. Validar existencia físico disponible (Prioritario)
    if (val > item.existencia) {
      item.cantidadSolicitada = item.existencia;
      const txtUnidad = item.existencia === 1 ? 'unidad' : 'unidades';
      this.swal.warning('Existencia Insuficiente', 
        `Solo hay ${item.existencia} ${txtUnidad} de ${item.nombre_generico} en inventario. No se puede exceder esta cantidad.`
      );
      return;
    }

    // 2. Validar tope máximo por política (50 unidades)
    if (val > this.MAX_CANTIDAD_POR_ITEM) {
       item.cantidadSolicitada = this.MAX_CANTIDAD_POR_ITEM;
       this.swal.warning('Límite de Entrega', `Por políticas de seguridad, el máximo permitido por medicamento es de ${this.MAX_CANTIDAD_POR_ITEM} unidades.`);
       return;
    }
  }

  getTotalUnidades(): number {
    return this.itemsSeleccionados.reduce((acc, curr) => {
      const cant = Number(curr.cantidadSolicitada) || 0;
      return acc + cant;
    }, 0);
  }

  buscarBeneficiario(): void {
    const rawCedula = this.cedulaInput;
    if (!rawCedula) return;

    // Resetear estados previos para evitar mostrar datos viejos o modales vacíos
    this.showModalBeneficiarios = false;
    this.titularEncontrado = null;
    this.beneficiarioSeleccionado = null;

    import('sweetalert2').then((Swal) => {
      Swal.default.fire({
        title: 'Cargando...',
        text: 'Consultando base de datos de Bienestar Social. Por favor espere.',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.default.showLoading();
          this.ejecutarBusquedaBeneficiario(rawCedula);
        }
      });
    });
  }

  private ejecutarBusquedaBeneficiario(cedula: string): void {
    this.despachoService.buscarBeneficiario(cedula).subscribe({
      next: (res) => {
        import('sweetalert2').then(Swal => Swal.default.close());
        if (res && res.disponible) {
          this.titularEncontrado = res;
          this.showModalBeneficiarios = true;
        } else {
          this.swal.error('Titular No Encontrado', res?.mensaje || 'La cédula no existe en la base de Bienestar Social.');
          this.cedulaVisual = '';
          this.cedulaInput = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        import('sweetalert2').then(Swal => Swal.default.close());
        this.swal.error('Error de Conexión', 'No se pudo conectar con el servicio de Bienestar.');
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarBeneficiarioFinal(data: any, tipo: 'TITULAR' | 'CARGA'): void {
    if (tipo === 'TITULAR') {
      this.beneficiarioSeleccionado = {
        cedula: data.cedula,
        nombres: data.nombres_titular,
        apellidos: data.apellidos_titular,
        parentesco: 'TITULAR',
        sexo: data.sexo,
        es_carga: false,
        posee_cedula: true,
        id_original: data.cedula,
        correo: data.correo_electronico || '',
        telefono: data.telefono_principal || ''
      };
    } else {
      this.beneficiarioSeleccionado = {
        cedula: data.cedula_beneficiario,
        nombres: data.nombres,
        apellidos: data.apellidos,
        parentesco: data.parentesco,
        sexo: data.sexo,
        es_carga: true,
        posee_cedula: data.posee_cedula,
        id_original: data.cedula_beneficiario,
        correo: '',
        telefono: data.telefono_celular || ''
      };
    }
    this.showModalBeneficiarios = false;
    this.cdr.detectChanges();
  }

  prevenirCaracteresInvalidos(event: KeyboardEvent, permiteNumeros: boolean = false): void {
    // Si es la primera tecla y es un espacio, bloquearlo
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (event.key === ' ' && input.selectionStart === 0) {
      event.preventDefault();
      return;
    }
    
    // Permitir teclas de control (BackSpace, Tab, Flechas, etc)
    if (event.key.length > 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Regex según si permite números o no
    const regex = permiteNumeros ? /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,-]$/ : /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/;
    if (!regex.test(event.key)) {
      event.preventDefault();
    }
  }

  filtrarTexto(event: any, campo: 'medicoTratante' | 'especialidad' | 'observaciones', permiteNumeros: boolean = false): void {
    let valor = event.target.value;
    // Remover espacios al inicio
    valor = valor.replace(/^\s+/, '');
    // Remover números y caracteres especiales si aplica
    if (!permiteNumeros) {
      valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    } else {
      valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,-]/g, '');
    }
    this[campo] = valor;
  }

  puedeDespachar(): boolean {
    return this.itemsSeleccionados.length > 0 && !!this.beneficiarioSeleccionado;
  }

  procesarDespacho(): void {
    if (this.isLoading) return;

    // 1. Validar que haya medicamentos seleccionados
    if (this.itemsSeleccionados.length === 0) {
      this.swal.warning('Falta Información', 'Debe seleccionar al menos un medicamento en el carrito de despacho.');
      return;
    }

    // 2. Validar que se haya seleccionado un beneficiario
    if (!this.beneficiarioSeleccionado) {
      this.swal.warning('Falta Información', 'Debe consultar y seleccionar un beneficiario (titular o carga familiar).');
      return;
    }

    // 3. Validar cantidades solicitadas
    const cantidadInvalida = this.itemsSeleccionados.some(i => !i.cantidadSolicitada || i.cantidadSolicitada <= 0);
    if (cantidadInvalida) {
      this.swal.warning('Cantidad Inválida', 'Asegúrese de que todos los medicamentos seleccionados tengan una cantidad mayor a 0.');
      return;
    }

    // 4. Validar Médico Tratante
    if (!this.medicoTratante || this.medicoTratante.trim().length === 0) {
      this.swal.warning('Falta Información', 'Por favor, ingrese el nombre del Médico Tratante.');
      return;
    }

    // 5. Validar Especialidad
    if (!this.especialidad || this.especialidad.trim().length === 0) {
      this.swal.warning('Falta Información', 'Por favor, ingrese la Especialidad del médico.');
      return;
    }

    // 6. Validar Nota / Observación
    if (!this.observaciones || this.observaciones.trim().length === 0) {
      this.swal.warning('Falta Información', 'Por favor, ingrese una Nota / Observación para justificar el despacho.');
      return;
    }

    // 7. Validar Correo Electrónico (si se introduce)
    const email = this.titularEncontrado?.correo_electronico?.trim();
    if (email && email.length > 0) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        this.swal.warning('Formato Inválido', 'El correo electrónico ingresado no tiene un formato válido (ejemplo: correo@dominio.com). Por favor, corríjalo antes de continuar.');
        return;
      }
    }

    const htmlTicket = this.generarHtmlTicket();

    // Importación dinámica de Swal para usar funcionalidades avanzadas de HTML
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: '<span class="text-uppercase fw-bolder fs-1">Comprobante de Entrega</span>',
        html: htmlTicket,
        showCancelButton: true,
        confirmButtonText: '<span class="fas fa-check-circle me-2"></span>Confirmar Entrega',
        cancelButtonText: '<span class="fas fa-times-circle me-2"></span>Corregir',
        confirmButtonColor: '#00d27a',
        cancelButtonColor: '#e63757',
        width: '550px',
        customClass: {
          container: 'swal2-dark-mode-compatible'
        }
      }).then(result => {
        if (result.isConfirmed) {
          this.ejecutarDespacho();
        }
      });
    });
  }

  private ejecutarDespacho(): void {
    this.isLoading = true;
    this.swal.loading('Registrando en base de datos...');
    
    this.despachoService.procesarDespacho({
      articulos: this.itemsSeleccionados.map(i => ({ id_lote: i.id_lote, cantidad: i.cantidadSolicitada })),
      cedula_beneficiario: this.beneficiarioSeleccionado.cedula,
      nombre_beneficiario: `${this.beneficiarioSeleccionado.nombres} ${this.beneficiarioSeleccionado.apellidos}`.toUpperCase(),
      correo_beneficiario: this.titularEncontrado?.correo_electronico,
      telefono_beneficiario: this.titularEncontrado?.telefono_principal,
      parentesco_beneficiario: this.beneficiarioSeleccionado.parentesco,
      sexo_beneficiario: this.beneficiarioSeleccionado.sexo,
      es_carga: this.beneficiarioSeleccionado.es_carga,
      observaciones: this.observaciones,
      medico_tratante: this.medicoTratante,
      especialidad: this.especialidad,
      titular_cedula: this.titularEncontrado?.cedula?.toString(),
      titular_nombre: `${this.titularEncontrado?.nombres_titular} ${this.titularEncontrado?.apellidos_titular}`.toUpperCase()
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.swal.success('¡Operación Exitosa!', 'El despacho ha sido registrado y el inventario actualizado.');
        this.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        const em = err.error;
        let msg = 'No se pudo completar el despacho. Intente de nuevo.';
        if (em?.correo_beneficiario) {
          msg = 'El correo electrónico del titular no es válido.\nPor favor corríjalo en el campo "Correo del Titular" y vuelva a intentar.';
        } else if (em?.telefono_beneficiario) {
          msg = 'El teléfono del titular no es válido.\nPor favor corríjalo en el campo "Teléfono del Titular" y vuelva a intentar.';
        } else if (em?.detail) {
          msg = em.detail;
        }
        this.swal.error('Atención', msg);
      }
    });
  }

  private generarHtmlTicket(): string {
    const user = this.auth.getCurrentUser();
    const fecha = this.currentTime.toLocaleString('es-VE', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    let itemsHtml = '';
    this.itemsSeleccionados.forEach(item => {
      itemsHtml += `
        <tr>
          <td class="py-2">
            <div class="ticket-item-name">${item.nombre_generico}</div>
            <div class="ticket-item-sub">LOT: ${item.numero_lote} | ${item.presentacion}</div>
          </td>
          <td class="text-end ticket-item-qty">${item.cantidadSolicitada}</td>
        </tr>
      `;
    });

    return `
      <div class="despacho-ticket">
        <div class="ticket-header">
          <h3>Farmacia - DEM</h3>
          <div class="fs--2 fw-bold text-700">SISTEMA DE CONTROL DE INSUMOS</div>
          <div class="fs--2 text-600 mt-1">${fecha}</div>
        </div>

        <div class="ticket-section">
          <div class="ticket-section-title">Datos del Titular Responsable</div>
          <div class="fw-bold text-1100 fs-0">${this.titularEncontrado?.nombres_titular} ${this.titularEncontrado?.apellidos_titular}</div>
          <div class="text-700 fs--1">C.I. V-${this.cedulaPipe.transform(this.titularEncontrado?.cedula)}</div>
          <div class="text-600 fs--2 mt-1">Contacto: ${this.titularEncontrado?.correo_electronico || 'N/A'} | ${this.titularEncontrado?.telefono_principal || 'N/A'}</div>
        </div>

        ${this.beneficiarioSeleccionado?.es_carga ? `
          <div class="ticket-section border-top border-dashed pt-2">
            <div class="ticket-section-title">Receptor del Beneficio (Carga)</div>
            <div class="fw-bold text-1100 fs-0">${this.beneficiarioSeleccionado.nombres} ${this.beneficiarioSeleccionado.apellidos}</div>
            <div class="text-700 fs--1">${this.beneficiarioSeleccionado.parentesco} | ${this.beneficiarioSeleccionado.posee_cedula ? 'C.I.' : 'CERT'}: ${this.beneficiarioSeleccionado.posee_cedula ? this.cedulaPipe.transform(this.beneficiarioSeleccionado.cedula) : this.beneficiarioSeleccionado.cedula}</div>
          </div>
        ` : `
          <div class="ticket-section border-top border-dashed pt-2">
            <div class="fs--2 fw-bold text-success text-uppercase">Entrega directa al titular</div>
          </div>
        `}

        <div class="ticket-section border-top border-dashed pt-2">
          <div class="ticket-section-title">Información Médica</div>
          <div class="text-800 fs--1"><span class="fw-bold">Médico:</span> ${this.medicoTratante || 'N/A'}</div>
          <div class="text-800 fs--1"><span class="fw-bold">Especialidad:</span> ${this.especialidad || 'GENERAL'}</div>
        </div>

        <div class="ticket-section">
          <div class="ticket-section-title">Responsable de Entrega</div>
          <div class="fw-bold text-1100 fs-0">${user?.first_name} ${user?.last_name}</div>
          <div class="text-700 fs--1">C.I. V-${this.cedulaPipe.transform(user?.username)}</div>
        </div>

        <table class="ticket-table">
          <thead>
            <tr>
              <th class="text-start">Descripción del Insumo</th>
              <th class="text-end">Und.</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="ticket-footer d-flex justify-content-between align-items-center">
          <div class="ticket-total-label text-uppercase">Total Entregado</div>
          <div class="ticket-total-value">${this.getTotalUnidades()}</div>
        </div>

        ${this.observaciones ? `
          <div class="ticket-notes">
            <div class="fw-bold text-uppercase fs--2 mb-1">Observaciones:</div>
            <div>${this.observaciones}</div>
          </div>
        ` : ''}

        <div class="mt-4 fs--2 text-center text-500 border-top border-dashed pt-2">
          Comprobante de auditoría digital generado por Sistema Farmacia-DEM.
        </div>
      </div>
    `;
  }

  resetForm(): void {
    this.itemsSeleccionados = [];
    this.cedulaInput = '';
    this.cedulaVisual = '';
    this.titularEncontrado = null;
    this.beneficiarioSeleccionado = null;
    this.observaciones = '';
    this.medicamentoBusqueda = '';
    this.cdr.detectChanges();
  }
}
