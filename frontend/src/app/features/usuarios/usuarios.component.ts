import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { SwalService } from '../../core/services/swal.service';
import { UsuarioApp, RolDisponible } from '../../core/models/farmacia.models';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CedulaPipe } from '../../shared/pipes/cedula.pipe';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map, tap, delay, finalize } from 'rxjs/operators';
import { SoloNumerosDirective } from '../../shared/directives/solo-numeros.directive';
import { UppercaseDirective } from '../../shared/directives/uppercase.directive';
import { evaluatePassword, PasswordRulesState, passwordStrengthValidator } from '../../shared/validators/password.validator';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CedulaPipe, SoloNumerosDirective, UppercaseDirective],
  template: `
    <div class="mb-5" *ngIf="{ view: viewData$ | async } as data">
      <div class="mb-4 d-flex flex-wrap justify-content-between align-items-end gap-2">
        <div>
          <h2 class="mb-2 text-1100">Gestión de Usuarios</h2>
          <h5 class="text-700 fw-semi-bold">Administración de accesos y roles del sistema</h5>
        </div>
        <button class="btn btn-primary btn-sm px-4 shadow-sm" (click)="abrirModal()">
          <span class="fas fa-user-plus me-2"></span>Nuevo Usuario
        </button>
      </div>
      <div class="card shadow-none border-translucent">
      <div class="card-body">
        
        <!-- Pestañas de Filtrado Estratégico -->
        <ul class="nav nav-underline fs--1 mb-3" id="userTabs" role="tablist">
          <li class="nav-item">
            <a class="nav-link text-uppercase fw-bold" [class.active]="filtroEstado === 'activos'" (click)="setFiltro('activos')" style="cursor: pointer;">
              <span class="fas fa-user-check me-1"></span> Activos 
              <span class="badge badge-phoenix badge-phoenix-success ms-1">{{ data.view?.countActivos || 0 }}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-uppercase fw-bold" [class.active]="filtroEstado === 'inactivos'" (click)="setFiltro('inactivos')" style="cursor: pointer;">
              <span class="fas fa-user-times me-1"></span> Inactivos 
              <span class="badge badge-phoenix badge-phoenix-danger ms-1">{{ data.view?.countInactivos || 0 }}</span>
            </a>
          </li>
        </ul>

        <div class="table-responsive scrollbar">
          <table class="table table-sm fs--1 mb-0 border-top border-translucent">
            <thead>
              <tr class="bg-body-secondary">
                <th class="white-space-nowrap align-middle ps-3" style="width:15%;">Cédula / Usuario</th>
                <th class="white-space-nowrap align-middle" style="width:30%;">Nombre Completo</th>
                <th class="white-space-nowrap align-middle text-center" style="width:15%;">Última Conexión</th>
                <th class="white-space-nowrap align-middle text-center" style="width:15%;">Rol Asignado</th>
                <th class="white-space-nowrap align-middle text-center" style="width:15%;">Estado</th>
                <th class="white-space-nowrap align-middle text-end pe-3" style="width:10%;">Acciones</th>
              </tr>
            </thead>
            <tbody class="list">
              <tr *ngFor="let u of data.view?.paginados; trackBy: trackByUsuario" class="hover-actions-trigger">
                <td class="align-middle ps-3 fw-bold text-body-emphasis" [innerText]="u.username | cedula"></td>
                <td class="align-middle text-body-highlight fw-semi-bold">
                  {{ u.first_name }} {{ u.last_name }}
                </td>
                <td class="align-middle text-center">
                  <span class="badge badge-phoenix badge-phoenix-secondary fs--2 text-500" *ngIf="u.last_login">
                    <span class="fas fa-clock me-1"></span>{{ u.last_login | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                  <span class="badge badge-phoenix badge-phoenix-secondary fs--2 text-400" *ngIf="!u.last_login">
                    Nunca
                  </span>
                </td>
                <td class="align-middle text-center">
                  <span class="badge badge-phoenix fs--2 text-uppercase" 
                    [class.badge-phoenix-danger]="u.rol_nombre === 'ADMINISTRADOR' || u.rol_nombre === 'DIRECTOR_SERVICIO_MEDICO'"
                    [class.badge-phoenix-warning]="u.rol_nombre === 'ENCARGADO'"
                    [class.badge-phoenix-success]="u.rol_nombre === 'FARMACEUTICO'"
                    [class.badge-phoenix-info]="u.rol_nombre === 'AUDITOR'"
                    [class.badge-phoenix-primary]="u.rol_nombre === 'PROVEEDURIA'">
                    {{ u.rol_nombre }}
                  </span>
                </td>
                <td class="align-middle text-center">
                  <span class="badge badge-phoenix fs--2 fw-bold" [class.badge-phoenix-success]="u.is_active" [class.badge-phoenix-secondary]="!u.is_active">
                    <span class="fas fa-check-circle" *ngIf="u.is_active"></span>
                    <span class="fas fa-times-circle" *ngIf="!u.is_active"></span>
                    {{ u.is_active ? 'HABILITADO' : 'DESACTIVADO' }}
                  </span>
                </td>
                <td class="align-middle text-end white-space-nowrap pe-3">
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-phoenix-secondary btn-icon btn-icon-only rounded-pill btn-sm shadow-none" 
                            (click)="editarUsuario(u)" 
                            [disabled]="!canEdit(u)"
                            title="Editar Perfil">
                      <span class="fas fa-user-edit text-info"></span>
                    </button>
                    <button class="btn btn-icon btn-icon-only rounded-pill btn-sm shadow-none" 
                            [class.btn-phoenix-danger]="u.is_active" 
                            [class.btn-phoenix-success]="!u.is_active"
                            [disabled]="!canToggle(u)"
                            (click)="toggleEstado(u)" [title]="u.is_active ? 'Desactivar Cuenta' : 'Reactivar Cuenta'">
                      <span class="fas" [class.fa-user-minus]="u.is_active" [class.fa-user-plus]="!u.is_active"></span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="data.view?.paginados?.length === 0">
                <td colspan="5" class="text-center py-5">
                  <div class="d-flex flex-column align-items-center">
                    <span class="fas fa-users-slash fs-3 text-300 mb-2"></span>
                    <p class="text-700 fw-semi-bold">No se encontraron usuarios en esta categoría</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación Estratégica -->
        <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="(data.view?.totalPaginas || 0) > 1">
          <div class="fs--1 text-700 fw-semi-bold">
            Mostrando <span class="text-body-emphasis">{{ (paginaActual - 1) * itemsPorPagina + 1 }}</span>-<b>{{ Math.min(paginaActual * itemsPorPagina, data.view?.filtradosCount || 0) }}</b> de <span class="text-body-emphasis">{{ data.view?.filtradosCount || 0 }}</span> usuarios
          </div>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="paginaActual === 1">
                <button class="page-link shadow-none" (click)="cambiarPagina(paginaActual - 1)" [disabled]="paginaActual === 1">
                  <span class="fas fa-chevron-left fs--2"></span>
                </button>
              </li>
              <li class="page-item mx-1" *ngFor="let p of [].constructor(data.view?.totalPaginas); let i = index" [class.active]="paginaActual === (i + 1)">
                <button class="page-link rounded shadow-none" (click)="cambiarPagina(i + 1)">{{ i + 1 }}</button>
              </li>
              <li class="page-item" [class.disabled]="paginaActual === data.view?.totalPaginas">
                <button class="page-link shadow-none" (click)="cambiarPagina(paginaActual + 1)" [disabled]="paginaActual === data.view?.totalPaginas">
                  <span class="fas fa-chevron-right fs--2"></span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
    </div>

    <!-- Modal Formulario -->
    <div class="modal fade show" [class.d-block]="showModal" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border border-300 shadow-lg">
          <div class="modal-header border-bottom border-300 bg-body-tertiary">
            <h5 class="modal-title text-1000">Registro Institucional (Bienestar Social)</h5>
            <button class="btn-close" type="button" (click)="cerrarModal()"></button>
          </div>
          <div class="modal-body p-4">
            <form [formGroup]="userForm" *ngIf="showModal">
              
              <div class="mb-4" *ngIf="!modoEdicion">
                <label class="form-label fs--1 fw-bold text-uppercase">Verificación Institucional (Cédula)</label>
                <div class="input-group">
                  <span class="input-group-text bg-body-secondary border-end-0"><span class="fas fa-search text-700"></span></span>
                  <input type="text" formControlName="cedula" class="form-control" placeholder="Ej: 20123456" appSoloNumeros maxlength="8" [readonly]="datosCargadosWS" />
                  <button class="btn btn-phoenix-primary px-3" type="button" (click)="buscarBienestar()" [disabled]="buscandoWS || !userForm.get('cedula')?.value">
                    <ng-container *ngIf="buscandoWS">
                      <span class="spinner-border spinner-border-sm me-2"></span>
                      <span>Buscando...</span>
                    </ng-container>
                    <ng-container *ngIf="!buscandoWS">
                      <span class="fas fa-database me-2"></span>
                      <span>Consultar Bienestar</span>
                    </ng-container>
                  </button>
                  <button class="btn btn-phoenix-secondary px-3" type="button" (click)="limpiarForm()" *ngIf="datosCargadosWS">
                    <span class="fas fa-sync-alt"></span>
                  </button>
                </div>
                <div class="fs--2 text-700 mt-1" *ngIf="!datosCargadosWS">Ingrese cédula para validar datos oficiales</div>
                <div class="fs--2 text-success mt-1 fw-bold animate__animated animate__fadeIn" *ngIf="datosCargadosWS">
                  <span class="fas fa-check-circle me-1"></span> Información validada con Bienestar Social
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-sm-6">
                  <label class="form-label fs--1 fw-bold text-uppercase">Nombres</label>
                  <input type="text" formControlName="nombres" class="form-control" [readonly]="true" appUppercase 
                         [title]="modoEdicion ? 'Este campo no se puede modificar' : 'Consulte la cédula para completar este campo automáticamente'" />
                </div>
                <div class="col-sm-6">
                  <label class="form-label fs--1 fw-bold text-uppercase">Apellidos</label>
                  <input type="text" formControlName="apellidos" class="form-control" [readonly]="true" appUppercase
                         [title]="modoEdicion ? 'Este campo no se puede modificar' : 'Consulte la cédula para completar este campo automáticamente'" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fs--1 fw-bold">ROL INSTITUCIONAL</label>
                <select formControlName="id_rol" class="form-select">
                  <option value="">— Seleccione una jerarquía —</option>
                  <option *ngFor="let r of roles" [value]="r.id_rol">{{ r.nombre_rol }}</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fs--1 fw-bold">CONTRASEÑA</label>
                <div class="input-group position-relative">
                  <input 
                    [type]="showPassMain ? 'text' : 'password'" 
                    formControlName="password" 
                    class="form-control pe-5" 
                    placeholder="{{ modoEdicion ? 'Dejar vacío si no desea cambiar' : 'Mínimo 8 caracteres' }}"
                  />
                  <button type="button" class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none text-secondary" (click)="showPassMain = !showPassMain" style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <span class="password-eye-icon" [class.visible]="showPassMain"></span>
                  </button>
                </div>

                <!-- Real-time rules checklist inside admin user modal -->
                <div class="password-rules-checklist mt-2 mb-1 p-3 rounded-3" 
                     style="font-size: 0.75rem; transition: opacity 0.3s ease;"
                     [style.opacity]="userForm.get('password')?.value ? '1' : '0.4'"
                     [style.pointer-events]="userForm.get('password')?.value ? 'auto' : 'none'"
                     [ngClass]="{
                       'bg-dark-checklist border border-700': isDarkModeActive(),
                       'bg-light border border-300': !isDarkModeActive()
                     }">
                  <p class="fw-bold mb-2 checklist-title">La contraseña debe cumplir con:</p>
                  
                  <div class="row g-2">
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasMinLength" [class.invalid]="!passwordRules.hasMinLength"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasMinLength" [class.fw-semibold]="passwordRules.hasMinLength">Mínimo 8 caracteres</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasUppercase" [class.invalid]="!passwordRules.hasUppercase"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasUppercase" [class.fw-semibold]="passwordRules.hasUppercase">Una mayúscula</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasLowercase" [class.invalid]="!passwordRules.hasLowercase"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasLowercase" [class.fw-semibold]="passwordRules.hasLowercase">Una minúscula</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasNumber" [class.invalid]="!passwordRules.hasNumber"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasNumber" [class.fw-semibold]="passwordRules.hasNumber">Un número</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasSpecialChar" [class.invalid]="!passwordRules.hasSpecialChar"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasSpecialChar" [class.fw-semibold]="passwordRules.hasSpecialChar">Carácter especial</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasNoSpaces" [class.invalid]="!passwordRules.hasNoSpaces"></span>
                      <span class="checklist-label" [class.text-success]="passwordRules.hasNoSpaces" [class.fw-semibold]="passwordRules.hasNoSpaces">Sin espacios</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3" *ngIf="!modoEdicion">
                <label class="form-label fs--1 fw-bold">CONFIRMACIÓN</label>
                <div class="input-group position-relative">
                  <input 
                    [type]="showPassConfirm ? 'text' : 'password'" 
                    formControlName="password_confirm" 
                    class="form-control pe-5" 
                    placeholder="Repita la contraseña"
                  />
                  <button type="button" class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none text-secondary" (click)="showPassConfirm = !showPassConfirm" style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <span class="password-eye-icon" [class.visible]="showPassConfirm"></span>
                  </button>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer border-top border-300 p-4" *ngIf="showModal">
            <button class="btn btn-link text-danger px-4" type="button" (click)="cerrarModal()">Cancelar</button>
            <button class="btn btn-primary px-5 shadow-sm" (click)="guardar()" [disabled]="userForm.invalid || isSubmitting">
              <span class="spinner-border spinner-border-sm me-2" *ngIf="isSubmitting"></span>
              {{ isSubmitting ? 'Procesando...' : (modoEdicion ? 'Actualizar Usuario' : 'Finalizar Registro') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-success-custom {
      color: #25a174 !important;
      font-weight: 500;
    }
    .text-muted-custom {
      color: #748194 !important;
    }

    .password-check-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 6px;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      vertical-align: middle;
      flex-shrink: 0;
    }
    .password-check-icon.valid {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMyNWExNzQiLz48cG9seWxpbmUgcG9pbnRzPSIxNiA5IDExIDE0IDggMTEiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=");
    }
    .password-check-icon.invalid {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNkYzM1NDUiLz48bGluZSB4MT0iMTUiIHkxPSI5IiB4Mj0iOSIgeTI9IjE1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGxpbmUgeDE9IjkiIHkxPSI5IiB4Mj0iMTUiIHkyPSIxNSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==");
    }

    .password-eye-icon {
      display: inline-block;
      width: 20px;
      height: 20px;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      vertical-align: middle;
    }
    .password-eye-icon.visible {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNmM3NTdkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE3Ljk0IDE3Ljk0QTEwLjA3IDEwLjA3IDAgMCAxIDEyIDIwYy03IDAtMTEtOC0xMS04YTE4LjQ1IDE4LjQ1IDAgMCAxIDUuMDYtNS45NE05LjkgNC4yNEE5LjEyIDkuMTIgMCAwIDEgMTIgNGM3IDAgMTEgOCAxMSA4YTE4LjUgMTguNSAwIDAgMS0yLjE2IDMuMTltLTYuNzItMS4wN2EzIDMgMCAxIDEtNC4yNC00LjI0Ii8+PGxpbmUgeDE9IjEiIHkxPSIxIiB4Mj0iMjMiIHkyPSIyMyIvPjwvc3ZnPg==");
    }
    .password-eye-icon:not(.visible) {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNmM3NTdkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEgMTJzNC04IDExLTggMTEgOCAxMSA4LTQgOC0xMSA4LTExLTgtMTEtOHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PC9zdmc+");
    }
    .dark .password-eye-icon.visible,
    [data-bs-theme="dark"] .password-eye-icon.visible {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNSkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTcuOTQgMTcuOTRBMTAuMDcgMTAuMDcgMCAwIDEgMTIgMjBjLTcgMC0xMS04LTExLThhMTguNDUgMTguNDUgMCAwIDEgNS4wNi01Ljk0TTkuOSA0LjI0QTkuMTIgOS4xMiAwIDAgMSAxMiA0YzcgMCAxMSA4IDExIDhhMTguNSAxOC41IDAgMCAxLTIuMTYgMy4xOW0tNi43Mi0xLjA3YTMgMyAwIDEgMS00LjI0LTQuMjQiLz48bGluZSB4MT0iMSIgeTE9IjEiIHgyPSIyMyIgeTI9IjIzIi8+PC9zdmc+");
    }
    .dark .password-eye-icon:not(.visible),
    [data-bs-theme="dark"] .password-eye-icon:not(.visible) {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNSkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMSAxMnM0LTggMTEtOCAxMSA4IDExIDgtNCA4LTExIDgtMTEtOC0xMS04eiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz48L3N2Zz4=");
    }
    /* Dark mode checklist */
    .bg-dark-checklist {
      background-color: rgba(255,255,255,0.05) !important;
    }
    .dark .checklist-title,
    [data-bs-theme="dark"] .checklist-title {
      color: #ffffff !important;
    }
    .checklist-title {
      color: #c12d2dff !important;
    }
    .dark .checklist-label:not(.text-success),
    [data-bs-theme="dark"] .checklist-label:not(.text-success) {
      color: #ffffff !important;
    }
    .checklist-label:not(.text-success) {
      color: #6c757d;
    }
    /* Readonly input visual cue */
    input[readonly] {
      cursor: not-allowed;
      background-color: var(--phoenix-gray-100) !important;
      opacity: 0.75;
    }
  `]
})
export class UsuariosComponent implements OnInit, OnDestroy {
  Math = Math; 
  usuarios: UsuarioApp[] = [];
  roles: RolDisponible[] = [];
  showModal = false;
  modoEdicion = false;
  editUserId: number | null = null;
  userForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  buscandoWS = false;
  datosCargadosWS = false;
  showPassMain = false;
  showPassConfirm = false;
  
