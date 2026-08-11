import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SwalService } from '../../../../core/services/swal.service';
import { timeout, finalize } from 'rxjs/operators';
import { SoloNumerosDirective } from '../../../../shared/directives/solo-numeros.directive';

@Component({
  selector: 'app-login',
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

          <!-- Columna Derecha: Tarjeta de Formulario de Login -->
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

              <div class="text-center mb-5">
                <div class="d-flex flex-center mb-4">
                  <!-- Logo DEM de vuelta -->
                  <img [src]="isDarkMode ? 'assets/img/dem.png' : 'assets/img/dem-2.png'" alt="Logo DEM" width="220" />
                </div>
                <h2 class="fw-bolder fs-2" [ngClass]="isDarkMode ? 'text-white' : 'text-1000'">Iniciar Sesión</h2>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label fs--1 fw-bolder text-uppercase" [ngClass]="isDarkMode ? 'text-200' : 'text-800'" style="letter-spacing: 0.8px">Cédula de Identidad</label>
                  <div class="form-icon-container">
                    <input 
                      class="form-control form-icon-input" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white placeholder-400' : 'bg-light border-300'"
                      formControlName="username" 
                      type="text" 
                      placeholder="Ingrese su cédula"
                      appSoloNumeros
                      maxlength="8"
                    />
                    <span class="fas fa-id-card fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
                  </div>
                </div>
                
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="form-label fs--1 fw-bolder text-uppercase mb-0" [ngClass]="isDarkMode ? 'text-200' : 'text-800'" style="letter-spacing: 0.8px">Contraseña</label>
                    <a routerLink="/auth/forgot-password" class="fs--2 fw-bold text-primary text-decoration-none border-bottom border-primary">Olvidé mi contraseña</a>
                  </div>
                  <div class="form-icon-container position-relative">
                    <input 
                      class="form-control form-icon-input pe-5" 
                      [ngClass]="isDarkMode ? 'bg-soft-dark border-700 text-white placeholder-400' : 'bg-light border-300'"
                      formControlName="password" 
                      [type]="showPassword ? 'text' : 'password'" 
                      placeholder="••••••••"
                    />
                    <span class="fas fa-key fs--2 form-icon" [ngClass]="isDarkMode ? 'text-white' : 'text-900'"></span>
                    <button 
                      type="button" 
                      class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none" 
                      (click)="showPassword = !showPassword"
                      [ngClass]="isDarkMode ? 'text-white-50' : 'text-secondary'"
                      style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                    >
                      <span class="password-eye-icon" [class.visible]="showPassword"></span>
                    </button>
                  </div>
                </div>

                <div class="custom-alert-danger d-flex align-items-center p-3 mb-3 animate-fade-in" role="alert" *ngIf="errorMessage">
                  <span class="fas fa-exclamation-circle me-2 fs-0 text-danger-custom"></span>
                  <div class="fs--2 fw-bold text-danger-custom">{{ errorMessage }}</div>
                </div>

                <div class="form-check mb-4">
                  <input class="form-check-input" id="remember" type="checkbox" formControlName="remember" />
                  <label class="form-check-label fs--2 fw-bold" [ngClass]="isDarkMode ? 'text-200' : 'text-700'" for="remember">Recordar credenciales</label>
                </div>
                
                <button 
                  class="btn btn-primary w-100 py-2 fs-0 fw-bolder shadow-sm" 
                  type="submit"
                  [disabled]="loginForm.invalid || isLoading"
                >
                  <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="isLoading"></span>
                  {{ isLoading ? 'INGRESANDO...' : 'ENTRAR AL SISTEMA' }}
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
    .placeholder-400::placeholder { color: #858ead !important; opacity: 0.6; }
    
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
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>");
    }
    .password-eye-icon:not(.visible) {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>");
    }
    .dark .password-eye-icon.visible {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>");
    }
    .dark .password-eye-icon:not(.visible) {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>");
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
      transition: transform 0.3s ease, background-color 0.3s ease;
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

    .custom-alert-danger {
      background-color: rgba(220, 53, 69, 0.08) !important;
      border: 1.5px solid #dc3545 !important;
      border-radius: 0.75rem;
      color: #dc3545 !important;
      animation: fadeIn 0.25s ease-out;
    }
    .text-danger-custom {
      color: #e63746 !important;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
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
    .bg-dark-card h2, 
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

    @media (min-width: 992px) {
      .login-floating-card:hover {
        transform: translateY(-5px);
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  isDarkMode = false;
  showPassword = false;
  currentYear = new Date().getFullYear();

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('phoenixTheme') === 'dark';
    this.updateTheme();

    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
      this.loginForm.patchValue({
        username: remembered,
        remember: true
      });
    }

    // Limpiar mensaje de error cuando cambian los inputs
    this.loginForm.valueChanges.subscribe(() => {
      if (this.errorMessage) {
        this.errorMessage = '';
        this.cdr.detectChanges();
      }
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

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = '';

    const { username, password, remember } = this.loginForm.value;
    const originalPassword = password;

    if (!remember) {
      // Limpiar inmediatamente el DOM y el formulario para que el navegador no capture la contraseña
      const passwordEl = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (passwordEl) {
        passwordEl.value = '';
      }
      this.loginForm.patchValue({ password: '' }, { emitEvent: false });
    }

    this.authService.login(username, originalPassword)
    .pipe(
      timeout(12000),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (res) => {
        if (remember) {
          localStorage.setItem('rememberedUsername', username);
          const PasswordCred = (window as any)['PasswordCredential'];
          if (PasswordCred && navigator.credentials) {
            try {
              const cred = new PasswordCred({
                id: username,
                password: originalPassword,
                name: username
              });
              navigator.credentials.store(cred).catch(err => {
                console.warn('Error storing credentials:', err);
              });
            } catch (e) {
              console.warn('PasswordCredential constructor failed:', e);
            }
          }
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        if (res.code === 'PASSWORD_EXPIRED') {
          this.swal.warning('Contraseña Expirada', 'Debe actualizar su contraseña periódica.');
          this.router.navigate(['/auth/change-password']);
        } else {
          // Si es la primera vez (no tiene correo configurado) y no se ha saltado el tutorial
          const hasEmail = res.user?.email && res.user.email.trim().length > 0;
          const isTourDismissed = sessionStorage.getItem('sifarmaOnboardingTourDismissed') === 'true';
          
          let destination: string;
          if (!hasEmail && !isTourDismissed) {
            destination = '/perfil';
          } else {
            const rol = res.user?.rol?.toUpperCase();
            destination = rol === 'AUDITOR' ? '/estadisticas' : '/inicio';
          }
          this.router.navigate([destination]);
        }
      },
      error: (err) => {
        // Si falló el inicio de sesión y no recordamos credenciales, restauramos la contraseña en el form y DOM
        if (!remember) {
          this.loginForm.patchValue({ password: originalPassword }, { emitEvent: false });
          const passwordEl = document.querySelector('input[type="password"]') as HTMLInputElement;
          if (passwordEl) {
            passwordEl.value = originalPassword;
          }
        }

        if (err.name === 'TimeoutError') {
          this.errorMessage = 'Sin respuesta del servidor.';
        } else if (err.status === 401) {
          this.errorMessage = 'La cédula o el correo son incorrectos';
        } else {
          this.errorMessage = err.error?.detail || 'Error de conexión.';
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
