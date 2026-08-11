import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SwalService } from '../../../../core/services/swal.service';
import { finalize, timeout } from 'rxjs/operators';
import { SoloNumerosDirective } from '../../../../shared/directives/solo-numeros.directive';
import { evaluatePassword, PasswordRulesState, passwordStrengthValidator } from '../../../../shared/validators/password.validator';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SoloNumerosDirective],
  template: `
    <main class="main min-vh-100 position-relative" [class.bg-login-dark]="isDarkMode" [class.bg-login-light]="!isDarkMode">
      
      <div class="container-fluid g-0 min-vh-100">
        <div class="row g-0 min-vh-100">
          
          <!-- Columna Izquierda: Imagen de Fondo con Logo Dinámico y Texto Informativo -->
          <div class="col-lg-7 col-xl-8 d-none d-lg-flex flex-column justify-content-between p-5 position-relative" 
               style="background-image: url(assets/img/fondo.png); background-size: cover; background-position: center; min-height: 100vh;">
            
            <!-- Capas de contraste sobre la imagen -->
            <div class="position-absolute top-0 start-0 w-100 h-100" [ngStyle]="{'background': isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)'}" style="z-index: 1;"></div>
            <div class="position-absolute top-0 start-0 w-100 h-50" [ngStyle]="{'background': isDarkMode ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)'}" style="z-index: 1;"></div>
            
            <!-- Content Top -->
            <div class="w-100 position-relative" style="z-index: 2;">
              <!-- 1. Texto Informativo en la parte superior, perfectamente centrado (en 1 o 2 líneas) -->
              <div class="w-100 text-center mt-2">
                <p class="fs-1 fw-bold mb-0" 
                   [style.color]="isDarkMode ? '#ffffff' : '#002e6d'"
                   [style.text-shadow]="isDarkMode ? '1px 1px 8px rgba(0,0,0,0.5)' : '0px 0px 15px rgba(255,255,255,0.9), 1px 1px 3px rgba(255,255,255,1)'"
                   style="line-height: 1.3; font-size: 1.15rem !important;">
                  Control centralizado de medicamentos y dotaciones para el bienestar del servidor judicial.
                </p>
              </div>
              
              <!-- 2. Logo SIFARMA posicionado a la altura de los rostros, alineado a la derecha -->
              <div class="align-self-start" style="margin-top: 3.2rem; padding-left: 60%;">
                <!-- Logo SIFARMA dinámico basado en el tema -->
                <img [src]="isDarkMode ? 'assets/img/logo sifarma - version oscuro.png' : 'assets/img/logo sifarma - version claro.png'" 
                     alt="Logo SIFARMA" 
                     class="sifarma-brand-logo" 
                     [ngStyle]="{'filter': isDarkMode ? 'none' : 'drop-shadow(0px 0px 10px rgba(255,255,255,0.8))'}" />
              </div>
            </div>

            <!-- Content Bottom (Watermark Footer) -->
            <div class="w-100 text-center position-relative mt-auto mb-2" style="z-index: 2;">
              <p class="mb-0 fw-bold" 
                 [style.color]="isDarkMode ? '#ffffff' : '#002e6d'"
                 [style.text-shadow]="isDarkMode ? '1px 1px 4px rgba(0,0,0,0.4)' : '0px 0px 10px rgba(255,255,255,0.9), 1px 1px 2px rgba(255,255,255,1)'"
                 style="font-size: 0.65rem; line-height: 1.4; letter-spacing: 0.3px;">
                 Desarrollado por la "Oficina de Desarrollo Informático de la Dirección Ejecutiva de la Magistratura del Tribunal Supremo de Justicia." | 2026 &copy;<a href="http://intranet2.dem.int" (click)="irAIntranet($event)" class="text-decoration-none fw-bold" [style.color]="isDarkMode ? '#ffffff' : '#002e6d'">Intranet</a>
              </p>
            </div>
          </div>

          <!-- Columna Derecha: Tarjeta de Formulario de Recuperación -->
          <div class="col-12 col-lg-5 col-xl-4 d-flex flex-column justify-content-center align-items-center p-3 p-md-4 min-vh-100 position-relative" style="z-index: 2;">
            
            <div class="login-floating-card w-100 shadow-xl p-4 p-md-5 p-lg-5 border border-200"
                 [ngClass]="isDarkMode ? 'bg-dark-card border-dark-card' : 'bg-white'">
              
              <!-- Control de Tema -->
              <div class="position-absolute top-0 end-0 p-3">
                <div class="theme-control-toggle">
                  <input class="form-check-input ms-0 theme-control-toggle-input" type="checkbox" [checked]="isDarkMode" (change)="toggleTheme()" id="themeControlToggle" />
                  <label class="mb-0 theme-control-toggle-label theme-control-toggle-light" for="themeControlToggle" title="Modo Oscuro">
                    <span class="fas fa-moon"></span>
                  </label>
                  <label class="mb-0 theme-control-toggle-label theme-control-toggle-dark" for="themeControlToggle" title="Modo Claro">
                    <span class="fas fa-sun"></span>
                  </label>
                </div>
              </div>
              
              <div class="mb-5">
                <a routerLink="/login" class="btn btn-link p-0 mb-3 fs--1 fw-bolder text-primary">
                  <span class="fas fa-arrow-left me-1"></span>Volver al Login
                </a>
                <div class="d-flex flex-center mb-4">
                  <!-- Logo DEM de vuelta para consistencia visual -->
                  <img [src]="isDarkMode ? 'assets/img/dem.png' : 'assets/img/dem-2.png'" alt="Logo DEM" width="220" />
                </div>
                <h3 class="fw-bolder fs-2 text-center" [ngClass]="isDarkMode ? 'text-white' : 'text-1000'" *ngIf="step === 1">
                  Recuperar Contraseña
                </h3>
                <p [ngClass]="isDarkMode ? 'text-400' : 'text-700'" class="fs--1 text-center mb-0">
                  {{ step === 1 ? 'Valide sus datos registrados en el sistema.' : 'Establezca su nueva contraseña de acceso.' }}
                </p>
              </div>

              <!-- Paso 1: Verificación -->
              <form [formGroup]="verifyForm" (ngSubmit)="onVerify()" *ngIf="step === 1">
                <div class="mb-3">
                  <label class="form-label fs--1 fw-bolder text-uppercase" [ngClass]="isDarkMode ? 'text-200' : 'text-800'">Cédula de Identidad</label>
                  <div class="form-icon-container">
                    <input 
                      class="form-control form-icon-input" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white' : 'bg-light border-300'"
                      formControlName="cedula" 
                      type="text" 
                      placeholder="Ej: 12345678"
                      appSoloNumeros
                      maxlength="8"
                    />
                    <span class="fas fa-id-card fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
                  </div>
                </div>
                
                <div class="mb-4">
                  <label class="form-label fs--1 fw-bolder text-uppercase" [ngClass]="isDarkMode ? 'text-200' : 'text-800'">Correo Registrado</label>
                  <div class="form-icon-container">
                    <input 
                      class="form-control form-icon-input" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white' : 'bg-light border-300'"
                      formControlName="email" 
                      type="email" 
                      placeholder="usuario@dominio.com"
                    />
                    <span class="fas fa-envelope fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
                  </div>
                  <div class="text-danger fs--2 mt-1" *ngIf="verifyForm.get('email')?.touched && verifyForm.get('email')?.errors?.['pattern']">
                    El formato del correo es inválido (ej: usuario@dominio.com).
                  </div>
                </div>

                <button 
                  class="btn btn-primary w-100 py-2 fs-0 fw-bolder" 
                  type="submit" 
                  [disabled]="verifyForm.invalid || isLoading"
                >
                  <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="isLoading"></span>
                  {{ isLoading ? 'VALIDANDO...' : 'VERIFICAR IDENTIDAD' }}
                </button>
              </form>

              <!-- Paso 2: Reset -->
              <form [formGroup]="resetForm" (ngSubmit)="onReset()" *ngIf="step === 2">
                <div class="mb-3">
                  <label class="form-label fs--1 fw-bolder text-uppercase" [ngClass]="isDarkMode ? 'text-200' : 'text-800'">Nueva Contraseña</label>
                  <div class="form-icon-container position-relative">
                    <input 
                      class="form-control form-icon-input pe-5" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white' : 'bg-light border-300'"
                      formControlName="new_password" 
                      [type]="showNewPassword ? 'text' : 'password'" 
                      placeholder="••••••••"
                    />
                    <span class="fas fa-key fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
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
                  <div class="password-rules-checklist mt-2 mb-1 p-3 rounded-3" 
                       [ngClass]="isDarkMode ? 'bg-soft-dark border border-700' : 'bg-light border border-300'" 
                       style="font-size: 0.75rem; transition: opacity 0.3s ease;"
                       [style.opacity]="resetForm.get('new_password')?.value ? '1' : '0.4'"
                       [style.pointer-events]="resetForm.get('new_password')?.value ? 'auto' : 'none'">
                    <p class="fw-bold mb-2" [style.color]="isDarkMode ? '#ffffff' : '#002e6d'">La contraseña debe cumplir con:</p>
                    
                    <div class="row g-2">
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasMinLength" [class.invalid]="!passwordRules.hasMinLength"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasMinLength"
                              [class.fw-semibold]="passwordRules.hasMinLength">Mínimo 8 caracteres</span>
                      </div>
                      
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasUppercase" [class.invalid]="!passwordRules.hasUppercase"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasUppercase"
                              [class.fw-semibold]="passwordRules.hasUppercase">Una mayúscula</span>
                      </div>
                      
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasLowercase" [class.invalid]="!passwordRules.hasLowercase"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasLowercase"
                              [class.fw-semibold]="passwordRules.hasLowercase">Una minúscula</span>
                      </div>
                      
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasNumber" [class.invalid]="!passwordRules.hasNumber"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasNumber"
                              [class.fw-semibold]="passwordRules.hasNumber">Un número</span>
                      </div>
                      
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasSpecialChar" [class.invalid]="!passwordRules.hasSpecialChar"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasSpecialChar"
                              [class.fw-semibold]="passwordRules.hasSpecialChar">Carácter especial</span>
                      </div>
                      
                      <div class="col-6 d-flex align-items-center">
                        <span class="password-check-icon" [class.valid]="passwordRules.hasNoSpaces" [class.invalid]="!passwordRules.hasNoSpaces"></span>
                        <span class="checklist-label" [class.text-success]="passwordRules.hasNoSpaces"
                              [class.fw-semibold]="passwordRules.hasNoSpaces">Sin espacios</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="mb-4">
                  <label class="form-label fs--1 fw-bolder text-uppercase" [ngClass]="isDarkMode ? 'text-200' : 'text-800'">Confirmar Contraseña</label>
                  <div class="form-icon-container position-relative">
                    <input 
                      class="form-control form-icon-input pe-5" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white' : 'bg-light border-300'"
                      formControlName="confirm_password" 
                      [type]="showConfirmPassword ? 'text' : 'password'" 
                      placeholder="••••••••"
                    />
                    <span class="fas fa-check-double fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
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
                  <div class="text-danger fs--2 mt-1" *ngIf="resetForm.errors?.['mismatch'] && resetForm.get('confirm_password')?.touched">
                    Las contraseñas no coinciden.
                  </div>
                </div>

                <button 
                  class="btn btn-success w-100 py-2 fs-0 fw-bolder" 
                  type="submit" 
                  [disabled]="resetForm.invalid || isLoading"
                >
                  <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="isLoading"></span>
                  CONFIRMAR
                </button>
              </form>

            </div>

          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .shadow-xl { box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.6) !important; }
    .bg-dark-card { background-color: #12151e !important; }
    .bg-soft-dark { background-color: #1a1e26 !important; }
    .border-dark-card { border-color: #2c3245 !important; }
    
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

    .dark .form-icon-input,
    [data-bs-theme="dark"] .form-icon-input {
      color: #ffffff !important;
      background-color: #1a1e26 !important;
    }
    .dark .form-icon-input::placeholder,
    [data-bs-theme="dark"] .form-icon-input::placeholder {
      color: #9da3ae !important;
      opacity: 0.8;
    }
    
    /* Dark mode checklist labels */
    .dark .checklist-label:not(.text-success),
    [data-bs-theme="dark"] .checklist-label:not(.text-success) {
      color: #ffffff !important;
    }
    .checklist-label:not(.text-success) {
      color: #6c757d;
    }
    
    .sifarma-brand-logo {
      max-width: 320px;
      height: auto;
      transition: all 0.3s ease;
    }

    .login-floating-card {
      border-radius: 1.5rem;
      position: relative;
      max-width: 480px;
      margin: 0 auto;
    }
    
    .form-icon-container { position: relative; }
    .form-icon-input { padding-left: 2.8rem; height: 3.5rem; font-size: 1rem; }
    .form-icon {
      position: absolute;
      top: 50%;
      left: 1.2rem;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.8 !important;
    }

    .text-success-custom {
      color: #25a174 !important;
      font-weight: 500;
    }
    .text-muted-custom {
      color: #748194 !important;
    }

    /* Ajuste de fondo del login consistente con el tema seleccionado */
    .bg-login-dark { background-color: #0f111a !important; } /* Fondo oscuro para modo oscuro */
    .bg-login-light { background-color: #f5f6f8 !important; } /* Fondo claro para modo claro */

    /* Estilos forzados para la tarjeta oscura (cuando isDarkMode es true) */
    .bg-dark-card {
        background-color: #12151e !important;
        color: #ffffff !important;
    }
    
    .bg-dark-card .form-label, 
    .bg-dark-card h3, 
    .bg-dark-card p,
    .bg-dark-card .form-check-label {
        color: #ffffff !important;
    }

    .bg-dark-card .form-control {
        background-color: #1a1e26 !important;
        color: #ffffff !important;
        border-color: #31374a !important;
    }

    .bg-dark-card .form-control::placeholder {
        color: #858ead !important;
        opacity: 0.6;
    }

    .bg-dark-card .form-icon {
        color: #ffffff !important;
    }

    /* Forzar visibilidad del texto al escribir en modo oscuro */
    .form-control {
        color: inherit;
    }
    main.bg-dark .form-control {
        color: #ffffff !important;
    }
    main.bg-dark .form-control::placeholder {
        color: #9da3ae !important;
        opacity: 0.8;
    }
  `]
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  isDarkMode = false;
  step = 1;
  isLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  verifyForm: FormGroup;
  resetForm: FormGroup;

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
    this.verifyForm = this.fb.group({
      cedula: ['', [Validators.required]],
      email: ['', [
        Validators.required, 
        Validators.email, 
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
    });

    this.resetForm = this.fb.group({
      new_password: ['', [Validators.required, passwordStrengthValidator()]],
      confirm_password: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Verificar isDarkMode leyendo directamente el DOM por si el tema global (theme-control.js) ya configuró auto/dark
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const hasDarkTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const isThemeDark = localStorage.getItem('phoenixTheme') === 'dark';
    
    this.isDarkMode = hasDarkClass || hasDarkTheme || isThemeDark;
    this.updateTheme();

    this.resetForm.get('new_password')?.valueChanges.subscribe(val => {
      this.passwordRules = evaluatePassword(val);
      this.cdr.detectChanges();
    });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('phoenixTheme', this.isDarkMode ? 'dark' : 'light');
    this.updateTheme();
  }

  private updateTheme(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  onVerify(): void {
    if (this.verifyForm.invalid || this.isLoading) return;
    this.isLoading = true;

    const { cedula, email } = this.verifyForm.value;
    this.authService.verifyReset(cedula, email)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.step = 2;
          this.cdr.detectChanges();
          this.swal.success('Identidad Validada', 'Ahora puede asignar su nueva contraseña.');
        },
        error: (err) => {
          this.cdr.detectChanges();
          const detail = err.name === 'TimeoutError' 
            ? 'La conexión está tardando demasiado. Por favor, reintente.' 
            : (err.error?.detail || 'No se pudo validar la identidad.');
          
          this.swal.error('Validación', detail);
          if (err.name === 'TimeoutError') {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  onReset(): void {
    if (this.resetForm.invalid || this.isLoading) return;
    this.isLoading = true;

    const payload = {
      cedula: this.verifyForm.value.cedula,
      email: this.verifyForm.value.email,
      new_password: this.resetForm.value.new_password,
      confirm_password: this.resetForm.value.confirm_password
    };

    this.authService.confirmReset(payload)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.swal.success('Éxito', 'Su contraseña ha sido restablecida. Ya puede iniciar sesión.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.cdr.detectChanges();
          const detail = err.name === 'TimeoutError'
            ? 'Tiempo de espera agotado al confirmar. Reintente.'
            : (err.error?.detail || 'Fallo el restablecimiento.');
          
          this.swal.error('Error', detail);
          if (err.name === 'TimeoutError') {
             this.router.navigate(['/login']);
          }
        }
      });
  }

  irAIntranet(event: Event): void {
    event.preventDefault();
    if (this.authService.isAuthenticated()) {
      this.authService.logout();
    }
    window.location.href = 'http://intranet2.dem.int';
  }
}

