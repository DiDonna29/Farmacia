import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveeduriaService } from '../../../core/services/proveeduria.service';
import { MedicamentosService } from '../../../core/services/medicamentos.service';
import { AuthService } from '../../../core/services/auth.service';
import { SwalService } from '../../../core/services/swal.service';
import { ActivatedRoute } from '@angular/router';



@Component({
  selector: 'app-proveeduria-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="mb-4 d-flex flex-wrap justify-content-between align-items-end gap-2">
        <div>
          <h2 class="mb-2 text-1100">Solicitudes y Requisiciones</h2>
          <h5 class="text-700 fw-semi-bold">Gestión de órdenes entre Farmacia y Proveeduría</h5>
        </div>
        <button class="btn btn-primary" (click)="abrirModalNueva()">
          <span class="fas fa-plus me-2"></span>Nueva Solicitud
        </button>
      </div>

      <!-- Filtros Rápidos -->
      <div class="card shadow-none border border-300 mb-4">
        <div class="card-body p-3">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-3">
               <div>
                  <label class="form-label fs--2 fw-bold text-700 text-uppercase mb-1">Rango de Consulta</label>
                  <div class="d-flex align-items-center gap-2">
                    <input type="date" class="form-control form-control-sm" style="width: 140px;" [(ngModel)]="fecha_desde" [max]="maxDate" [min]="minDate">
                    <span class="text-600 fs--2">al</span>
                    <input type="date" class="form-control form-control-sm" style="width: 140px;" [(ngModel)]="fecha_hasta" [max]="maxDate" [min]="fecha_desde || minDate">
                    <button class="btn btn-sm btn-phoenix-primary px-3" (click)="cargarSolicitudes()" title="Buscar"><span class="fas fa-search"></span></button>
                    <button class="btn btn-sm btn-phoenix-secondary px-3" (click)="limpiarFiltros()" title="Limpiar"><span class="fas fa-brush"></span></button>
                  </div>
               </div>
            </div>
            <div class="d-flex gap-2 flex-wrap align-items-end">
              <span class="align-self-center fs--1 text-700">Filtro de Dirección:</span>
              <button class="btn btn-sm" [class.btn-outline-primary]="filtroOrigen === 'FARMACIA'" (click)="setFiltroOrigen('FARMACIA')">De Farmacia</button>
              <button class="btn btn-sm" [class.btn-outline-primary]="filtroOrigen === 'PROVEEDURIA'" (click)="setFiltroOrigen('PROVEEDURIA')">De Proveeduría</button>
              <button class="btn btn-sm" [class.btn-outline-primary]="filtroOrigen === 'OTROS'" (click)="setFiltroOrigen('OTROS')">Otros</button>
              <div class="vr mx-2"></div>
              <button class="btn btn-sm" [class.btn-phoenix-primary]="filtro === 'todas'" (click)="filtro = 'todas'">Todas</button>
              <button class="btn btn-sm" [class.btn-phoenix-warning]="filtro === 'PENDIENTE'" (click)="filtro = 'PENDIENTE'">Pendientes</button>
              <button class="btn btn-sm" [class.btn-phoenix-success]="filtro === 'ENTREGADA'" (click)="filtro = 'ENTREGADA'">Entregadas</button>
              <button class="btn btn-sm" [class.btn-phoenix-danger]="filtro === 'RECHAZADA'" (click)="filtro = 'RECHAZADA'">Rechazadas</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Solicitudes -->
      <div class="card shadow-none border border-300">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm fs--1 mb-0">
              <thead class="bg-body-secondary">
                <tr>
                  <th class="ps-4 py-2">Folio</th>
                  <th>De (Solicitante) / Para (Proveedor)</th>
                  <th>Fecha</th>
                  <th>Solicitante</th>
                  <th>Estado</th>
                  <th class="text-center">Items</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of paginatedSolicitudes">
                  <td class="ps-4 fw-bold text-primary text-nowrap">{{ s.folio }}</td>
                  <td class="text-nowrap">
                    <span class="badge badge-phoenix badge-phoenix-info fs--2">{{ s.origen }}</span>
                    <span class="fas fa-arrow-right mx-2 text-400"></span>
                    <span class="badge badge-phoenix badge-phoenix-primary fs--2">{{ s.destino }}</span>
                  </td>
                  <td class="text-nowrap">{{ s.fecha_solicitud | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="text-nowrap">{{ s.usuario_solicita }}</td>
                  <td class="text-nowrap">
                    <span class="badge fs--2" [ngClass]="{
                      'badge-phoenix-warning': s.estado === 'PENDIENTE',
                      'badge-phoenix-info': s.estado === 'APROBADA',
                      'badge-phoenix-success': s.estado === 'ENTREGADA',
                      'badge-phoenix-danger': s.estado === 'RECHAZADA'
                    }">{{ s.estado }}</span>
                  </td>
                  <td class="text-center text-nowrap">{{ s.total_items }}</td>
                  <td class="text-center text-nowrap">
                    <button class="btn btn-sm btn-phoenix-primary me-1" (click)="verDetalle(s)">
                      <span class="fas fa-eye me-1"></span>{{ s.estado === 'PENDIENTE' ? 'Procesar' : 'Ver' }}
                    </button>
                    <button class="btn btn-sm btn-phoenix-secondary" (click)="generarPDF(s)">
                      <span class="fas fa-file-pdf"></span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="paginatedSolicitudes.length === 0">
                  <td colspan="7" class="text-center py-5 text-500">No se encontraron solicitudes</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="solicitudesFiltradas.length > 0">
            <span class="fs--1 text-500">Mostrando {{ paginatedSolicitudes.length }} de {{ solicitudesFiltradas.length }} solicitudes</span>
            <div class="d-flex align-items-center">
              <button class="btn btn-sm btn-phoenix-secondary p-1 me-2" [disabled]="currentPage === 1" (click)="cambiarPagina(currentPage - 1)">
                <span class="fas fa-chevron-left"></span>
              </button>
              <ng-container *ngFor="let p of pagesArray">
                <button class="btn btn-sm p-1 mx-1" 
                        [ngClass]="currentPage === p ? 'btn-primary' : 'btn-phoenix-secondary'" 
                        (click)="cambiarPagina(p)">{{ p }}</button>
              </ng-container>
              <button class="btn btn-sm btn-phoenix-secondary p-1 ms-2" [disabled]="currentPage === totalPages" (click)="cambiarPagina(currentPage + 1)">
                <span class="fas fa-chevron-right"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Nueva Solicitud -->
    <div class="modal fade" [class.show]="showModalNueva" [style.display]="showModalNueva ? 'block' : 'none'" tabindex="-1">
       <div class="modal-dialog modal-lg modal-dialog-centered">
         <div class="modal-content border-0 shadow-lg">
           <div class="modal-header bg-primary text-white">
             <h5 class="modal-title text-white">Crear Nueva Requisición</h5>
             <button type="button" class="btn-close btn-close-white" (click)="cerrarModal()"></button>
           </div>
           <div class="modal-body">
             <div class="row g-3">

                <!-- Departamento Solicitante -->
                <div class="col-md-6">
                  <label class="form-label fw-bold">Departamento que realiza la solicitud <span class="text-danger">*</span></label>
                  <select class="form-select" [(ngModel)]="nuevaSolicitud.origen" (change)="onOrigenChange()" [disabled]="!auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'PROVEEDURIA', 'ENCARGADO')">
                    <option value="">— Seleccione —</option>
                    <option value="FARMACIA" *ngIf="auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'ENCARGADO', 'FARMACEUTICO')">FARMACIA</option>
                    <option value="PROVEEDURIA" *ngIf="auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'PROVEEDURIA', 'ENCARGADO')">PROVEEDURÍA</option>
                    <ng-container *ngIf="auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'PROVEEDURIA', 'ENCARGADO')">
                      <option *ngFor="let dep of departamentosPersonalizados" [value]="dep.nombre">{{ dep.nombre }}</option>
                      <option value="OTRO">+ OTRO (Especificar nuevo)</option>
                    </ng-container>
                  </select>
                </div>

                <!-- Departamento Destino -->
                <div class="col-md-6">
                  <label class="form-label fw-bold">Departamento que realiza la dotación</label>
                  <select class="form-select" [(ngModel)]="nuevaSolicitud.destino" disabled>
                    <option value="PROVEEDURIA">PROVEEDURÍA</option>
                    <option value="FARMACIA">FARMACIA</option>
                  </select>
                </div>

                <!-- Campo OTRO: nuevo departamento -->
                <div class="col-12" *ngIf="nuevaSolicitud.origen === 'OTRO'">
                  <label class="form-label fw-bold">Nombre del nuevo departamento <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <input type="text" class="form-control"
                           [(ngModel)]="nuevaSolicitud.origen_otro"
                           placeholder="Ej: Bienestar, Recursos Humanos..."
                           (keydown)="soloTexto($event)"
                           (input)="sanitizarTexto($event)"
                           maxlength="100">
                    <button class="btn btn-phoenix-success" (click)="guardarNuevoDepartamento()" [disabled]="!nuevaSolicitud.origen_otro.trim()">
                      <span class="fas fa-save me-1"></span>Guardar
                    </button>
                  </div>
                  <small class="text-muted">Solo letras, espacios y guiones. Se guardará en el catálogo.</small>
                </div>

                <!-- Gestión de departamentos personalizados (solo admin/director) -->
                <div class="col-12" *ngIf="departamentosPersonalizados.length > 0 && auth.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO')">
                  <div class="border rounded p-2 bg-body-tertiary">
                    <small class="text-700 fw-bold d-block mb-1"><span class="fas fa-tags me-1"></span>Departamentos Guardados</small>
                    <div class="d-flex flex-wrap gap-1">
                      <span *ngFor="let dep of departamentosPersonalizados"
                            class="badge badge-phoenix badge-phoenix-secondary d-flex align-items-center gap-1 fs--2">
                        {{ dep.nombre }}
                        <button class="btn p-0 ms-1" style="line-height:1" (click)="eliminarDepartamento(dep)"
                                title="Eliminar">
                          <span class="fas fa-times text-danger" style="font-size:0.65rem"></span>
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

               <!-- Agregar Medicamento -->
               <div class="col-12">
                 <label class="form-label fw-bold">Agregar Medicamento <span class="text-danger">*</span></label>
                 <div class="input-group">
                   <input type="text" class="form-control" readonly style="cursor: pointer;"
                     [value]="itemTemporal.id_med_base ? getNombreMed(itemTemporal.id_med_base) : 'Haga clic para buscar medicamento...'" 
                     (click)="abrirBuscador()">
                   <button class="btn btn-outline-secondary" type="button" (click)="abrirBuscador()">
                     <span class="fas fa-search"></span>
                   </button>
                   <input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control hide-spinners" style="width: 100px; max-width: 100px;"
                          placeholder="Cant." [(ngModel)]="itemTemporal.cantidad"
                          (keydown)="soloNumerico($event)"
                          (input)="limpiarCantidad($event)">
                   <button class="btn btn-phoenix-primary" (click)="agregarItem()" [disabled]="!itemTemporal.id_med_base || !itemTemporal.cantidad || +itemTemporal.cantidad < 1">
                     <span class="fas fa-plus"></span>
                   </button>
                 </div>
               </div>

               <!-- Tabla de items agregados -->
               <div class="col-12 mt-3" *ngIf="nuevaSolicitud.items.length > 0">
                 <div class="table-responsive">
                   <table class="table table-sm border">
                     <thead class="bg-light">
                       <tr>
                         <th>Medicamento</th>
                         <th>Componentes</th>
                         <th class="text-center">Cantidad</th>
                         <th></th>
                       </tr>
                     </thead>
                     <tbody>
                       <tr *ngFor="let item of nuevaSolicitud.items; let i = index">
                         <td>
                           <span class="fw-semibold">{{ getNombreMed(item.id_med_base) }}</span>
                           <br><small class="text-500">{{ getPresentacionMed(item.id_med_base) }}</small>
                         </td>
                         <td class="fs--2 text-700">{{ getComponentesText(item.id_med_base) }}</td>
                         <td class="text-center fw-bold">{{ item.cantidad }}</td>
                         <td class="text-end">
                           <button class="btn btn-link text-danger p-0" (click)="quitarItem(i)">
                             <span class="fas fa-trash"></span>
                           </button>
                         </td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           </div>
           <div class="modal-footer">
             <button class="btn btn-link" (click)="cerrarModal()">Cancelar</button>
             <button class="btn btn-primary" (click)="guardarSolicitud()" [disabled]="!formularioValido()">
               <span class="fas fa-paper-plane me-1"></span>Enviar Solicitud
             </button>
           </div>
         </div>
       </div>
    </div>

    <!-- Modal Detalle / Procesar -->
    <div class="modal fade" [class.show]="showModalDetalle" [style.display]="showModalDetalle ? 'block' : 'none'" tabindex="-1">
       <div class="modal-dialog modal-xl modal-dialog-centered">
         <div class="modal-content border-0 shadow-lg">
           <div class="modal-header bg-primary text-white">
             <h5 class="modal-title text-white">
               <span class="fas fa-file-invoice me-2"></span>{{ solicitudSeleccionada?.estado === 'PENDIENTE' ? 'Procesar Entrega' : 'Detalle de Solicitud' }}: {{ solicitudSeleccionada?.folio }}
             </h5>
             <button type="button" class="btn-close btn-close-white" (click)="cerrarModalDetalle()"></button>
           </div>
           <div class="modal-body">
             <div class="row mb-3" *ngIf="solicitudSeleccionada">
                 <div class="col-md-3">
                     <small class="text-700">De (Solicitante):</small><br>
                     <span class="fw-bold fs-1 text-primary">{{ solicitudSeleccionada.origen }}</span>
                 </div>
                 <div class="col-md-3">
                     <small class="text-700">Para (Proveedor):</small><br>
                     <span class="fw-bold fs-1 text-primary">{{ solicitudSeleccionada.destino }}</span>
                 </div>
                 <div class="col-md-3">
                     <small class="text-700">Estado:</small><br>
                     <span class="badge fs-0" [ngClass]="{
                       'badge-phoenix-warning': solicitudSeleccionada.estado === 'PENDIENTE',
                       'badge-phoenix-success': solicitudSeleccionada.estado === 'ENTREGADA',
                       'badge-phoenix-danger':  solicitudSeleccionada.estado === 'RECHAZADA'
                     }">{{ solicitudSeleccionada.estado }}</span>
                 </div>
                 <div class="col-md-3 text-end" *ngIf="solicitudSeleccionada.estado !== 'PENDIENTE'">
                     <button class="btn btn-outline-danger mt-2" (click)="generarPDF(solicitudSeleccionada)">
                       <span class="fas fa-file-pdf me-2"></span>Descargar PDF
                     </button>
                 </div>
             </div>

             <!-- Observaciones / Motivo de Rechazo -->
             <div class="mb-3 p-3 bg-body-tertiary rounded border" *ngIf="solicitudSeleccionada && solicitudSeleccionada.observaciones">
               <div class="fs--2 text-700 fw-bold text-uppercase mb-1"><span class="fas fa-comment me-1"></span>Observaciones / Detalles:</div>
               <div class="text-800 fs--1" style="white-space: pre-line;">{{ solicitudSeleccionada.observaciones }}</div>
             </div>

             <div class="table-responsive">
               <table class="table table-sm border align-middle">
                 <thead class="bg-light">
                   <tr>
                     <th>Nombre Medicamento</th>
                     <th *ngIf="solicitudSeleccionada?.estado !== 'PENDIENTE'">Principios Activos/Componentes</th>
                      <th class="text-center" style="width:100px">Cant. Solicitada</th>
                      <ng-container *ngIf="solicitudSeleccionada?.estado === 'PENDIENTE'">
                        <th class="text-center">Lote a Usar</th>
                        <th class="text-center" style="width:120px">Existencia Lote</th>
                        <th class="text-center" style="width:110px">Cant. a Entregar</th>
                        <th style="width:80px"></th>
                      </ng-container>
                     <th class="text-center" *ngIf="solicitudSeleccionada?.estado !== 'PENDIENTE'">Cant. Entregada</th>
                   </tr>
                 </thead>
                 <tbody>
                   <ng-container *ngFor="let d of detallesSolicitud">
                     <!-- Fila principal del medicamento -->
                     <tr *ngIf="solicitudSeleccionada?.estado !== 'PENDIENTE'">
                       <td><span class="fw-bold text-primary">{{ d.nombre_generico }}</span><br><small class="text-500">{{ d.nombre_presentacion }}</small></td>
                       <td class="fs--2 text-700">{{ getComponentesText(d.id_med_base) }}</td>
                       <td class="text-center fw-bold">{{ d.cantidad_solicitada }}</td>
                       <td class="text-center">{{ d.cantidad_entregada }}</td>
                     </tr>

                     <!-- Filas multi-lote (solo en PENDIENTE) -->
                     <ng-container *ngIf="solicitudSeleccionada?.estado === 'PENDIENTE'">
                       <tr *ngFor="let la of d.lotesAsignados; let li = index"
                           [style.border-top]="li > 0 ? '1px dashed rgba(var(--bs-emphasis-color-rgb), 0.15)' : ''">
                         <!-- Medicamento solo en primer lote -->
                         <td [attr.rowspan]="li === 0 ? d.lotesAsignados.length : null" *ngIf="li === 0" class="fw-semibold">
                           {{ d.nombre_generico }} ({{ d.nombre_presentacion }})
                         </td>
                         <!-- Cantidad Solicitada (con badge de asignación) -->
                         <td [attr.rowspan]="li === 0 ? d.lotesAsignados.length : null" *ngIf="li === 0" class="text-center">
                           <div class="fw-bold">{{ d.cantidad_solicitada }}</div>
                           <div class="mt-1">
                             <small [class]="getTotalAsignadoClass(d)" class="badge">
                               {{ getTotalAsignado(d) }} asignados
                             </small>
                           </div>
                         </td>
                         <!-- Selector de lote -->
                         <td class="text-center">
                           <select class="form-select form-select-sm" [(ngModel)]="la.id_lote_origen" (change)="onLoteChange(d, la)">
                              <option [ngValue]="null">— No existe en inventario —</option>
                              <option *ngFor="let l of getLotesPara(d.id_med_base)" [ngValue]="l.id_lote"
                                      [disabled]="loteYaUsado(d, l.id_lote, li)">
                                 {{ l.numero_lote }} (Existencia: {{ l.cantidad_actual }})
                              </option>
                           </select>
                         </td>
                         <!-- Existencia disponible del lote seleccionado -->
                         <td class="text-center">
                           <span *ngIf="la.id_lote_origen" [class]="getExistenciaLote(la.id_lote_origen) > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'">
                             {{ getExistenciaLote(la.id_lote_origen) }}
                           </span>
                           <span *ngIf="!la.id_lote_origen" class="text-muted">—</span>
                         </td>
                         <!-- Cantidad a entregar (INPUT) -->
                         <td class="text-center">
                           <input type="number" class="form-control form-control-sm text-center mx-auto hide-spinners fw-bold border-primary" style="max-width:90px"
                                  [(ngModel)]="la.cantidad_asignar" min="0"
                                  [max]="getExistenciaLote(la.id_lote_origen)"
                                  [disabled]="!la.id_lote_origen"
                                  (ngModelChange)="capCantidad(d, la)"
                                  (keydown)="preventInvalidChars($event)"
                                  oninput="if(this.value.length > 4) this.value = this.value.slice(0, 4);">
                         </td>
                         <!-- Botones añadir/quitar lote -->
                         <td class="text-center">
                           <div class="d-flex justify-content-center gap-1">
                             <button class="btn btn-sm btn-phoenix-danger p-1" *ngIf="li > 0"
                                     (click)="quitarLote(d, li)" title="Quitar este lote">
                               <span class="fas fa-minus"></span>
                             </button>
                             <button class="btn btn-sm btn-phoenix-success p-1"
                                     *ngIf="li === d.lotesAsignados.length - 1 && getLotesPara(d.id_med_base).length > d.lotesAsignados.length && d.lotesAsignados.length < 5"
                                     (click)="agregarLote(d)" title="Agregar otro lote">
                               <span class="fas fa-plus"></span>
                             </button>
                           </div>
                         </td>
                       </tr>
                     </ng-container>
                   </ng-container>
                 </tbody>
               </table>
             </div>
           </div>
           <div class="modal-footer">
             <button class="btn btn-link" (click)="cerrarModalDetalle()">Cerrar</button>
             <ng-container *ngIf="puedoProcesar(solicitudSeleccionada)">
               <button class="btn btn-outline-danger" (click)="procesar('RECHAZADA')">Rechazar</button>
               <button class="btn btn-success" (click)="procesar('ENTREGADA')" [disabled]="!esValidoParaConfirmar()">Confirmar y Transferir Existencia</button>
             </ng-container>
           </div>
         </div>
       </div>
    </div>
    <!-- Mini Modal Buscador -->
    <div class="modal fade" [class.show]="showModalBuscador" [style.display]="showModalBuscador ? 'block' : 'none'" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title text-white">
              <span class="fas fa-search me-2"></span>Buscar Medicamento en {{ nuevaSolicitud.destino }}
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrarBuscador()"></button>
          </div>
          <div class="modal-body">
            <input type="text" class="form-control mb-3" placeholder="Buscar por nombre o componente..." [(ngModel)]="busquedaMed">
            <div class="table-responsive" style="height: 415px; overflow-y: auto;">
              <table class="table table-sm table-hover border align-middle">
                <thead class="bg-light">
                  <tr>
                    <th>Medicamento</th>
                    <th>Componentes</th>
                    <th class="text-center" style="width:90px">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of paginatedMeds" (click)="seleccionarMed(m)" style="cursor: pointer;"
                      [class.table-secondary]="m.existencia_total === 0">
                    <td>
                      <span class="fw-semibold" [ngClass]="{'text-500': m.existencia_total === 0}">{{ m.nombre_generico }}</span>
                      <br *ngIf="m.nombre_presentacion">
                      <span class="badge badge-phoenix badge-phoenix-info fs--2" *ngIf="m.nombre_presentacion">{{ m.nombre_presentacion }}</span>
                    </td>
                    <td class="fs--2 text-700">{{ m.componentes_text }}</td>
                    <td class="text-center">
                      <span class="badge fw-bold" [ngClass]="m.existencia_total > 0 ? 'badge-phoenix-success' : 'badge-phoenix-danger'">{{ m.existencia_total | number }}</span>
                    </td>
                  </tr>
                  <tr *ngIf="paginatedMeds.length === 0">
                    <td colspan="3" class="text-center py-4 text-500">No se encontraron medicamentos</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-2" *ngIf="medicamentosDisponiblesDestino.length > 0">
              <span class="fs--2 text-500">Mostrando {{ paginatedMeds.length }} de {{ medicamentosDisponiblesDestino.length }}</span>
              <ul class="pagination mb-0">
                <li class="page-item" [class.disabled]="medsCurrentPage === 1">
                  <button class="page-link" (click)="cambiarPaginaMeds(medsCurrentPage - 1)">
                    <span class="fas fa-chevron-left"></span>
                  </button>
                </li>
                <li class="page-item" *ngFor="let p of medsPagesArray" [class.active]="p === medsCurrentPage">
                  <button class="page-link" (click)="cambiarPaginaMeds(p)">{{ p }}</button>
                </li>
                <li class="page-item" [class.disabled]="medsCurrentPage === medsTotalPages">
                  <button class="page-link" (click)="cambiarPaginaMeds(medsCurrentPage + 1)">
                    <span class="fas fa-chevron-right"></span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal { background: rgba(0,0,0,0.5); z-index: 1050; }
    .modal.show { display: block; }
    .modal-content { color: var(--phoenix-body-color, inherit); }
    
    /* Hide spinners on number inputs */
    input[type="number"].hide-spinners::-webkit-outer-spin-button,
    input[type="number"].hide-spinners::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"].hide-spinners {
      -moz-appearance: textfield;
    }
    :host ::ng-deep body.modal-open {
      overflow: hidden !important;
    }
  `]
})
export class SolicitudesComponent implements OnInit {
  solicitudes: any[] = [];
  filtro = 'todas';
  medicamentos: any[] = [];
  inventarioOrigen: any[] = [];
  filtroOrigen: string | null = null;
  departamentosPersonalizados: any[] = [];
  
  showModalNueva = false;
  showModalDetalle = false;

  nuevaSolicitud = {
    origen: '',
    origen_otro: '',
    destino: 'PROVEEDURIA',
    observaciones: '',
    items: [] as any[]
  };

  itemTemporal: { id_med_base: number, cantidad: any } = {
    id_med_base: 0,
    cantidad: ''
  };

  fecha_desde: string = '';
  fecha_hasta: string = '';
  maxDate: string = '';
  minDate: string = '';

  constructor(
    private svc: ProveeduriaService,
    private medSvc: MedicamentosService,
    private authSvc: AuthService,
    private swal: SwalService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  // Exponer auth para el template
  get auth() { return this.authSvc; }

  ngOnInit(): void {
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);
    this.minDate = lastYear.toISOString().split('T')[0];
    
    // Rango default: 1 mes atrás hasta hoy
    this.fecha_hasta = this.maxDate;
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    this.fecha_desde = lastMonth.toISOString().split('T')[0];

    this.route.queryParams.subscribe(params => {
      if (params['origen']) this.filtroOrigen = params['origen'];
      this.cargarSolicitudes();
    });
    this.cargarMedicamentos();
    this.cargarDepartamentos();
  }

  limpiarFiltros(): void {
    this.filtro = 'todas';
    this.filtroOrigen = null;
    this.fecha_hasta = this.maxDate;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    this.fecha_desde = lastMonth.toISOString().split('T')[0];
    this.cargarSolicitudes();
  }

  setFiltroOrigen(o: string | null): void {
    if (this.filtroOrigen === o) {
      this.filtroOrigen = null;
    } else {
      this.filtroOrigen = o;
    }
    this.currentPage = 1;
  }

  cargarSolicitudes(): void {
    const params: any = {};
    if (this.fecha_desde) params.desde = this.fecha_desde;
    if (this.fecha_hasta) params.hasta = this.fecha_hasta;

    this.svc.getSolicitudes(params).subscribe(data => {
      this.solicitudes = data;
      this.currentPage = 1;
      this.cdr.detectChanges();
    });
  }

  cargarMedicamentos(): void {
    this.medSvc.getMedicamentosBase().subscribe(data => this.medicamentos = data);
  }

  cargarDepartamentos(): void {
    this.svc.getDepartamentos().subscribe({
      next: data => { this.departamentosPersonalizados = data; this.cdr.detectChanges(); },
      error: () => { this.departamentosPersonalizados = []; }
    });
  }

  /** Validación completa del formulario de nueva solicitud */
  formularioValido(): boolean {
    const origenOk = !!(this.nuevaSolicitud.origen && this.nuevaSolicitud.origen !== 'OTRO' && this.nuevaSolicitud.origen !== '');
    const itemsOk = this.nuevaSolicitud.items.length > 0;
    const destinoDistinto = this.nuevaSolicitud.origen !== this.nuevaSolicitud.destino;
    return origenOk && itemsOk && destinoDistinto;
  }

  /** Solo permite teclas numéricas, backspace, delete, tab, flechas */
  soloNumerico(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Limpia el valor del input de cantidad removiendo no-numéricos */
  limpiarCantidad(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, '');
    input.value = val;
    this.itemTemporal.cantidad = val ? parseInt(val, 10) : '';
    if (this.itemTemporal.cantidad && +this.itemTemporal.cantidad > 20000) {
      this.itemTemporal.cantidad = 20000;
      input.value = '20000';
    }
  }

  /** Solo permite teclas de texto (letras, espacios, guiones, puntos) */
  soloTexto(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', ' ', '-', '.'];
    if (allowed.includes(event.key)) return;
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Sanitiza el valor del campo de texto para departamentos */
  sanitizarTexto(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Quitar números y caracteres especiales (excepto guion, punto, espacio)
    const val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-\.]/g, '');
    input.value = val;
    this.nuevaSolicitud.origen_otro = val;
  }

  guardarNuevoDepartamento(): void {
    const nombre = this.nuevaSolicitud.origen_otro.trim().toUpperCase();
    if (!nombre) return;
    this.svc.crearDepartamento(nombre).subscribe({
      next: (dep) => {
        this.swal.success('Departamento guardado', `"${dep.nombre}" se registró correctamente.`);
        this.cargarDepartamentos();
        this.nuevaSolicitud.origen = dep.nombre;
        this.nuevaSolicitud.origen_otro = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Si ya existe, simplemente lo seleccionamos
        if (err.status === 400 && err.error?.id) {
          this.nuevaSolicitud.origen = nombre;
          this.nuevaSolicitud.origen_otro = '';
          this.cargarDepartamentos();
        } else {
          this.swal.error('Error', err.error?.detail || 'No se pudo guardar el departamento.');
        }
      }
    });
  }

  eliminarDepartamento(dep: any): void {
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: '¿Eliminar departamento?',
        text: `Se eliminará "${dep.nombre}" del catálogo.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33'
      }).then(result => {
        if (result.isConfirmed) {
          this.svc.eliminarDepartamento(dep.id).subscribe({
            next: () => {
              this.swal.success('Eliminado', 'Departamento eliminado correctamente.');
              this.cargarDepartamentos();
              if (this.nuevaSolicitud.origen === dep.nombre) this.nuevaSolicitud.origen = '';
            },
            error: (err) => this.swal.error('Error', err.error?.detail || 'No se pudo eliminar.')
          });
        }
      });
    });
  }

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;

  get solicitudesFiltradas() {
    let list = this.solicitudes;
    if (this.filtroOrigen) {
      if (this.filtroOrigen === 'OTROS') {
        // Cualquier solicitud cuyo origen NO sea FARMACIA ni PROVEEDURIA
        list = list.filter(s => s.origen !== 'FARMACIA' && s.origen !== 'PROVEEDURIA');
      } else {
        list = list.filter(s => s.origen === this.filtroOrigen);
      }
    }
    if (this.filtro !== 'todas') {
      list = list.filter(s => s.estado === this.filtro);
    }
    return list;
  }

  get paginatedSolicitudes() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.solicitudesFiltradas.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.solicitudesFiltradas.length / this.pageSize) || 1;
  }

  get pagesArray() {
    const total = this.totalPages;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4 && start > 1) {
      start = Math.max(1, end - 4);
    }
    const arr = [];
    for(let i=start; i<=end; i++) arr.push(i);
    return arr;
  }

  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  inventarioDestino: any[] = [];

  abrirModalNueva(): void {
    this.nuevaSolicitud = { origen: '', origen_otro: '', destino: '', observaciones: '', items: [] };
    this.itemTemporal = { id_med_base: 0, cantidad: '' };
    
    if (this.authSvc.hasRole('ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO')) {
      this.nuevaSolicitud.origen = 'FARMACIA';
      this.nuevaSolicitud.destino = 'PROVEEDURIA';
    } else if (this.authSvc.hasRole('PROVEEDURIA')) {
      this.nuevaSolicitud.origen = 'PROVEEDURIA';
      this.nuevaSolicitud.destino = 'FARMACIA';
    } else {
      this.nuevaSolicitud.origen = 'FARMACIA';
      this.nuevaSolicitud.destino = 'PROVEEDURIA';
    }
    
    this.cargarInventarioDestino();
    this.cargarDepartamentos();
    this.showModalNueva = true;
    document.body.classList.add('modal-open');
  }

  onDestinoChange(): void {
    this.nuevaSolicitud.items = []; // Limpiar items si cambia destino
    this.cargarInventarioDestino();
  }

  onOrigenChange(): void {
    this.nuevaSolicitud.origen_otro = '';
    this.nuevaSolicitud.items = []; // Limpiar items si cambia origen
    
    if (this.nuevaSolicitud.origen === 'OTRO') {
      this.nuevaSolicitud.destino = 'PROVEEDURIA';
    } else if (this.nuevaSolicitud.origen === 'FARMACIA') {
      this.nuevaSolicitud.destino = 'PROVEEDURIA';
    } else if (this.nuevaSolicitud.origen === 'PROVEEDURIA') {
      this.nuevaSolicitud.destino = 'FARMACIA';
    } else {
      this.nuevaSolicitud.destino = 'PROVEEDURIA';
    }
    this.cargarInventarioDestino();
  }

  cargarInventarioDestino(): void {
    const schema = this.nuevaSolicitud.destino.toUpperCase().includes('PROV') ? 'proveeduria' : 'farmacia';
    this.svc.getInventario(schema).subscribe(data => this.inventarioDestino = data);
  }

  cerrarModal(): void {
    this.showModalNueva = false;
    document.body.classList.remove('modal-open');
  }

  verificarLimites(): void {
    if (this.itemTemporal.cantidad !== null && this.itemTemporal.cantidad !== undefined) {
      if (+this.itemTemporal.cantidad < 1) this.itemTemporal.cantidad = '';
      if (+this.itemTemporal.cantidad > 20000) this.itemTemporal.cantidad = 20000;
    }
  }

  // Buscador de Medicamentos
  showModalBuscador = false;
  busquedaMed = '';
  medsCurrentPage = 1;
  medsPageSize = 10;

  get medicamentosDisponiblesDestino() {
    let arr = this.medicamentos.map(m => {
      const existencia = this.inventarioDestino
        .filter(l => l.id_med_base === m.id_med_base)
        .reduce((sum, l) => sum + Number(l.cantidad_actual), 0);
      return {
        id_med_base: m.id_med_base,
        nombre_generico: m.nombre_generico,
        nombre_presentacion: m.presentacion || m.nombre_presentacion,
        componentes_text: this.getComponentesText(m.id_med_base),
        existencia_total: existencia
      };
    });
    if (this.busquedaMed) {
      const q = this.busquedaMed.toLowerCase();
      // Búsqueda inteligente (por partes) en nombre y componentes
      const terms = q.split(' ').filter(t => t.trim() !== '');
      arr = arr.filter(x => {
        const searchStr = `${x.nombre_generico} ${x.nombre_presentacion || ''} ${x.componentes_text}`.toLowerCase();
        return terms.every(term => searchStr.includes(term));
      });
    }
    return arr;
  }

  get paginatedMeds() {
    const start = (this.medsCurrentPage - 1) * this.medsPageSize;
    return this.medicamentosDisponiblesDestino.slice(start, start + this.medsPageSize);
  }

  get medsTotalPages() {
    return Math.ceil(this.medicamentosDisponiblesDestino.length / this.medsPageSize) || 1;
  }

  get medsPagesArray(): number[] {
    const total = this.medsTotalPages;
    const current = this.medsCurrentPage;
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }
    const arr = [];
    for (let i = start; i <= end; i++) {
      arr.push(i);
    }
    return arr;
  }

  cambiarPaginaMeds(p: number) {
    if (p >= 1 && p <= this.medsTotalPages) this.medsCurrentPage = p;
  }

  abrirBuscador() {
    this.busquedaMed = '';
    this.medsCurrentPage = 1;
    this.showModalBuscador = true;
  }

  cerrarBuscador() {
    this.showModalBuscador = false;
  }

  seleccionarMed(m: any) {
    this.itemTemporal.id_med_base = m.id_med_base;
    this.cerrarBuscador();
  }

  getPresentacionMed(id: number): string {
    const m = this.medicamentos.find(x => x.id_med_base == id);
    return m?.nombre_presentacion || m?.presentacion || '';
  }

  agregarItem(): void {
    const cant = parseInt(String(this.itemTemporal.cantidad), 10);
    if (this.itemTemporal.id_med_base && cant > 0) {
      this.itemTemporal.cantidad = cant;
      // Verificar existencia en destino
      const existenciaDisp = this.inventarioDestino
        .filter(l => l.id_med_base == this.itemTemporal.id_med_base)
        .reduce((sum, l) => sum + Number(l.cantidad_actual), 0);
        
      if (existenciaDisp < cant) {
         if (existenciaDisp === 0 && this.nuevaSolicitud.destino === 'FARMACIA') {
           this.swal.error('Sin Existencia', 'Este medicamento no tiene existencia en Farmacia.');
           return;
         }

         import('sweetalert2').then(Swal => {
           Swal.default.fire({
             title: 'Advertencia de Existencia',
             text: `El departamento ${this.nuevaSolicitud.destino} solo tiene ${existenciaDisp} unidades disponibles. ¿Desea agregarlo de todas formas?`,
             icon: 'warning',
             showCancelButton: true,
             confirmButtonText: 'Sí, agregar',
             cancelButtonText: 'Cancelar'
           }).then(result => {
             if (result.isConfirmed) {
                this.nuevaSolicitud.items.push({...this.itemTemporal});
                this.itemTemporal = { id_med_base: 0, cantidad: '' };
                this.cdr.detectChanges();
             }
           });
         });
         return;
      }

      this.nuevaSolicitud.items.push({...this.itemTemporal});
      this.itemTemporal = { id_med_base: 0, cantidad: '' };
    }
  }

  quitarItem(index: number): void {
    this.nuevaSolicitud.items.splice(index, 1);
  }

  getNombreMed(id: number): string {
    const m = this.medicamentos.find(x => x.id_med_base == id);
    return m ? m.nombre_generico : 'Desconocido';
  }

  getComponentesText(id: number): string {
    const m = this.medicamentos.find(x => x.id_med_base == id);
    if (!m) return 'Sin componentes';
    if (m.componentes_json && Array.isArray(m.componentes_json) && m.componentes_json.length > 0) {
      return m.componentes_json.map((c: any) => `${c.nombre_principio} ${c.concentracion_valor || ''}${c.nombre_unidad || ''}`).join(' + ');
    }
    if (m.componentes) return m.componentes;
    return 'Sin componentes';
  }

  guardarSolicitud(): void {
    const payload = { ...this.nuevaSolicitud };
    if (payload.origen === 'OTRO') {
      payload.origen = payload.origen_otro || 'OTRO';
    }
    
    this.svc.crearSolicitud(payload).subscribe(() => {
      this.swal.success('Solicitud enviada exitosamente');
      this.cerrarModal();
      this.cargarSolicitudes();
      this.nuevaSolicitud = { origen: 'FARMACIA', origen_otro: '', destino: 'PROVEEDURIA', observaciones: '', items: [] as any[] };
    });
  }

  solicitudSeleccionada: any = null;
  detallesSolicitud: any[] = [];

  // ── Helpers de inventario ────────────────────────────────────────────────

  /** Lotes disponibles para un medicamento (solo con existencia > 0) */
  getLotesPara(idMed: number): any[] {
    return this.inventarioOrigen.filter(l => l.id_med_base == idMed && l.cantidad_actual > 0);
  }

  /** Existencia real del lote seleccionado */
  getExistenciaLote(idLote: number | null): number {
    if (!idLote) return 0;
    const l = this.inventarioOrigen.find(x => x.id_lote === idLote);
    return l ? Number(l.cantidad_actual) : 0;
  }

  /** Evitar seleccionar el mismo lote en dos filas del mismo medicamento */
  loteYaUsado(d: any, idLote: number, indexActual: number): boolean {
    return d.lotesAsignados.some((la: any, i: number) => i !== indexActual && la.id_lote_origen === idLote);
  }

  /** Total ya asignado entre todos los lotes de un item */
  getTotalAsignado(d: any): number {
    return d.lotesAsignados.reduce((s: number, la: any) => s + (Number(la.cantidad_asignar) || 0), 0);
  }

  /** Clase del badge según si llega a la cantidad solicitada */
  getTotalAsignadoClass(d: any): string {
    const total = this.getTotalAsignado(d);
    if (total === 0)                    return 'badge-phoenix-secondary';
    if (total < d.cantidad_solicitada)  return 'badge-phoenix-warning';
    if (total === d.cantidad_solicitada) return 'badge-phoenix-success';
    return 'badge-phoenix-danger'; // sobrepasa
  }

  // ── Eventos de lote ──────────────────────────────────────────────────────

  /** Al cambiar lote: si es null → cantidad=0; si tiene existencia → cap automático */
  onLoteChange(d: any, la: any): void {
    if (!la.id_lote_origen) {
      la.cantidad_asignar = 0;
      return;
    }
    const existencia = this.getExistenciaLote(la.id_lote_origen);
    // Calcular cuánto ya está asignado en otros lotes del mismo item
    const yaAsignado = d.lotesAsignados
      .filter((x: any) => x !== la)
      .reduce((s: number, x: any) => s + (Number(x.cantidad_asignar) || 0), 0);
    const pendiente = d.cantidad_solicitada - yaAsignado;
    // La cantidad sugerida es el mínimo entre el existencia y lo que falta
    la.cantidad_asignar = Math.min(existencia, Math.max(pendiente, 0));
  }

  /** Caps manuales para que no supere el existencia ni la cantidad pendiente */
  capCantidad(d: any, la: any): void {
    setTimeout(() => {
      if (la.cantidad_asignar === null || la.cantidad_asignar === undefined || la.cantidad_asignar < 0) {
        la.cantidad_asignar = null as any;
      }

      // Límite absoluto de 20000 unidades por fila
      if (la.cantidad_asignar > 20000) {
        la.cantidad_asignar = 20000;
        this.swal.warning('Límite Excedido', 'No se permiten entregas mayores a 20000 por lote.');
      }

      const existencia = this.getExistenciaLote(la.id_lote_origen);
      if (la.cantidad_asignar > existencia) {
        la.cantidad_asignar = existencia;
        this.swal.warning('Existencia Insuficiente', 'La cantidad no puede ser mayor a la existencia real del lote.');
      }

      // Límite para no superar la cantidad máxima solicitada
      const yaAsignado = d.lotesAsignados
        .filter((x: any) => x !== la)
        .reduce((s: number, x: any) => s + (Number(x.cantidad_asignar) || 0), 0);
      
      const maxPermitido = d.cantidad_solicitada - yaAsignado;
      if (la.cantidad_asignar > maxPermitido) {
        la.cantidad_asignar = maxPermitido > 0 ? maxPermitido : 0;
        this.swal.warning('Límite de Solicitud', 'La cantidad a entregar no puede exceder el total solicitado.');
      }
    });
  }

  // ── Multi-lote ───────────────────────────────────────────────────────────

  agregarLote(d: any): void {
    d.lotesAsignados.push({ id_lote_origen: null, cantidad_asignar: 0 });
  }

  quitarLote(d: any, index: number): void {
    d.lotesAsignados.splice(index, 1);
  }

  // ── Permisos ─────────────────────────────────────────────────────────────

  puedoProcesar(s: any): boolean {
    if (!s || s.estado !== 'PENDIENTE') return false;
    const user = this.authSvc.getCurrentUser();
    if (!user) return false;
    if (s.destino === 'PROVEEDURIA' || s.destino === 'PROVEEDURÍA') {
      return this.authSvc.hasRole('PROVEEDURIA', 'ENCARGADO', 'ADMINISTRADOR');
    }
    if (s.destino === 'FARMACIA') {
      return this.authSvc.hasRole('FARMACEUTICO', 'ENCARGADO', 'ADMINISTRADOR');
    }
    return false;
  }

  // ── Procesar entrega ─────────────────────────────────────────────────────  // ✅ Procesar entrega ✅

  esValidoParaConfirmar(): boolean {
    if (!this.detallesSolicitud || this.detallesSolicitud.length === 0) return false;

    for (const d of this.detallesSolicitud) {
      let sumaItem = 0;
      for (const la of d.lotesAsignados) {
        if (!la.id_lote_origen && la.cantidad_asignar > 0) return false;
        if (la.id_lote_origen && (!la.cantidad_asignar || la.cantidad_asignar <= 0)) return false;
        if (la.id_lote_origen && la.cantidad_asignar > this.getExistenciaLote(la.id_lote_origen)) return false;
        sumaItem += Number(la.cantidad_asignar) || 0;
      }
      if (sumaItem <= 0) return false;
    }
    return true;
  }

  preventInvalidChars(event: KeyboardEvent) {
    if (['e', 'E', '+', '-', '.', ','].includes(event.key) || event.key === ' ') {
      event.preventDefault();
    }
  }

  procesar(nuevoEstado: string): void {
    if (nuevoEstado === 'RECHAZADA') {
        import('sweetalert2').then(Swal => {
            Swal.default.fire({
                title: 'Rechazar Solicitud',
                input: 'textarea',
                inputLabel: 'Motivo del rechazo (obligatorio)',
                inputPlaceholder: 'Escriba el motivo aquí...',
                showCancelButton: true,
                confirmButtonText: 'Confirmar Rechazo',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) return '¡Debe ingresar un motivo!';
                    return null;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this.enviarProcesamiento('RECHAZADA', result.value);
                }
            });
        });
        return;
    }

    if (nuevoEstado === 'ENTREGADA') {
        // Validar que TODOS los ítems tengan una selección explícita de lote
        for (const d of this.detallesSolicitud) {
          // Verificar que ningún lote quede "sin tocar" (null Y cantidad > 0 sin selección)
          const todosSeleccionados = d.lotesAsignados.every((la: any) =>
            la.id_lote_origen !== undefined  // tiene al menos una opción elegida (null = "no existe" está bien)
          );
          // Si el primer y único lote tiene null y cantidad > 0, es que no se seleccionó nada
          if (d.lotesAsignados.length === 1 && !d.lotesAsignados[0].id_lote_origen && d.lotesAsignados[0].cantidad_asignar > 0) {
            this.swal.error('Selección incompleta',
              `"${d.nombre_generico}": si no hay existencia seleccione "No existe en inventario" y deje cantidad en 0.`);
            return;
          }
          for (const la of d.lotesAsignados) {
            if (la.cantidad_asignar === null || la.cantidad_asignar === undefined || la.cantidad_asignar === '') {
              this.swal.error('Campo Vacío', `La cantidad para "${d.nombre_generico}" no puede estar vacía. Ingrese 0 si no entregará nada.`); return;
            }
            if (la.cantidad_asignar < 0) {
              this.swal.error('Error', 'No se permiten cantidades negativas.'); return;
            }
            if (la.id_lote_origen && la.cantidad_asignar === 0) {
              this.swal.error('Error', `Seleccionó un lote para "${d.nombre_generico}" pero la cantidad es 0. Retire el lote o asigne una cantidad válida.`); return;
            }
            if (!la.id_lote_origen && la.cantidad_asignar > 0) {
              this.swal.error('Error', `Asignó una cantidad mayor a 0 para "${d.nombre_generico}" pero no seleccionó ningún lote.`); return;
            }
            if (la.id_lote_origen && la.cantidad_asignar > this.getExistenciaLote(la.id_lote_origen)) {
              this.swal.error('Error', `La cantidad de "${d.nombre_generico}" supera la existencia disponible del lote.`); return;
            }
          }
        }
    }

    this.enviarProcesamiento(nuevoEstado, '');
  }

  private enviarProcesamiento(nuevoEstado: string, comentario: string) {
    // Expandir multi-lote: un ítem por cada fila de lote asignado
    const items: any[] = [];
    for (const d of this.detallesSolicitud) {
      for (const la of d.lotesAsignados) {
        items.push({
          id_med_base:       d.id_med_base,
          cantidad_a_entregar: Number(la.cantidad_asignar) || 0,
          id_lote_origen:    la.id_lote_origen || null
        });
      }
    }

    const data = { estado: nuevoEstado, comentario, items };

    this.svc.procesarSolicitud(this.solicitudSeleccionada.id_solicitud, data).subscribe({
      next: () => {
        this.swal.success('Solicitud procesada', `La solicitud ha sido marcada como ${nuevoEstado}.`);
        this.cerrarModalDetalle();
        this.cargarSolicitudes();
      },
      error: (err) => {
        this.swal.error('Error al procesar', err.error?.detail || 'Ocurrió un error inesperado.');
      }
    });
  }

  generarPDF(s: any): void {
    this.svc.getPDFData(s.id_solicitud).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Solicitud_${s.folio || s.id_solicitud}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.swal.error('Error', 'No se pudo generar o descargar el PDF.')
    });
  }

  verDetalle(s: any): void {
    this.solicitudSeleccionada = s;
    // DESTINO es quien da el existencia (se cargan sus lotes)
    // FARMACIA→PROVEEDURIA: PROVEEDURIA da → schema=proveeduria
    // PROVEEDURIA→FARMACIA: FARMACIA da    → schema=farmacia
    const schema = s.destino.toUpperCase().includes('PROV') ? 'proveeduria' : 'farmacia';
    this.svc.getInventario(schema).subscribe(data => {
      this.inventarioOrigen = data;
      this.svc.getDetalleSolicitud(s.id_solicitud).subscribe({
        next: (det) => {
          this.detallesSolicitud = det.map(d => ({
            ...d,
            // Siempre inicia en 0 — el usuario debe seleccionar lote y cantidad manualmente
            lotesAsignados: [{ id_lote_origen: null, cantidad_asignar: 0 }]
          }));
          this.showModalDetalle = true;
          document.body.classList.add('modal-open');
          this.cdr.detectChanges();
        },
        error: () => this.swal.error('Error', 'No se pudieron cargar los detalles.')
      });
    });
  }

  cerrarModalDetalle(): void {
    this.showModalDetalle = false;
    this.solicitudSeleccionada = null;
    document.body.classList.remove('modal-open');
  }
}
