import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { MedicamentosService } from '../../core/services/medicamentos.service';
import { PrincipiosActivosService } from '../../core/services/principios-activos.service';
import { SwalService } from '../../core/services/swal.service';
import { CatalogoItem, MedicamentoBase, ComponenteDetalle } from '../../core/models/farmacia.models';
import { AuthService } from '../../core/services/auth.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-medicamentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="mb-5">
      <div class="row g-3 justify-content-between align-items-end">
        <div class="col-auto">
          <h2 class="mb-2 text-body-emphasis">Catálogo de Medicamentos</h2>
          <h5 class="text-700 fw-semi-bold">Gestión de base de datos de productos farmacéuticos</h5>
        </div>
        <div class="col-auto">
          <button class="btn btn-primary px-4" (click)="abrirModal()">
            <span class="fas fa-plus me-2"></span>Nuevo Medicamento
          </button>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-12 col-md-4">
        <div class="card h-100 shadow-none border-translucent">
          <div class="card-body text-center d-flex flex-column justify-content-center">
            <h4 class="text-body-emphasis mb-1" *ngIf="!isLoading">{{ totalItems | number }}</h4>
            <div class="skeleton skeleton-text-lg mx-auto" style="width: 40px" *ngIf="isLoading"></div>
            <p class="text-500 fs--1 mb-0"><span class="fas fa-boxes me-1"></span>Total Productos Base</p>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card h-100 shadow-none border-translucent">
          <div class="card-body text-center d-flex flex-column justify-content-center">
            <h4 class="text-primary mb-1" *ngIf="catalogos.presentaciones.length > 0">{{ catalogos.presentaciones.length | number }}</h4>
            <div class="skeleton skeleton-text-lg mx-auto" style="width: 40px" *ngIf="catalogos.presentaciones.length === 0"></div>
            <p class="text-500 fs--1 mb-0"><span class="fas fa-tags me-1 text-primary"></span>Total Presentaciones</p>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <a routerLink="/inventario" class="text-decoration-none">
          <div class="card h-100 shadow-none border-translucent bg-primary-subtle hover-bg-primary-subtle transition-base cursor-pointer">
            <div class="card-body text-center d-flex flex-column justify-content-center">
              <h4 class="text-primary-darker mb-1" *ngIf="!isLoading">{{ totalExistenciaGlobal | number }}</h4>
              <div class="skeleton skeleton-text-lg mx-auto" style="width: 40px" *ngIf="isLoading"></div>
              <p class="text-primary fs--1 mb-0 fw-bold"><span class="fas fa-warehouse me-1"></span>Existencia Global</p>
            </div>
          </div>
        </a>
      </div>
    </div>

    <div class="card shadow-none border-translucent mb-3">
      <div class="card-header border-bottom border-translucent bg-body-emphasis">
        <div class="row g-3 justify-content-between align-items-center">
          <div class="col-auto">
            <h4 class="mb-0 text-body-emphasis">Listado de Medicamentos</h4>
          </div>
          <div class="col-auto">
            <div class="search-box" style="width: 20rem;">
              <div class="position-relative">
                <input
                  type="text"
                  class="form-control form-control-sm search-input text-truncate"
                  placeholder="Buscar por nombre o principio activo..."
                  (input)="onBusqueda($event)"
                />
                <span class="fas fa-search search-box-icon text-500"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive scrollbar">
          <table class="table table-sm fs--1 mb-0">
            <thead>
              <tr>
                <th class="white-space-nowrap align-middle ps-4 text-900 py-3" scope="col">Medicamento Comercial/Genérico</th>
                <th class="white-space-nowrap align-middle text-900 py-3" scope="col">Principios Activos / Componentes</th>
                <th class="white-space-nowrap align-middle text-900 py-3" scope="col">Presentación</th>
                <th class="white-space-nowrap align-middle text-end text-900 py-3" scope="col">Existencia Global</th>
                <th class="white-space-nowrap align-middle text-end pe-4 text-900 py-3" scope="col" style="width: 100px">Acciones</th>
              </tr>
            </thead>
            <tbody class="list" [style.opacity]="isPaginating && !isLoading ? '0.5' : '1'" style="transition: opacity 0.2s;">
              <ng-container *ngIf="isLoading">
                <tr *ngFor="let i of [1,2,3,4,5]">
                  <td class="ps-4 py-3"><div class="skeleton skeleton-text-lg" style="width: 60%"></div></td>
                  <td class="py-3"><div class="skeleton skeleton-text" style="width: 70%"></div></td>
                  <td class="py-3"><div class="skeleton skeleton-text" style="width: 80%"></div></td>
                  <td class="py-3 text-end"><div class="skeleton skeleton-text" style="width: 40%; margin-left: auto"></div></td>
                  <td class="py-3 text-end pe-4"><div class="skeleton skeleton-rounded" style="height: 28px; width: 60px; margin-left: auto"></div></td>
                </tr>
              </ng-container>

              <ng-container *ngIf="!isLoading">
                <tr *ngFor="let m of medicamentos" class="hover-actions-trigger btn-reveal-trigger">
                  <td class="align-middle ps-4 py-3">
                    <div class="fw-bold text-body-emphasis fs-0 text-uppercase">{{ m.nombre_generico }}</div>
                    <div class="fs--2 text-500 text-uppercase mt-1" *ngIf="m.nombre_categoria">
                      <span class="fas fa-tags me-1"></span>{{ m.nombre_categoria }}
                    </div>
                  </td>
                  <td class="align-middle text-600">
                    <div *ngFor="let comp of m.componentes_json">
                      &bull; {{ comp.nombre_principio }} <span class="badge badge-phoenix badge-phoenix-info">{{ comp.concentracion_valor }} {{ comp.nombre_unidad }}</span>
                    </div>
                    <span *ngIf="!m.componentes_json?.length" class="text-400">Sin principios activos</span>
                  </td>
                  <td class="align-middle">
                    <span class="badge badge-phoenix fs--2 fw-bold" [class]="m.existencia_total ? 'badge-phoenix-primary' : 'badge-phoenix-secondary'">
                      {{ m.nombre_presentacion }}
                    </span>
                  </td>
                  <td class="align-middle text-end fw-bolder fs-0">
                    <span [class.text-danger]="(m.existencia_total || 0) === 0" [class.text-info]="(m.existencia_total || 0) > 0">
                      {{ (m.existencia_total || 0) | number }}
                    </span>
                  </td>
                  <td class="align-middle text-end pe-4">
                    <div class="d-flex gap-2 flex-nowrap justify-content-end">
                      <button class="btn btn-sm btn-phoenix-secondary p-1 px-2" (click)="editar(m)" title="Editar" [disabled]="isPaginating">
                        <span class="fas fa-edit"></span>
                      </button>
                      <button class="btn btn-sm btn-phoenix-danger p-1 px-2" (click)="eliminar(m)" title="Eliminar" [disabled]="isPaginating">
                        <span class="fas fa-trash"></span>
                      </button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="medicamentos.length === 0 && !isLoading">
                <td colspan="5" class="text-center py-5">
                  <div class="p-3">
                    <span class="fas fa-search-minus fs-3 text-300 mb-2"></span>
                    <p class="text-700 mb-0">No se encontraron medicamentos registrados</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Paginación -->
      <div class="card-footer border-top border-translucent py-3" *ngIf="totalItems > 0">
        <div class="d-flex align-items-center justify-content-between">
          <p class="mb-0 fs--1 text-700">Mostrando {{ medicamentos.length }} de {{ totalItems }} registros</p>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="currentPage <= 5 || isPaginating">
                <button class="page-link" (click)="actualizarPaginacion(currentPage - 5)" title="Anteriores 5">
                  <span class="fas fa-angle-double-left"></span>
                </button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === 1 || isPaginating">
                <button class="page-link" (click)="paginar(currentPage - 1)"><span class="fas fa-chevron-left"></span></button>
              </li>
              <li *ngFor="let p of pageNums" class="page-item" [class.active]="p === currentPage" [class.disabled]="isPaginating">
                <button class="page-link" (click)="paginar(p)">{{ p }}</button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === totalPages || isPaginating">
                <button class="page-link" (click)="paginar(currentPage + 1)"><span class="fas fa-chevron-right"></span></button>
              </li>
              <li class="page-item" [class.disabled]="(pageNums.length > 0 && pageNums[pageNums.length - 1] >= totalPages) || isPaginating">
                <button class="page-link" (click)="actualizarPaginacion(currentPage + 5)" title="Siguientes 5">
                  <span class="fas fa-angle-double-right"></span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal de registro/edición -->
    <div class="modal fade" id="medModal" tabindex="-1" [class.show]="showModal" [style.display]="showModal ? 'block' : 'none'">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-translucent shadow-lg">
          <div class="modal-header border-bottom-0 bg-body-highlight">
            <h5 class="modal-title">
              <span class="fas" [class.fa-edit]="editMode" [class.fa-plus]="!editMode"></span>
              {{ editMode ? 'Editar Medicamento' : 'Nuevo Registro de Medicamento' }}
            </h5>
            <button class="btn-close" (click)="cerrar()"></button>
          </div>
          <div class="modal-body p-4 scrollbar" style="max-height: 70vh; overflow-y: auto;">
            <form [formGroup]="medForm">
              <div class="mb-3">
                <label class="form-label fw-bold">Nombre Genérico / Comercial <span class="text-danger">*</span></label>
                <input type="text" formControlName="nombre_generico" class="form-control" placeholder="Ej: Atamel Pediátrico" (input)="preventLeadingSpace($event)" (keyup)="updateSimilares('GENERICO', $event)" (change)="checkDuplicate('GENERICO', $event)"/>
              </div>
              <div class="row g-3 mb-4">
                <div class="col-md-6">
                  <div class="d-flex justify-content-between align-items-end mb-1">
                    <label class="form-label fw-bold mb-0">Categoría</label>
                    <button *ngIf="esAdmin" type="button" class="btn btn-link btn-sm p-0 text-secondary" (click)="abrirGestion('CATEGORIA')" title="Gestionar Categorías">
                      <span class="fas fa-cog"></span>
                    </button>
                  </div>
                  <button type="button" class="form-select text-start" (click)="abrirSeleccionModal('CATEGORIA')">
                    {{ getSelectedLabel('CATEGORIA') || '— Seleccione —' }}
                  </button>
                  <input *ngIf="mostrarCategoriaManual" type="text" formControlName="categoria_nueva" class="form-control form-control-sm mt-2" placeholder="Escriba la nueva categoría..." (input)="preventLeadingSpace($event)" (keyup)="updateSimilares('CATEGORIA', $event)" (change)="checkDuplicate('CATEGORIA', $event)"/>
                  <div class="text-warning fs--2 mt-1" *ngIf="mostrarCategoriaManual && similaresCategoria.length > 0">
                    <span class="fas fa-info-circle me-1"></span>Similares: {{ similaresCategoria.join(', ') }}
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="d-flex justify-content-between align-items-end mb-1">
                    <label class="form-label fw-bold mb-0">Presentación</label>
                    <button *ngIf="esAdmin" type="button" class="btn btn-link btn-sm p-0 text-secondary" (click)="abrirGestion('PRESENTACION')" title="Gestionar Presentaciones">
                      <span class="fas fa-cog"></span>
                    </button>
                  </div>
                  <button type="button" class="form-select text-start" (click)="abrirSeleccionModal('PRESENTACION')">
                    {{ getSelectedLabel('PRESENTACION') || '— Seleccione —' }}
                  </button>
                  <input *ngIf="mostrarPresentacionManual" type="text" formControlName="presentacion_nueva" class="form-control form-control-sm mt-2" placeholder="Escriba la nueva presentación..." (input)="preventLeadingSpace($event)" (keyup)="updateSimilares('PRESENTACION', $event)" (change)="checkDuplicate('PRESENTACION', $event)"/>
                  <div class="text-warning fs--2 mt-1" *ngIf="mostrarPresentacionManual && similaresPresentacion.length > 0">
                    <span class="fas fa-info-circle me-1"></span>Similares: {{ similaresPresentacion.join(', ') }}
                  </div>
                </div>
              </div>

              <div class="card shadow-none border">
                <div class="card-header bg-body-highlight py-2 d-flex justify-content-between align-items-center">
                  <h6 class="mb-0 fw-bold">Principios Activos / Componentes <span class="text-danger">*</span></h6>
                  <button type="button" class="btn btn-sm btn-phoenix-primary" (click)="addComponente()" [disabled]="!canAddComponent()">
                    <span class="fas fa-plus me-1"></span> Añadir Componente
                  </button>
                </div>
                <div class="card-body p-3" formArrayName="componentes_list">
                  <div *ngIf="componentesArray.length === 0" class="alert alert-soft-warning mb-0 fs--1">
                    Debe agregar al menos un principio activo a este medicamento.
                  </div>
                  
                  <div *ngFor="let compCtrl of componentesArray.controls; let i = index" [formGroupName]="i" class="row g-2 align-items-start mb-3 border-bottom pb-3">
                    <div class="col-md-6">
                      <div class="d-flex justify-content-between align-items-end mb-1">
                        <label class="form-label fs--1 mb-0">Principio Activo</label>
                        <button *ngIf="esAdmin" type="button" class="btn btn-link btn-sm p-0 text-secondary fs--2" (click)="abrirGestion('PRINCIPIO')" title="Gestionar Principios Activos">
                          <span class="fas fa-cog"></span>
                        </button>
                      </div>
                      <button type="button" class="form-select form-select-sm text-start" (click)="abrirSeleccionModal('PRINCIPIO', i)">
                        {{ getSelectedLabel('PRINCIPIO', i) || '— Seleccione —' }}
                      </button>
                      <input *ngIf="compCtrl.get('id_principio')?.value === 'OTRO'" type="text" formControlName="principio_nuevo" class="form-control form-control-sm mt-1" placeholder="Nombre del principio activo..." (input)="preventLeadingSpace($event)" (keyup)="updateSimilares('PRINCIPIO', $event, i)" (change)="checkDuplicate('PRINCIPIO', $event, i)"/>
                      <div class="text-warning fs--2 mt-1" *ngIf="compCtrl.get('id_principio')?.value === 'OTRO' && getSimilaresPrincipio(i).length > 0">
                        <span class="fas fa-info-circle me-1"></span>Similares: {{ getSimilaresPrincipio(i).join(', ') }}
                      </div>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label fs--1">Concentración</label>
                      <input type="number" formControlName="concentracion_valor" class="form-control form-control-sm" placeholder="Ej: 500" min="0" step="any" (keydown)="preventLettersInNumber($event)" (input)="limitarLongitud($event)"/>
                      <div class="text-danger fs--2 mt-1" *ngIf="compCtrl.get('concentracion_valor')?.errors?.['strictMin']">
                        Debe ser mayor a 0.
                      </div>
                      <div class="text-danger fs--2 mt-1" *ngIf="compCtrl.get('concentracion_valor')?.errors?.['max']">
                        Máximo 4 caracteres numéricos permitidos.
                      </div>
                    </div>
                    <div class="col-md-2">
                      <div class="d-flex justify-content-between align-items-end mb-1">
                        <label class="form-label fs--1 mb-0">Unidad</label>
                        <button *ngIf="esAdmin" type="button" class="btn btn-link btn-sm p-0 text-secondary fs--2" (click)="abrirGestion('UNIDAD')" title="Gestionar Unidades">
                          <span class="fas fa-cog"></span>
                        </button>
                      </div>
                      <button type="button" class="form-select form-select-sm text-start" (click)="abrirSeleccionModal('UNIDAD', i)">
                        {{ getSelectedLabel('UNIDAD', i) || '— Un. —' }}
                      </button>
                      <input *ngIf="compCtrl.get('id_unidad')?.value === 'OTRO'" type="text" formControlName="unidad_nueva" class="form-control form-control-sm mt-1" placeholder="Nueva unidad..." (input)="preventLeadingSpace($event)" (keyup)="updateSimilares('UNIDAD', $event, i)" (change)="checkDuplicate('UNIDAD', $event, i)"/>
                      <div class="text-warning fs--2 mt-1" *ngIf="compCtrl.get('id_unidad')?.value === 'OTRO' && getSimilaresUnidad(i).length > 0">
                        <span class="fas fa-info-circle me-1"></span>Similares: {{ getSimilaresUnidad(i).join(', ') }}
                      </div>
                    </div>
                    <div class="col-md-1 d-flex align-items-end" style="height: 52px;">
                      <button type="button" class="btn btn-sm btn-phoenix-danger px-2 w-100" (click)="removeComponente(i)" title="Eliminar">
                        <span class="fas fa-times"></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
          <div class="modal-footer border-top-0 bg-body-highlight">
            <button class="btn btn-link text-danger px-0 me-auto" (click)="cerrar()">Cancelar</button>
            <button class="btn btn-primary px-5" (click)="guardar()" [disabled]="medForm.invalid || isSubmitting || componentesArray.length === 0">
              <span class="spinner-border spinner-border-sm me-2" *ngIf="isSubmitting"></span>
              {{ editMode ? 'Guardar Cambios' : 'Registrar Producto' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="showModal"></div>

    <!-- Modal de Gestión de Catálogos (Solo Admin) -->
    <div class="modal fade" id="gestionModal" tabindex="-1" [class.show]="showGestionModal" [style.display]="showGestionModal ? 'block' : 'none'" style="z-index: 1060;">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-translucent shadow-lg">
          <div class="modal-header border-bottom-0 bg-body-highlight">
            <h5 class="modal-title">
              <span class="fas fa-cogs me-2"></span>Gestión de {{ tituloGestion }}
            </h5>
            <button class="btn-close" (click)="cerrarGestion()"></button>
          </div>
          <div class="modal-body p-0">
            <div class="p-3 border-bottom">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar..." [(ngModel)]="busquedaGestion" (input)="filtrarGestion()"/>
            </div>
            <div class="list-group list-group-flush rounded-0" style="max-height: 50vh; overflow-y: auto;">
              <div class="list-group-item d-flex justify-content-between align-items-center" *ngFor="let item of itemsGestionFiltrados">
                <span class="fs--1">{{ item.nombre }}</span>
                <button class="btn btn-link text-danger p-0 ms-2" (click)="eliminarItemCatalogo(item.id, item.nombre)" title="Eliminar">
                  <span class="fas fa-trash"></span>
                </button>
              </div>
              <div *ngIf="itemsGestionFiltrados.length === 0" class="text-center p-4 text-500 fs--1">
                No se encontraron resultados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="showGestionModal" style="z-index: 1050;"></div>

    <!-- Modal de Selección (Búsqueda) -->
    <div class="modal fade" id="seleccionModal" tabindex="-1" [class.show]="showSeleccionModal" [style.display]="showSeleccionModal ? 'block' : 'none'" style="z-index: 1070;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-translucent shadow-lg">
          <div class="modal-header border-bottom bg-body-highlight py-2">
            <h5 class="modal-title fs-0">Seleccionar {{ tituloSeleccion }}</h5>
            <button class="btn-close" (click)="cerrarSeleccion()"></button>
          </div>
          <div class="modal-body p-3">
            <div class="mb-3 position-relative">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar..." [(ngModel)]="busquedaSeleccion" (input)="filtrarSeleccion()"/>
              <span class="fas fa-search position-absolute end-0 top-50 translate-middle-y me-3 text-500"></span>
            </div>
            <div class="list-group list-group-flush scrollbar" style="max-height: 40vh; overflow-y: auto;">
              <button type="button" class="list-group-item list-group-item-action py-2 fs--1" (click)="seleccionarItem(null)">
                <em>— Ninguno / Seleccione —</em>
              </button>
              <button type="button" class="list-group-item list-group-item-action py-2 fs--1" *ngFor="let item of itemsSeleccionFiltrados" (click)="seleccionarItem(item)">
                {{ item.nombre }}
              </button>
              <button type="button" class="list-group-item list-group-item-action py-2 fs--1 text-primary fw-bold" (click)="seleccionarItem({ id: 'OTRO', nombre: 'OTRO / NUEVO (Escribir manual)' })">
                <span class="fas fa-plus-circle me-1"></span>OTRO / NUEVO (Escribir manual)
              </button>
              <div *ngIf="itemsSeleccionFiltrados.length === 0" class="text-center p-3 text-500 fs--1">
                No se encontraron resultados para "{{ busquedaSeleccion }}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="showSeleccionModal" style="z-index: 1065;"></div>

    <!-- Modal de Coincidencias de Medicamentos Similares -->
    <div class="modal fade" id="coincidenciasModal" tabindex="-1" [class.show]="showCoincidenciasModal" [style.display]="showCoincidenciasModal ? 'block' : 'none'" style="z-index: 1070;">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-translucent shadow-lg">
          <div class="modal-header border-bottom bg-warning-subtle py-3">
            <h5 class="modal-title text-warning-dark">
              <span class="fas fa-exclamation-triangle me-2"></span>Medicamentos Similares Encontrados
            </h5>
            <button class="btn-close" (click)="cerrarCoincidencias()"></button>
          </div>ss
          <div class="modal-body p-4">
            <p class="fs--1 text-800">
              Se han encontrado medicamentos con el nombre genérico <strong>"{{ payloadPendienteCrear?.nombre_generico }}"</strong> ya registrados en el sistema:
            </p>
            <div class="table-responsive scrollbar mb-3" style="max-height: 250px;">
              <table class="table table-sm fs--1 mb-0">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Presentación</th>
                    <th>Componentes</th>
                    <th>Estado</th>
                    <th class="text-end" style="width: 180px">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let med of coincidenciasList">
                    <td class="align-middle fw-semi-bold">{{ med.nombre_categoria }}</td>
                    <td class="align-middle">{{ med.nombre_presentacion }}</td>
                    <td class="align-middle text-600">{{ med.componentes }}</td>
                    <td class="align-middle">
                      <span class="badge badge-phoenix fs--2" [class]="med.activo ? 'badge-phoenix-success' : 'badge-phoenix-danger'">
                        {{ med.activo ? 'Activo' : 'En Papelera' }}
                      </span>
                    </td>
                    <td class="align-middle text-end">
                      <div class="d-flex gap-2 justify-content-end">
                        <button type="button" class="btn btn-xs btn-phoenix-primary" (click)="usarCoincidencia(med)" title="Usar este medicamento">Usar</button>
                        <button type="button" class="btn btn-xs btn-phoenix-secondary" (click)="editarCoincidencia(med)" title="Editar este medicamento">Editar</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="alert alert-soft-warning fs--1 mb-0">
              ¿Desea usar o modificar uno de los medicamentos existentes, o prefiere continuar con la creación de este nuevo registro como una nueva variante?
            </div>
          </div>
          <div class="modal-footer border-top-0 bg-body-highlight">
            <button type="button" class="btn btn-link text-secondary px-0 me-auto" (click)="cerrarCoincidencias()">Cancelar</button>
            <button type="button" class="btn btn-primary px-4" (click)="continuarCreandoNuevaVariante()">
              <span class="fas fa-plus me-1"></span>Crear como Nueva Presentación
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="showCoincidenciasModal" style="z-index: 1065;"></div>
  `,
  styles: [`
    .modal.show { display: block; }
  `]
})
export class MedicamentosComponent implements OnInit {
  medicamentos: MedicamentoBase[] = [];
  showModal = false;
  editMode = false;
  selectedId: number | null = null;
  medForm!: FormGroup;
  isLoading = false;
  isPaginating = false;
  isSubmitting = false;

  busqueda = '';
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  totalExistenciaGlobal = 0;
  pageNums: number[] = [];

  busquedaSubject = new Subject<string>();
  private reqSub?: import('rxjs').Subscription;
  mostrarCategoriaManual = false;
  mostrarPresentacionManual = false;

  // Selección Modal
  showSeleccionModal = false;
  tipoSeleccion: 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD' | null = null;
  indiceComponenteSeleccion: number | null = null;
  tituloSeleccion = '';
  busquedaSeleccion = '';
  itemsSeleccionFiltrados: CatalogoItem[] = [];

  // Coincidencias Modal
  showCoincidenciasModal = false;
  coincidenciasList: any[] = [];
  payloadPendienteCrear: any = null;

  similaresCategoria: string[] = [];
  similaresPresentacion: string[] = [];
  similaresPrincipios: { [key: number]: string[] } = {};
  similaresUnidades: { [key: number]: string[] } = {};

  esAdmin = false;
  showGestionModal = false;
  tipoGestion: 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD' | null = null;
  tituloGestion = '';
  itemsGestion: CatalogoItem[] = [];
  itemsGestionFiltrados: CatalogoItem[] = [];
  busquedaGestion = '';

  catalogos = {
    presentaciones: [] as CatalogoItem[],
    categorias: [] as CatalogoItem[],
    unidades: [] as CatalogoItem[],
    principios: [] as CatalogoItem[]
  };

  constructor(
    private fb: FormBuilder,
    private svc: MedicamentosService,
    private principiosSvc: PrincipiosActivosService,
    private auth: AuthService,
    private swal: SwalService,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
    this.esAdmin = this.auth.hasRole('ADMINISTRADOR', 'DIRECTOR_MEDICO');
  }

  get componentesArray(): FormArray {
    return this.medForm.get('componentes_list') as FormArray;
  }

  ngOnInit(): void {
    this.cargar();
    this.cargarCatalogos();

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
    if (this.medicamentos.length === 0) {
      this.isLoading = true;
    }
    this.isPaginating = true;
    
    if (this.reqSub) {
      this.reqSub.unsubscribe();
    }
    
    this.reqSub = this.svc.getMedicamentos({ 
      busqueda: this.busqueda, 
      page: this.currentPage, 
      page_size: 10 
    }).subscribe({
      next: r => {
        try {
          this.medicamentos = r?.results || [];
          this.totalItems = r?.count || 0;
          this.totalPages = Math.ceil((r?.count || 0) / 10);
          
          const bloqueActual = Math.floor((this.currentPage - 1) / 5);
          const startPage = bloqueActual * 5 + 1;
          const endPage = Math.min(startPage + 4, this.totalPages);
          this.pageNums = [];
          for (let i = startPage; i <= endPage; i++) {
            this.pageNums.push(i);
          }
          
          // Sumamos la existencia global total que viene desde el backend
          this.totalExistenciaGlobal = r?.total_general_existencia || 0;
        } catch (err) {
          console.error('Error procesando respuesta del catálogo:', err);
        } finally {
          this.isLoading = false;
          this.isPaginating = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error cargando catálogo de medicamentos:', err);
        this.isLoading = false;
        this.isPaginating = false;
        this.swal.error('Error', 'No se pudo cargar el catálogo de medicamentos.');
        this.cdr.detectChanges();
      }
    });
  }

  cargarCatalogos(): void {
    this.svc.getPresentaciones().subscribe(data => this.catalogos.presentaciones = data);
    this.svc.getCategorias().subscribe(data => this.catalogos.categorias = data);
    this.svc.getUnidades().subscribe(data => this.catalogos.unidades = data);
    this.principiosSvc.getPrincipiosActivos().subscribe(data => this.catalogos.principios = data);
  }

  onBusqueda(e: Event): void {
    const q = (e.target as HTMLInputElement).value;
    this.busquedaSubject.next(q);
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
    
    const bloqueActual = Math.floor((this.currentPage - 1) / 5);
    const startPage = bloqueActual * 5 + 1;
    const endPage = Math.min(startPage + 4, this.totalPages);
    
    this.pageNums = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pageNums.push(i);
    }
    
    this.cargar();
  }

  onCategoriaChange(): void {
    this.mostrarCategoriaManual = this.medForm.get('id_categoria')?.value === 'OTRO';
    if (!this.mostrarCategoriaManual) this.similaresCategoria = [];
  }

  onPresentacionChange(): void {
    this.mostrarPresentacionManual = this.medForm.get('id_presentacion')?.value === 'OTRO';
    if (!this.mostrarPresentacionManual) this.similaresPresentacion = [];
  }

  onPrincipioChange(index: number): void {
    const compGroup = this.componentesArray.at(index) as FormGroup;
    const selectedId = compGroup.get('id_principio')?.value;

    if (selectedId && selectedId !== 'OTRO') {
      const componentes = this.componentesArray.value;
      const repetido = componentes.some((c: any, i: number) => i !== index && c.id_principio === selectedId);
      
      if (repetido) {
        this.swal.warning('Principio Duplicado', 'Este principio activo ya ha sido añadido a este medicamento. Por favor, seleccione uno distinto.');
        compGroup.get('id_principio')?.setValue('');
        return;
      }
      this.similaresPrincipios[index] = [];
    }
  }

  getSimilaresPrincipio(index: number): string[] {
    return this.similaresPrincipios[index] || [];
  }

  onUnidadChange(index: number): void {
    const compGroup = this.componentesArray.at(index) as FormGroup;
    if (compGroup.get('id_unidad')?.value !== 'OTRO') {
      this.similaresUnidades[index] = [];
    }
  }

  getSimilaresUnidad(index: number): string[] {
    return this.similaresUnidades[index] || [];
  }

  addComponente(comp?: ComponenteDetalle): void {
    const isOtro = comp?.id_principio === 'OTRO';
    
    // Custom validator para evitar 0, 0.0, 00, etc.
    const strictMinValidator = (control: any) => {
      const val = parseFloat(control.value);
      if (isNaN(val) || val <= 0) {
        return { strictMin: true };
      }
      return null;
    };

    const formGroup = this.fb.group({
      id_principio: [comp?.id_principio || '', Validators.required],
      principio_nuevo: [comp?.principio_nuevo || ''],
      concentracion_valor: [comp?.concentracion_valor || '', [Validators.required, strictMinValidator, Validators.max(9999)]],
      id_unidad: [comp?.id_unidad || '', Validators.required],
      unidad_nueva: [comp?.unidad_nueva || '']
    });
    this.componentesArray.push(formGroup);
  }

  removeComponente(index: number): void {
    this.componentesArray.removeAt(index);
  }

  canAddComponent(): boolean {
    if (this.componentesArray.length === 0) return true;
    const lastCtrl = this.componentesArray.at(this.componentesArray.length - 1) as FormGroup;
    const p = lastCtrl.get('id_principio')?.value;
    const c = lastCtrl.get('concentracion_valor')?.value;
    const u = lastCtrl.get('id_unidad')?.value;
    const pNuevo = lastCtrl.get('principio_nuevo')?.value;
    
    if (!p || !c || !u) return false;
    if (p === 'OTRO' && (!pNuevo || pNuevo.trim() === '')) return false;
    
    const uNuevo = lastCtrl.get('unidad_nueva')?.value;
    if (u === 'OTRO' && (!uNuevo || uNuevo.trim() === '')) return false;
    
    return true;
  }

  preventLeadingSpace(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.startsWith(' ')) {
      input.value = input.value.trimStart();
      input.dispatchEvent(new Event('input'));
    }
  }

  preventLettersInNumber(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete'];
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Solo permitir numeros y UN punto
    if (!/^[0-9.]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    if (event.key === '.' && input.value.includes('.')) {
      event.preventDefault(); // Evitar multiples puntos
    }
  }

  limitarLongitud(event: any): void {
    let valor = event.target.value.toString();
    const partes = valor.split('.');
    let soloNumeros = partes.join('');
    
    // Maximo 4 caracteres (sin contar el punto)
    if (soloNumeros.length > 4) {
      event.target.value = valor.slice(0, valor.length - 1);
      event.target.dispatchEvent(new Event('input'));
    }
  }

  removeAccents(str: string): string {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  updateSimilares(tipo: 'GENERICO' | 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD', event: Event, index?: number): void {
    const input = event.target as HTMLInputElement;
    const val = this.removeAccents(input.value.trim());
    if (!val || val.length < 2) {
      if (tipo === 'CATEGORIA') this.similaresCategoria = [];
      if (tipo === 'PRESENTACION') this.similaresPresentacion = [];
      if (tipo === 'PRINCIPIO' && index !== undefined) this.similaresPrincipios[index] = [];
      if (tipo === 'UNIDAD' && index !== undefined) this.similaresUnidades[index] = [];
      return;
    }

    if (tipo === 'CATEGORIA') {
      this.similaresCategoria = this.catalogos.categorias.filter(c => this.removeAccents(c.nombre).includes(val)).slice(0, 5).map(c => c.nombre);
    } else if (tipo === 'PRESENTACION') {
      this.similaresPresentacion = this.catalogos.presentaciones.filter(p => this.removeAccents(p.nombre).includes(val)).slice(0, 5).map(p => p.nombre);
    } else if (tipo === 'PRINCIPIO' && index !== undefined) {
      this.similaresPrincipios[index] = this.catalogos.principios.filter(p => this.removeAccents(p.nombre).includes(val)).slice(0, 5).map(p => p.nombre);
    } else if (tipo === 'UNIDAD' && index !== undefined) {
      this.similaresUnidades[index] = this.catalogos.unidades.filter(u => this.removeAccents(u.nombre).includes(val)).slice(0, 5).map(u => u.nombre);
    }
  }

  checkDuplicate(tipo: 'GENERICO' | 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD', event: Event, index?: number): void {
    const input = event.target as HTMLInputElement;
    const rawVal = input.value.trim();
    const val = this.removeAccents(rawVal);
    if (!val) return;

    if (tipo === 'CATEGORIA') {
      const existe = this.catalogos.categorias.find(c => this.removeAccents(c.nombre) === val);
      if (existe) {
        this.swal.warning('Categoría Existente', `La categoría ya existe. Se seleccionará automáticamente.`);
        this.medForm.get('id_categoria')?.setValue(existe.id);
        this.medForm.get('categoria_nueva')?.setValue('');
        this.mostrarCategoriaManual = false;
        this.similaresCategoria = [];
      } else if (this.similaresCategoria.length > 0) {
        this.swal.warning('Coincidencias Encontradas', `Estás creando una nueva categoría "${rawVal.toUpperCase()}", pero ya existen similares:\n\n${this.similaresCategoria.join('\n')}\n\nRevisa si alguna te sirve antes de guardar.`);
      }
    } else if (tipo === 'PRESENTACION') {
      const existe = this.catalogos.presentaciones.find(p => this.removeAccents(p.nombre) === val);
      if (existe) {
        this.swal.warning('Presentación Existente', `La presentación ya existe. Se seleccionará automáticamente.`);
        this.medForm.get('id_presentacion')?.setValue(existe.id);
        this.medForm.get('presentacion_nueva')?.setValue('');
        this.mostrarPresentacionManual = false;
        this.similaresPresentacion = [];
      } else if (this.similaresPresentacion.length > 0) {
        this.swal.warning('Coincidencias Encontradas', `Estás creando una nueva presentación "${rawVal.toUpperCase()}", pero ya existen similares:\n\n${this.similaresPresentacion.join('\n')}\n\nRevisa si alguna te sirve antes de guardar.`);
      }
    } else if (tipo === 'PRINCIPIO' && index !== undefined) {
      const existe = this.catalogos.principios.find(p => this.removeAccents(p.nombre) === val);
      if (existe) {
        const componentes = this.componentesArray.value;
        const repetido = componentes.some((c: any, i: number) => i !== index && c.id_principio === existe.id);
        
        if (repetido) {
          this.swal.warning('Principio Duplicado', `El principio activo "${existe.nombre}" ya está en uso en este medicamento. Elija otro distinto.`);
          const compGroup = this.componentesArray.at(index) as FormGroup;
          compGroup.get('principio_nuevo')?.setValue('');
          return;
        }

        this.swal.warning('Principio Existente', `El principio activo ya existe. Se seleccionará automáticamente.`);
        const compGroup = this.componentesArray.at(index) as FormGroup;
        compGroup.get('id_principio')?.setValue(existe.id);
        compGroup.get('principio_nuevo')?.setValue('');
        this.similaresPrincipios[index] = [];
      } else if (this.similaresPrincipios[index]?.length > 0) {
        this.swal.warning('Coincidencias Encontradas', `Estás creando un nuevo principio activo "${rawVal.toUpperCase()}", pero ya existen similares:\n\n${this.similaresPrincipios[index].join('\n')}\n\nRevisa si alguno te sirve antes de guardar.`);
      }
    } else if (tipo === 'UNIDAD' && index !== undefined) {
      const existe = this.catalogos.unidades.find(u => this.removeAccents(u.nombre) === val);
      if (existe) {
        this.swal.warning('Unidad Existente', `La unidad ya existe. Se seleccionará automáticamente.`);
        const compGroup = this.componentesArray.at(index) as FormGroup;
        compGroup.get('id_unidad')?.setValue(existe.id);
        compGroup.get('unidad_nueva')?.setValue('');
        this.similaresUnidades[index] = [];
      } else if (this.similaresUnidades[index]?.length > 0) {
        this.swal.warning('Coincidencias Encontradas', `Estás creando una nueva unidad "${rawVal.toUpperCase()}", pero ya existen similares:\n\n${this.similaresUnidades[index].join('\n')}\n\nRevisa si alguna te sirve antes de guardar.`);
      }
    } else if (tipo === 'GENERICO') {
      const existe = this.medicamentos.find(m => this.removeAccents(m.nombre_generico) === val);
      if (existe && this.selectedId !== existe.id_med_base) {
        this.swal.warning('Medicamento Existente', `Ya existe un medicamento registrado exactamente con este nombre.`);
      }
    }
  }

  // --- GESTIÓN DE CATÁLOGOS (Solo Admin/Director) ---
  abrirGestion(tipo: 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD'): void {
    if (!this.esAdmin) return;
    this.tipoGestion = tipo;
    this.busquedaGestion = '';
    
    switch (tipo) {
      case 'CATEGORIA':
        this.tituloGestion = 'Categorías';
        this.itemsGestion = [...this.catalogos.categorias];
        break;
      case 'PRESENTACION':
        this.tituloGestion = 'Presentaciones';
        this.itemsGestion = [...this.catalogos.presentaciones];
        break;
      case 'PRINCIPIO':
        this.tituloGestion = 'Principios Activos';
        this.itemsGestion = [...this.catalogos.principios];
        break;
      case 'UNIDAD':
        this.tituloGestion = 'Unidades de Medida';
        this.itemsGestion = [...this.catalogos.unidades];
        break;
    }
    
    this.itemsGestionFiltrados = [...this.itemsGestion];
    this.showGestionModal = true;
  }

  cerrarGestion(): void {
    this.showGestionModal = false;
    this.tipoGestion = null;
  }

  filtrarGestion(): void {
    const q = this.removeAccents(this.busquedaGestion);
    if (!q) {
      this.itemsGestionFiltrados = [...this.itemsGestion];
      return;
    }
    this.itemsGestionFiltrados = this.itemsGestion.filter(i => this.removeAccents(i.nombre).includes(q));
  }

  eliminarItemCatalogo(id: number, nombre: string): void {
    if (!this.tipoGestion) return;
    
    this.swal.confirm(
      '¿Eliminar registro?',
      `¿Estás seguro de eliminar permanentemente "${nombre}"?\n\nSi está siendo utilizado por un medicamento, la acción será rechazada.`,
      'Sí, eliminar'
    ).then(res => {
      if (res.isConfirmed) {
        let req;
        switch (this.tipoGestion) {
          case 'CATEGORIA': req = this.svc.eliminarCategoria(id); break;
          case 'PRESENTACION': req = this.svc.eliminarPresentacion(id); break;
          case 'PRINCIPIO': req = this.principiosSvc.eliminarPrincipioActivo(id); break;
          case 'UNIDAD': req = this.svc.eliminarUnidad(id); break;
        }
        
        if (req) {
          req.subscribe({
            next: () => {
              this.swal.success('Eliminado', 'El registro se eliminó exitosamente.');
              this.cargarCatalogos();
              this.itemsGestion = this.itemsGestion.filter(i => i.id !== id);
              this.filtrarGestion();
            },
            error: (err) => {
              const msg = err.error?.detail || 'Ocurrió un error al eliminar el registro. Es probable que esté en uso.';
              this.swal.error('Error', msg);
            }
          });
        }
      }
    });
  }

  abrirSeleccionModal(tipo: 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD', index?: number): void {
    this.tipoSeleccion = tipo;
    this.indiceComponenteSeleccion = index !== undefined ? index : null;
    this.busquedaSeleccion = '';
    
    switch (tipo) {
      case 'CATEGORIA':
        this.tituloSeleccion = 'Categoría';
        break;
      case 'PRESENTACION':
        this.tituloSeleccion = 'Presentación';
        break;
      case 'PRINCIPIO':
        this.tituloSeleccion = 'Principio Activo';
        break;
      case 'UNIDAD':
        this.tituloSeleccion = 'Unidad';
        break;
    }
    
    this.filtrarSeleccion();
    this.showSeleccionModal = true;
    this.cdr.detectChanges();
  }

  cerrarSeleccion(): void {
    this.showSeleccionModal = false;
    this.tipoSeleccion = null;
    this.indiceComponenteSeleccion = null;
    this.cdr.detectChanges();
  }

  filtrarSeleccion(): void {
    const q = this.removeAccents(this.busquedaSeleccion);
    let items: CatalogoItem[] = [];
    
    switch (this.tipoSeleccion) {
      case 'CATEGORIA':
        items = this.catalogos.categorias;
        break;
      case 'PRESENTACION':
        items = this.catalogos.presentaciones;
        break;
      case 'PRINCIPIO':
        items = this.catalogos.principios;
        break;
      case 'UNIDAD':
        items = this.catalogos.unidades;
        break;
    }
    
    if (!q) {
      this.itemsSeleccionFiltrados = [...items];
    } else {
      this.itemsSeleccionFiltrados = items.filter(item => this.removeAccents(item.nombre).includes(q));
    }
    this.cdr.detectChanges();
  }

  seleccionarItem(item: any): void {
    const val = item ? item.id : '';
    
    switch (this.tipoSeleccion) {
      case 'CATEGORIA':
        this.medForm.get('id_categoria')?.setValue(val);
        this.onCategoriaChange();
        break;
      case 'PRESENTACION':
        this.medForm.get('id_presentacion')?.setValue(val);
        this.onPresentacionChange();
        break;
      case 'PRINCIPIO':
        if (this.indiceComponenteSeleccion !== null) {
          const compGroup = this.componentesArray.at(this.indiceComponenteSeleccion) as FormGroup;
          compGroup.get('id_principio')?.setValue(val);
          this.onPrincipioChange(this.indiceComponenteSeleccion);
        }
        break;
      case 'UNIDAD':
        if (this.indiceComponenteSeleccion !== null) {
          const compGroup = this.componentesArray.at(this.indiceComponenteSeleccion) as FormGroup;
          compGroup.get('id_unidad')?.setValue(val);
          this.onUnidadChange(this.indiceComponenteSeleccion);
        }
        break;
    }
    
    this.cerrarSeleccion();
  }

  getSelectedLabel(tipo: 'CATEGORIA' | 'PRESENTACION' | 'PRINCIPIO' | 'UNIDAD', index?: number): string {
    switch (tipo) {
      case 'CATEGORIA': {
        const val = this.medForm.get('id_categoria')?.value;
        if (val === 'OTRO') return 'OTRO / NUEVO (Escribir manual)';
        const match = this.catalogos.categorias.find(c => c.id === +val);
        return match ? match.nombre : '';
      }
      case 'PRESENTACION': {
        const val = this.medForm.get('id_presentacion')?.value;
        if (val === 'OTRO') return 'OTRO / NUEVO (Escribir manual)';
        const match = this.catalogos.presentaciones.find(p => p.id === +val);
        return match ? match.nombre : '';
      }
      case 'PRINCIPIO': {
        if (index === undefined) return '';
        const compGroup = this.componentesArray.at(index) as FormGroup;
        const val = compGroup?.get('id_principio')?.value;
        if (val === 'OTRO') return 'NUEVO (Escribir manual)';
        const match = this.catalogos.principios.find(p => p.id === +val);
        return match ? match.nombre : '';
      }
      case 'UNIDAD': {
        if (index === undefined) return '';
        const compGroup = this.componentesArray.at(index) as FormGroup;
        const val = compGroup?.get('id_unidad')?.value;
        if (val === 'OTRO') return 'OTRO / NUEVO (Escribir manual)';
        const match = this.catalogos.unidades.find(u => u.id === +val);
        return match ? match.nombre : '';
      }
    }
  }

  irAEditar(med: any): void {
    this.cerrar();
    this.busqueda = med.nombre_generico;
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = med.nombre_generico;
    }
    this.currentPage = 1;
    this.cargar();
    
    setTimeout(() => {
      const match = this.medicamentos.find(m => m.id_med_base === med.id_med_base);
      if (match) {
        this.editar(match);
      } else {
        this.editar(med);
      }
      this.cdr.detectChanges();
    }, 400);
  }

  mostrarModalCoincidencias(coincidencias: any[], payload: any): void {
    this.coincidenciasList = coincidencias;
    this.payloadPendienteCrear = payload;
    this.showCoincidenciasModal = true;
    this.cdr.detectChanges();
  }

  cerrarCoincidencias(): void {
    this.showCoincidenciasModal = false;
    this.coincidenciasList = [];
    this.payloadPendienteCrear = null;
    this.cdr.detectChanges();
  }

  usarCoincidencia(med: any): void {
    this.cerrarCoincidencias();
    this.cerrar();
    this.busqueda = med.nombre_generico;
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = med.nombre_generico;
    }
    this.currentPage = 1;
    this.cargar();
    this.swal.success('Medicamento Seleccionado', `Se ha buscado "${med.nombre_generico}" en el catálogo.`);
    this.cdr.detectChanges();
  }

  editarCoincidencia(med: any): void {
    this.cerrarCoincidencias();
    this.irAEditar(med);
  }

  continuarCreandoNuevaVariante(): void {
    if (this.payloadPendienteCrear) {
      const payload = this.payloadPendienteCrear;
      this.cerrarCoincidencias();
      this._ejecutarGuardar(payload);
    }
  }

  private initForm(m?: MedicamentoBase): void {
    this.medForm = this.fb.group({
      nombre_generico: [m?.nombre_generico || '', Validators.required],
      id_categoria: [m?.id_categoria || ''],
      categoria_nueva: [''],
      id_presentacion: [m?.id_presentacion || ''],
      presentacion_nueva: [''],
      componentes_list: this.fb.array([])
    });

    if (m && m.componentes_json && m.componentes_json.length > 0) {
      m.componentes_json.forEach(c => this.addComponente(c));
    } else if (!m) {
      this.addComponente(); // Empty row
    }

    this.mostrarCategoriaManual = false;
    this.mostrarPresentacionManual = false;
  }

  abrirModal(): void {
    this.editMode = false;
    this.selectedId = null;
    this.initForm();
    this.showModal = true;
  }

  editar(m: MedicamentoBase): void {
    this.editMode = true;
    this.selectedId = m.id_med_base || null;
    this.initForm(m);
    this.showModal = true;
  }

  cerrar(): void { this.showModal = false; }

  guardar(): void {
    if (this.medForm.invalid || this.componentesArray.length === 0) return;
    this.isSubmitting = true;
    
    const form = this.medForm.value;
    const payload: any = {
      nombre_generico: form.nombre_generico,
      id_categoria: form.id_categoria === 'OTRO' ? null : (form.id_categoria || null),
      categoria_nueva: form.id_categoria === 'OTRO' ? form.categoria_nueva : null,
      id_presentacion: form.id_presentacion === 'OTRO' ? null : (form.id_presentacion || null),
      presentacion_nueva: form.id_presentacion === 'OTRO' ? form.presentacion_nueva : null,
      componentes_list: form.componentes_list
    };

    if (!this.editMode) {
      this.swal.loading('Verificando duplicados...');
      this.svc.verificarDuplicado(payload).subscribe({
        next: (res) => {
          if (res.existe_exacto) {
            this.isSubmitting = false;
            this.swal.close();
            const med = res.medicamento;
            if (med.activo) {
              this.swal.confirm(
                'Medicamento Existente',
                `El medicamento "${med.nombre_generico}" con la misma categoría (${med.nombre_categoria}), presentación (${med.nombre_presentacion}) y componentes ya existe y está ACTIVO.\n\n¿Desea editar este medicamento existente?`,
                'Sí, ir a Editar'
              ).then(confirmRes => {
                if (confirmRes.isConfirmed) {
                  this.irAEditar(med);
                }
              });
            } else {
              this.swal.confirm(
                'Medicamento en Papelera',
                `El medicamento "${med.nombre_generico}" con la misma categoría, presentación y componentes ya existe pero está INHABILITADO.\n\n¿Desea reactivarlo?`,
                'Sí, reactivar'
              ).then(confirmRes => {
                if (confirmRes.isConfirmed) {
                  this.swal.loading('Reactivando...');
                  this.svc.reactivarMedicamento(med.id_med_base).subscribe({
                    next: () => {
                      this.swal.success('¡Reactivado!', 'El medicamento ha sido restaurado exitosamente.');
                      this.cerrar();
                      this.cargar();
                    },
                    error: (err) => this.swal.error('Error', err.error?.detail || 'No se pudo reactivar el medicamento.')
                  });
                }
              });
            }
          } else if (res.existe_parcial) {
            this.isSubmitting = false;
            this.swal.close();
            this.mostrarModalCoincidencias(res.coincidencias, payload);
          } else {
            this._ejecutarGuardar(payload);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.swal.close();
          this._ejecutarGuardar(payload);
          this.cdr.detectChanges();
        }
      });
    } else {
      this._ejecutarGuardar(payload);
    }
  }

  private _ejecutarGuardar(payload: any): void {
    this.swal.loading(this.editMode ? 'Actualizando...' : 'Registrando...');
    const obs = this.editMode && this.selectedId
      ? this.svc.editarMedicamento(this.selectedId, payload)
      : this.svc.crearMedicamento(payload);

    obs.subscribe({
      next: () => {
        this.swal.success('¡Éxito!', this.editMode ? 'Medicamento actualizado' : 'Medicamento registrado');
        this.cerrar();
        this.cargar();
        // Recargar catálogos por si se añadieron nuevos
        this.cargarCatalogos();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.swal.error('Error', err.error?.detail || 'No se pudo procesar la solicitud.');
      }
    });
  }

  eliminar(m: MedicamentoBase): void {
    if (!m.id_med_base) return;

    this.swal.confirm('¿Inhabilitar Medicamento?', `Se inhabilitará "${m.nombre_generico}".`).then(res => {
      if (res.isConfirmed) {
        this.swal.loading('Inhabilitando...');
        this.svc.eliminarMedicamento(m.id_med_base!).subscribe({
          next: () => {
            this.swal.success('Inhabilitado', 'El medicamento ha sido inhabilitado.');
            this.cargar();
          },
          error: (err) => {
            this.swal.error('Error', err.error?.detail || 'No se pudo inhabilitar el medicamento.');
          }
        });
      }
    });
  }
}