  passwordRules: PasswordRulesState = {
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasNoSpaces: false,
    isValid: false
  };
  
  // Estado Reactivo Unificado (Single Source of Truth)
  private usuariosSubject = new BehaviorSubject<UsuarioApp[]>([]);
  private filtroSubject = new BehaviorSubject<'activos' | 'inactivos'>('activos');
  private paginaSubject = new BehaviorSubject<number>(1);
  readonly itemsPorPagina = 10;
  
  viewData$: Observable<{
    paginados: UsuarioApp[];
    countActivos: number;
    countInactivos: number;
    totalPaginas: number;
    filtradosCount: number;
  }>;

  private routeSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private svc: UsuariosService,
    private auth: AuthService,
    private swal: SwalService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Inicializar formulario vacío para evitar errores de template antes de abrir modal
    this.userForm = this.fb.group({});

    // Pipeline Reactivo Maestro
    this.viewData$ = combineLatest([
      this.usuariosSubject,
      this.filtroSubject,
      this.paginaSubject
    ]).pipe(
      map(([usuarios, filtro, pagina]) => {
        const countActivos = usuarios.filter(u => u.is_active).length;
        const countInactivos = usuarios.filter(u => !u.is_active).length;

        const filtrados = usuarios.filter(u => 
          filtro === 'activos' ? u.is_active : !u.is_active
        );

        const totalPaginas = Math.ceil(filtrados.length / this.itemsPorPagina);
        const inicio = (pagina - 1) * this.itemsPorPagina;
        
        return {
          paginados: filtrados.slice(inicio, inicio + this.itemsPorPagina),
          countActivos,
          countInactivos,
          totalPaginas,
          filtradosCount: filtrados.length
        };
      })
    );
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.svc.getRolesDisponibles().subscribe(r => {
      this.roles = r;
    });

