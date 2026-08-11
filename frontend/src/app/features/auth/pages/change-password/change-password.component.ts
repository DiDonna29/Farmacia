import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SwalService } from '../../../../core/services/swal.service';
import { finalize } from 'rxjs/operators';
import { evaluatePassword, PasswordRulesState, passwordStrengthValidator } from '../../../../shared/validators/password.validator';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="main vh-100">
      <div class="container-fluid h-100 g-0">
        <div class="row h-100 g-0">
          
          <div class="col-12 col-lg-5 col-xl-4 d-flex flex-column justify-content-center px-4 px-md-6 px-lg-7 bg-body">
            
            <div class="mb-5">
              <span class="badge badge-phoenix badge-phoenix-warning mb-2 fs--2">SEGURIDAD REQUERIDA</span>
              <h3 class="text-1000">Actualice su Contraseña</h3>
              <p class="text-700">Por políticas de seguridad institucional, su contraseña debe ser renovada cada 90 días.</p>
            </div>

            <form [formGroup]="changeForm" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label class="form-label fs--1 fw-bold">Nueva Contraseña</label>
                <div class="form-icon-container position-relative">
                  <input 
                    class="form-control form-icon-input pe-5" 
                    formControlName="new_password" 
                    [type]="showNewPassword ? 'text' : 'password'" 
                    placeholder="••••••••" 
                  />
                  <span class="fas fa-key text-900 fs--2 form-icon"></span>
                  <button 
                    type="button" 
                    class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none" 
                    (click)="showNewPassword = !showNewPassword"
                    [ngClass]="isDarkMode ? 'text-white-50' : 'text-secondary'"
                    style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                  >
                    <span class="password-eye-icon" [class.visible]="showNewPassword"></span>
                  </button>
                </div>

                <!-- Real-time rules checklist -->
                <div class="password-rules-checklist mt-2 mb-1 p-3 rounded-3 bg-light border border-300" style="font-size: 0.75rem;">
                  <p class="fw-bold mb-2 text-800">La contraseña debe cumplir con:</p>
                  
                  <div class="row g-2">
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasMinLength" [class.invalid]="!passwordRules.hasMinLength"></span>
                      <span [class.text-success]="passwordRules.hasMinLength" [class.text-secondary]="!passwordRules.hasMinLength" [class.fw-semibold]="passwordRules.hasMinLength">Mínimo 8 caracteres</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasUppercase" [class.invalid]="!passwordRules.hasUppercase"></span>
                      <span [class.text-success]="passwordRules.hasUppercase" [class.text-secondary]="!passwordRules.hasUppercase" [class.fw-semibold]="passwordRules.hasUppercase">Una mayúscula</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasLowercase" [class.invalid]="!passwordRules.hasLowercase"></span>
                      <span [class.text-success]="passwordRules.hasLowercase" [class.text-secondary]="!passwordRules.hasLowercase" [class.fw-semibold]="passwordRules.hasLowercase">Una minúscula</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasNumber" [class.invalid]="!passwordRules.hasNumber"></span>
                      <span [class.text-success]="passwordRules.hasNumber" [class.text-secondary]="!passwordRules.hasNumber" [class.fw-semibold]="passwordRules.hasNumber">Un número</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasSpecialChar" [class.invalid]="!passwordRules.hasSpecialChar"></span>
                      <span [class.text-success]="passwordRules.hasSpecialChar" [class.text-secondary]="!passwordRules.hasSpecialChar" [class.fw-semibold]="passwordRules.hasSpecialChar">Carácter especial</span>
                    </div>
                    
                    <div class="col-6 d-flex align-items-center">
                      <span class="password-check-icon" [class.valid]="passwordRules.hasNoSpaces" [class.invalid]="!passwordRules.hasNoSpaces"></span>
                      <span [class.text-success]="passwordRules.hasNoSpaces" [class.text-secondary]="!passwordRules.hasNoSpaces" [class.fw-semibold]="passwordRules.hasNoSpaces">Sin espacios</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-4">
                <label class="form-label fs--1 fw-bold">Confirmar Nueva Contraseña</label>
                <div class="form-icon-container position-relative">
                  <input 
                    class="form-control form-icon-input pe-5" 
                    formControlName="confirm_password" 
                    [type]="showConfirmPassword ? 'text' : 'password'" 
                    placeholder="••••••••" 
                  />
                  <span class="fas fa-check-double text-900 fs--2 form-icon"></span>
                  <button 
                    type="button" 
                    class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none" 
                    (click)="showConfirmPassword = !showConfirmPassword"
                    [ngClass]="isDarkMode ? 'text-white-50' : 'text-secondary'"
                    style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                  >
                    <span class="password-eye-icon" [class.visible]="showConfirmPassword"></span>
                  </button>
                </div>
                <div class="invalid-feedback d-block" *ngIf="changeForm.errors?.['mismatch'] && changeForm.get('confirm_password')?.touched">
                  Las contraseñas no coinciden.
                </div>
              </div>

              <button class="btn btn-warning w-100 py-2 fs-0" type="submit" [disabled]="changeForm.invalid || isLoading">
                <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="isLoading"></span>
                Actualizar y Entrar
              </button>
            </form>

            <div class="text-center mt-5">
              <button class="btn btn-link fs--2 text-700 p-0" (click)="onLogout()">Cancelar y Cerrar Sesión</button>
            </div>
          </div>

          <div class="col-lg-7 col-xl-8 d-none d-lg-block position-relative">
            <div class="bg-holder" style="background-image:url(assets/img/fondo.png); filter: sepia(0.3) brightness(0.7);"></div>
            <div class="position-absolute middle-25 start-0 p-5 text-white">
              <h2 class="text-white fw-bolder">Su seguridad es nuestra prioridad.</h2>
              <p class="fs-0 opacity-75">El cambio periódico de contraseñas previene accesos no autorizados.</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  `,
  styles: [`
    .form-icon-container { position: relative; }
    .form-icon-input { padding-left: 2.5rem; }
    .form-icon {
      position: absolute;
      top: 50%;
      left: 1rem;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.5;
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
  `]
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isDarkMode = false;
  showNewPassword = false;
  showConfirmPassword = false;
  changeForm: FormGroup;

  passwordRules: PasswordRulesState = {
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasNoSpaces: false,
    isValid: false
  };

  constructor() {
    this.changeForm = this.fb.group({
      new_password: ['', [Validators.required, passwordStrengthValidator()]],
      confirm_password: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('phoenixTheme') === 'dark';
    this.changeForm.get('new_password')?.valueChanges.subscribe(val => {
      this.passwordRules = evaluatePassword(val);
      this.cdr.detectChanges();
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.changeForm.invalid || this.isLoading) return;
    this.isLoading = true;

    this.authService.changePassword(this.changeForm.value)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          this.swal.success('¡Listo!', 'Su contraseña ha sido actualizada. Iniciando sesión...');
          this.onLogout();
        },
        error: (err) => this.swal.error('Error', err.error?.detail || 'No se pudo actualizar la contraseña.')
      });
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