    // Sincronizar filtro con la ruta
    this.routeSub = this.route.url.subscribe(() => {
      const path = this.router.url;
      if (path.includes('inactivos')) {
        this.filtroSubject.next('inactivos');
      } else {
        this.filtroSubject.next('activos');
      }
      this.paginaSubject.next(1);
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  isDarkModeActive(): boolean {
    return document.documentElement.classList.contains('dark') ||
           localStorage.getItem('phoenixTheme') === 'dark';
  }

  cargarUsuarios(): void {
    this.isLoading = true;
    this.svc.getUsuarios().subscribe({
      next: u => {
        // Ordenar: ADMINISTRADOR (0), ENCARGADO (1), FARMACEUTICO (2), PROVEEDURIA (3), OTRO (4)
        const priority: any = { 'ADMINISTRADOR': 0, 'DIRECTOR_SERVICIO_MEDICO': 1, 'ENCARGADO': 2, 'FARMACEUTICO': 3, 'PROVEEDURIA': 4 };
        const sorted = u.sort((a, b) => {
          const pA = priority[a.rol_nombre] ?? 99;
          const pB = priority[b.rol_nombre] ?? 99;
          return pA - pB;
        });
        this.usuariosSubject.next([...sorted]); // Emitir copia para asegurar detección
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.swal.error('Error', 'No se pudieron cargar los usuarios.');
      }
    });
  }

  trackByUsuario(index: number, u: UsuarioApp): number {
    return u.id;
  }

  // Lógica de Jerarquía para UI
  canToggle(u: UsuarioApp): boolean {
    const me = this.auth.getCurrentUser();
    if (!me) return false;

    // NADIE desactiva a un Admin (incluyéndose a sí mismo)
    if (u.rol_nombre === 'ADMINISTRADOR') return false;
    if (u.id === me.id) return false;

    // Si soy ADMIN o DIRECTOR_SERVICIO_MEDICO, puedo desactivar a cualquiera (excepto admins, filtrado arriba)
    if (this.auth.hasRole('ADMINISTRADOR') || this.auth.hasRole('DIRECTOR_SERVICIO_MEDICO')) return true;

    // Si soy ENCARGADO, solo puedo desactivar FARMACEUTAS y PROVEEDURIA
    if (this.auth.hasRole('ENCARGADO')) {
      return u.rol_nombre === 'FARMACEUTICO' || u.rol_nombre === 'PROVEEDURIA';
    }

    return false;
  }

  canEdit(u: UsuarioApp): boolean {
    const me = this.auth.getCurrentUser();
    if (!me) return false;

    // Yo siempre puedo editar mi propio perfil
    if (u.id === me.id) return true;

    // Si soy ADMIN o DIRECTOR_SERVICIO_MEDICO, puedo editar a cualquiera menos a un admin
    if (this.auth.hasRole('ADMINISTRADOR') || this.auth.hasRole('DIRECTOR_SERVICIO_MEDICO')) {
      return u.rol_nombre !== 'ADMINISTRADOR';
    }

    // Si soy ENCARGADO, solo puedo editar FARMACEUTAS y PROVEEDURIA
    if (this.auth.hasRole('ENCARGADO')) {
      return u.rol_nombre === 'FARMACEUTICO' || u.rol_nombre === 'PROVEEDURIA';
    }

    return false;
  }

  setFiltro(estado: 'activos' | 'inactivos'): void {
    const targetPath = estado === 'activos' ? '/usuarios/activos' : '/usuarios/inactivos';
    this.router.navigate([targetPath]);
  }

  cambiarPagina(p: number): void {
    this.paginaSubject.next(p);
  }

  // Getters para compatibilidad
  get filtroEstado() { return this.filtroSubject.value; }
  get paginaActual() { return this.paginaSubject.value; }

  setupPasswordSubscription(): void {
    this.passwordRules = {
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasNoSpaces: false,
      isValid: false
    };
    
    this.userForm.get('password')?.valueChanges.subscribe(val => {
      this.passwordRules = evaluatePassword(val);
      this.cdr.detectChanges();
    });
  }

  abrirModal(): void {
    this.modoEdicion = false;
    this.editUserId = null;
    this.showPassMain = false;
    this.showPassConfirm = false;
    this.datosCargadosWS = false;
    this.userForm = this.fb.group({
      cedula: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      id_rol: ['', Validators.required],
      password: ['', [Validators.required, passwordStrengthValidator()]],
      password_confirm: ['', Validators.required],
    });
    this.setupPasswordSubscription();
    this.showModal = true;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  editarUsuario(u: UsuarioApp): void {
    this.modoEdicion = true;
    this.editUserId = u.id;
    this.showPassMain = false;
    this.datosCargadosWS = false;
    this.userForm = this.fb.group({
      nombres: [u.first_name, Validators.required],
      apellidos: [u.last_name, Validators.required],
      id_rol: [u.id_rol, Validators.required],
      password: ['', passwordStrengthValidator()],
    });
    this.setupPasswordSubscription();
    this.showModal = true;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void { 
    this.showModal = false; 
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  limpiarForm(): void {
    if (this.modoEdicion) return;
    this.datosCargadosWS = false;
    this.userForm.patchValue({
      cedula: '',
      nombres: '',
      apellidos: ''
    });
  }

  buscarBienestar(): void {
    const cedula = this.userForm.get('cedula')?.value;
    if (!cedula || this.buscandoWS) return;

    setTimeout(() => {
      this.buscandoWS = true;
      this.swal.loading('Verificando en Bienestar...', 'Sincronizando con el servidor institucional...');
    });

    this.svc.buscarEnBienestar(cedula).pipe(
      delay(2000),
      finalize(() => this.buscandoWS = false)
    ).subscribe({
      next: (res: any) => {
        this.swal.close();
        if (res.nombres_titular) {
          this.userForm.patchValue({ 
            nombres: res.nombres_titular?.toUpperCase(), 
            apellidos: res.apellidos_titular?.toUpperCase() 
          });
          this.datosCargadosWS = true;
          this.swal.success('Vinculación Exitosa', 'Se han recuperado los datos del titular de Bienestar Social.');
        } else {
          this.swal.warning('Titular No Encontrado', 'La cédula no existe en la base de datos de Bienestar Social.');
        }
      },
      error: (err) => { 
        console.error('Error Bienestar:', err);
        this.swal.close();
        this.swal.error('Falla de Conexión', 'No se pudo conectar con el servicio de Bienestar.');
      }
    });
  }

  guardar(): void {
    if (this.userForm.invalid || this.isSubmitting) return;

    const v = this.userForm.value;
    
    // Validar si la cédula ya existe al crear
    if (!this.modoEdicion) {
      const cedulaString = String(v.cedula).trim();
      const existingUser = this.usuariosSubject.value.find(u => String(u.username) === cedulaString);
      
      if (existingUser) {
        if (!existingUser.is_active) {
          this.swal.warning('Usuario Inactivo', `El usuario con cédula ${v.cedula} ya existe pero está inactivo. Debe dirigirse a la pestaña "Inactivos" y reactivar su cuenta.`);
        } else {
          this.swal.warning('Usuario Existente', `El usuario con cédula ${v.cedula} ya se encuentra registrado y activo en el sistema.`);
        }
        return;
      }
      
      if (v.password !== v.password_confirm) {
        this.swal.error('Error', 'Las contraseñas no coinciden.');
        return;
      }
    }

    setTimeout(() => {
      this.isSubmitting = true;
      this.swal.loading(this.modoEdicion ? 'Actualizando...' : 'Creando...');
    });

    const obs = this.modoEdicion
      ? this.svc.editarUsuario(this.editUserId!, { nombres: v.nombres, apellidos: v.apellidos, id_rol: v.id_rol, password: v.password })
      : this.svc.crearUsuario(v);

    obs.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.swal.success('¡Listo!', this.modoEdicion ? 'Usuario actualizado' : 'Usuario creado exitosamente.');
        this.cerrarModal();
        this.cargarUsuarios(); // Refrescar lista
      },
      error: (err) => {
        console.error('Error Guardar:', err);
        let errorMsg = 'No se pudo procesar la solicitud.';
        if (err.error) {
          if (typeof err.error === 'string') errorMsg = err.error;
          else if (err.error.detail) errorMsg = err.error.detail;
          else if (typeof err.error === 'object') {
            // Extraer mensajes de validación (ej: "username: Ya existe...")
            errorMsg = Object.entries(err.error)
              .map(([key, value]) => `${key === 'username' ? 'Cédula' : key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('\n');
          }
        }
        this.swal.error('No se pudo guardar', errorMsg);
      }
    });
  }

  toggleEstado(u: UsuarioApp): void {
    const accion = u.is_active ? 'desactivar' : 'activar';
    this.swal.confirm('¿Cambiar estado?', `¿Estás seguro de que deseas ${accion} al usuario ${u.first_name}?`).then(res => {
      if (res.isConfirmed) {
        this.swal.loading('Procesando...');
        this.svc.toggleEstado(u.id).subscribe({
          next: (res) => {
            this.swal.success('¡Estado actualizado!', `El usuario ha sido ${res.is_active ? 'activado' : 'desactivado'}.`);
            this.cargarUsuarios(); // Refrescar para ver el cambio en la tabla
          },
          error: (err) => {
            this.swal.error('Error', err.error?.detail || 'No tienes permiso para realizar esta acción.');
          }
        });
      }
    });
  }
}
