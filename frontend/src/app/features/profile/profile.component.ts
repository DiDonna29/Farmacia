import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SwalService } from '../../core/services/swal.service';
import { finalize } from 'rxjs/operators';
import { driver } from 'driver.js';
import { evaluatePassword, PasswordRulesState, passwordStrengthValidator } from '../../shared/validators/password.validator';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [DatePipe],
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
    <!-- Spinner de carga inicial -->
    <div class="d-flex flex-center py-6" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status"></div>
        <span class="ms-2 fw-bold text-700">Cargando perfil...</span>
    </div>

    <div class="row g-4" *ngIf="!isLoading && profileData">
      
      <!-- Lado Izquierdo: Resumen -->
      <div class="col-12 col-xl-4 anim-slide-up">
        <div class="card h-100 border border-300 shadow-sm">
          <div class="card-body text-center d-flex flex-column justify-content-center p-5">
            <div class="avatar avatar-5xl d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4 fw-bolder fs-5 text-white shadow-lg"
                 style="background: linear-gradient(135deg, #1e3a5f, #2563eb); width: 120px; height: 120px;">
              {{ getInitials() }}
            </div>
            
            <h3 class="mb-1 text-1000">{{ profileData.first_name }} {{ profileData.last_name }}</h3>
            <div class="mb-3">
                <span class="badge badge-phoenix badge-phoenix-info fs-0 px-3">CÉDULA: {{ formatCedula(profileData.username) }}</span>
            </div>
            
            <div class="text-center bg-body-tertiary p-3 rounded-2">
              <div class="d-flex flex-column align-items-center">
                <span class="text-500 fs--2 fw-bold text-uppercase mb-1">Último Acceso al Sistema</span>
                <span class="text-900 fs--1 fw-semibold">
                    <span class="fas fa-clock me-1 text-primary"></span>
                    {{ (profileData.last_login | date:'dd/MM/yyyy, HH:mm') || 'Información no disponible' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Lado Derecho: Edición -->
      <div class="col-12 col-xl-8 anim-slide-up delay-100">
        <div class="row g-4">
            
            <!-- Bloque de Contacto (Inputs Divididos) -->
            <div class="col-12">
                <div class="card border border-300 shadow-sm">
                    <div class="card-header border-bottom border-300 bg-body-tertiary py-3">
                        <h5 class="mb-0">Información de Contacto</h5>
                    </div>
                    <div class="card-body p-4">
                        <form [formGroup]="contactForm" (ngSubmit)="updateContact()">
                            
                            <!-- Correo Electrónico Dividido -->
                            <div class="mb-4" id="tour-email">
                                <label class="form-label fs--1 fw-bold">Correo Electrónico</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" formControlName="email_user" placeholder="nombre.usuario" />
                                    <span class="input-group-text">@</span>
                                    <select class="form-select" formControlName="email_domain" style="max-width: 150px;">
                                        <option value="gmail.com">gmail.com</option>
                                        <option value="hotmail.com">hotmail.com</option>
                                        <option value="outlook.com">outlook.com</option>
                                        <option value="yahoo.com">tsj-dem.gob.ve</option>
                                        <option value="otro">otro...</option>
                                    </select>
                                    <input *ngIf="contactForm.get('email_domain')?.value === 'otro'" 
                                           type="text" class="form-control" formControlName="email_custom" placeholder="midominio.com" />
                                </div>
                            </div>

                            <!-- Teléfono Dividido -->
                            <div class="mb-4" id="tour-phone">
                                <label class="form-label fs--1 fw-bold">Número de Teléfono</label>
                                <div class="input-group">
                                    <select class="form-select" formControlName="phone_prefix" style="max-width: 100px;">
                                        <option value="0412">0412</option>
                                        <option value="0422">0422</option>
                                        <option value="0414">0414</option>
                                        <option value="0424">0424</option>
                                        <option value="0416">0416</option>
                                        <option value="0426">0426</option>
                                    </select>
                                    <input type="text" class="form-control" formControlName="phone_number" 
                                           placeholder="1234567" maxlength="7" (keypress)="onlyNumbers($event)" />
                                </div>
                                <div class="text-danger fs--2 mt-1" *ngIf="contactForm.get('phone_number')?.dirty && contactForm.get('phone_number')?.invalid">
                                    Debe ingresar exactamente 7 dígitos numéricos.
                                </div>
                            </div>

                            <div class="d-flex justify-content-end pt-3 border-top border-200">
                                <button class="btn btn-primary px-5" type="submit" [disabled]="contactForm.invalid || isLoadingContact || isTourActive">
                                    <span class="spinner-border spinner-border-sm me-2" *ngIf="isLoadingContact"></span>
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Bloque de Seguridad -->
            <div class="col-12" id="tour-password">
                <div class="card border border-300 shadow-sm">
                    <div class="card-header border-bottom border-300 bg-body-tertiary py-3">
                        <h5 class="mb-0">Cambiar Contraseña</h5>
                    </div>
                    <div class="card-body p-4">
                        <form [formGroup]="passwordForm" (ngSubmit)="updatePassword()">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label fs--1 fw-bold">Contraseña Actual</label>
                                    <div class="form-icon-container position-relative">
                                        <input 
                                            class="form-control pe-5" 
                                            formControlName="old_password" 
                                            [type]="showOldPassword ? 'text' : 'password'" 
                                            placeholder="••••••••" 
                                        />
                                        <button 
                                            type="button" 
                                            class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none text-secondary" 
                                            (click)="showOldPassword = !showOldPassword"
                                            style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                                        >
                                            <span class="password-eye-icon" [class.visible]="showOldPassword"></span>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fs--1 fw-bold">Nueva Contraseña</label>
                                    <div class="form-icon-container position-relative">
                                        <input 
                                            class="form-control pe-5" 
                                            formControlName="new_password" 
                                            [type]="showNewPassword ? 'text' : 'password'" 
                                            placeholder="••••••••" 
                                        />
                                        <button 
                                            type="button" 
                                            class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none text-secondary" 
                                            (click)="showNewPassword = !showNewPassword"
                                            style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                                        >
                                            <span class="password-eye-icon" [class.visible]="showNewPassword"></span>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fs--1 fw-bold">Verificar Contraseña</label>
                                    <div class="form-icon-container position-relative">
                                        <input 
                                            class="form-control pe-5" 
                                            formControlName="confirm_password" 
                                            [type]="showConfirmPassword ? 'text' : 'password'" 
                                            placeholder="••••••••" 
                                        />
                                        <button 
                                            type="button" 
                                            class="btn border-0 position-absolute end-0 top-50 translate-middle-y pe-3 py-0 shadow-none text-secondary" 
                                            (click)="showConfirmPassword = !showConfirmPassword"
                                            style="z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                                        >
                                            <span class="password-eye-icon" [class.visible]="showConfirmPassword"></span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Real-time rules checklist -->
                                <div class="col-12 mt-2">
                                  <div class="password-rules-checklist p-3 rounded-3 border" 
                                       style="font-size: 0.75rem; transition: opacity 0.3s ease;"
                                       [style.opacity]="passwordForm.get('new_password')?.value ? '1' : '0.4'"
                                       [style.pointer-events]="passwordForm.get('new_password')?.value ? 'auto' : 'none'"
                                       [ngClass]="isDarkModeActive() ? 'bg-dark-checklist border-700' : 'bg-light border-300'">
                                    <p class="fw-bold mb-2 checklist-title">La nueva contraseña debe cumplir con:</p>
                                    
                                    <div class="row g-2">
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasMinLength" [class.invalid]="!passwordRules.hasMinLength"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasMinLength" [class.fw-semibold]="passwordRules.hasMinLength">Mínimo 8 caracteres</span>
                                       </div>
                                       
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasUppercase" [class.invalid]="!passwordRules.hasUppercase"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasUppercase" [class.fw-semibold]="passwordRules.hasUppercase">Una mayúscula</span>
                                       </div>
                                       
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasLowercase" [class.invalid]="!passwordRules.hasLowercase"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasLowercase" [class.fw-semibold]="passwordRules.hasLowercase">Una minúscula</span>
                                       </div>
                                       
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasNumber" [class.invalid]="!passwordRules.hasNumber"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasNumber" [class.fw-semibold]="passwordRules.hasNumber">Un número</span>
                                       </div>
                                       
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasSpecialChar" [class.invalid]="!passwordRules.hasSpecialChar"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasSpecialChar" [class.fw-semibold]="passwordRules.hasSpecialChar">Carácter especial</span>
                                       </div>
                                       
                                       <div class="col-md-4 col-6 d-flex align-items-center">
                                         <span class="password-check-icon" [class.valid]="passwordRules.hasNoSpaces" [class.invalid]="!passwordRules.hasNoSpaces"></span>
                                         <span class="checklist-label" [class.text-success]="passwordRules.hasNoSpaces" [class.fw-semibold]="passwordRules.hasNoSpaces">Sin espacios</span>
                                       </div>
                                    </div>
                                  </div>
                                </div>

                                <div class="col-12 d-flex justify-content-end pt-3">
                                    <button class="btn btn-success" type="submit" [disabled]="passwordForm.invalid || isLoadingPassword || isTourActive">
                                        <span class="spinner-border spinner-border-sm me-2" *ngIf="isLoadingPassword"></span>
                                        Actualizar Contraseña
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

        </div>
      </div>

    </div>
  
    </div>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private swal = inject(SwalService);
  private cdr = inject(ChangeDetectorRef);

  profileData: any = null;
  isLoading = true;
  isLoadingContact = false;
  isLoadingPassword = false;
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  contactForm: FormGroup;
  passwordForm: FormGroup;

  dontShowAgain = false;
  isTourActive = false;

  isDarkModeActive(): boolean {
    return document.documentElement.classList.contains('dark') ||
           localStorage.getItem('phoenixTheme') === 'dark';
  }

  formatCedula(cedula: string | undefined | null): string {
    if (!cedula) return '';
    const numStr = cedula.toString().replace(/\D/g, '');
    return 'V-' + numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  passwordRules: PasswordRulesState = {
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasNoSpaces: false,
    isValid: false
  };

  private tourCheckboxListener = (e: any) => {
    if (e.target && e.target.id === 'tour-dont-show-again') {
      this.dontShowAgain = e.target.checked;
    }
  };

  constructor() {
    this.contactForm = this.fb.group({
      email_user: ['', [Validators.required]],
      email_domain: ['gmail.com', [Validators.required]],
      email_custom: [''],
      phone_prefix: ['0412', [Validators.required]],
      phone_number: ['', [Validators.required, Validators.pattern('^[0-9]{7}$')]]
    });

    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, passwordStrengthValidator()]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadProfile();
    document.addEventListener('change', this.tourCheckboxListener);

    // Suscribirse a cambios de dominio para validaciones
    this.contactForm.get('email_domain')?.valueChanges.subscribe(domain => {
      const customCtrl = this.contactForm.get('email_custom');
      if (domain === 'otro') {
        customCtrl?.setValidators([Validators.required]);
      } else {
        customCtrl?.clearValidators();
      }
      customCtrl?.updateValueAndValidity();
    });

    this.passwordForm.get('new_password')?.valueChanges.subscribe(val => {
      this.passwordRules = evaluatePassword(val);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('change', this.tourCheckboxListener);
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authService.getProfileDetailed()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.profileData = data;
          this.splitData(data);

          // Lógica del Onboarding Tour
          const hasEmail = data.email && data.email.trim().length > 0;
          const isTourDismissed = sessionStorage.getItem('sifarmaOnboardingTourDismissed') === 'true';

          if (!hasEmail && !isTourDismissed) {
            setTimeout(() => {
              this.startOnboardingTour();
            }, 800);
          }
        },
        error: () => this.swal.error('Error', 'No se pudo cargar el perfil.')
      });
  }

  startOnboardingTour(): void {
    this.isTourActive = true;
    this.cdr.detectChanges();

    const driverObj = driver({
      showProgress: true,
      allowClose: false,
      doneBtnText: 'Finalizar',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      steps: [
        {
          element: '#tour-email',
          popover: {
            title: '1. Correo Electrónico',
            description: 'Por favor, registre su correo electrónico para poder recibir notificaciones e informes del sistema. Este es un campo obligatorio para el uso de la aplicación.<br><br><div class="form-check"><input class="form-check-input" type="checkbox" id="tour-dont-show-again" style="cursor:pointer"><label class="form-check-label fs--2 fw-bold text-danger" for="tour-dont-show-again" style="cursor:pointer">No volver a mostrar</label></div>',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-phone',
          popover: {
            title: '2. Número de Teléfono',
            description: 'Defina su número de teléfono celular seleccionando el prefijo y digitando los 7 números correspondientes.<br><br><div class="form-check"><input class="form-check-input" type="checkbox" id="tour-dont-show-again" style="cursor:pointer"><label class="form-check-label fs--2 fw-bold text-danger" for="tour-dont-show-again" style="cursor:pointer">No volver a mostrar</label></div>',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-password',
          popover: {
            title: '3. Cambio de Contraseña Obligatorio',
            description: 'Por motivos de seguridad institucional, es obligatorio cambiar su contraseña inicial. Ingrese su contraseña actual, defina la nueva contraseña y verifíquela.<br><br><div class="form-check"><input class="form-check-input" type="checkbox" id="tour-dont-show-again" style="cursor:pointer"><label class="form-check-label fs--2 fw-bold text-danger" for="tour-dont-show-again" style="cursor:pointer">No volver a mostrar</label></div>',
            side: 'top',
            align: 'start'
          }
        }
      ],
      onHighlighted: () => {
        const cb = document.getElementById('tour-dont-show-again') as HTMLInputElement;
        if (cb) {
          cb.checked = this.dontShowAgain;
        }
      },
      onDestroyed: () => {
        this.isTourActive = false;
        this.cdr.detectChanges();
        if (this.dontShowAgain) {
          localStorage.setItem('sifarmaOnboardingTourDismissed', 'true');
        } else {
          sessionStorage.setItem('sifarmaOnboardingTourDismissed', 'true');
        }
      }
    });

    driverObj.drive();
  }

  onlyNumbers(event: any): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) return false;
    return true;
  }

  private splitData(data: any): void {
    // Split Email
    const email = data.email || '';
    if (email.includes('@')) {
      const [user, domain] = email.split('@');
      const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
      this.contactForm.patchValue({
        email_user: user,
        email_domain: domains.includes(domain) ? domain : 'otro',
        email_custom: domains.includes(domain) ? '' : domain
      });
    }

    // Split Phone (Priorizar data.phone que viene de auth_user vía Raw SQL)
    const phone = data.phone || data.titular?.telefono || '';
    if (phone.length >= 11) {
      this.contactForm.patchValue({
        phone_prefix: phone.substring(0, 4),
        phone_number: phone.substring(4)
      });
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  getInitials(): string {
    if (!this.profileData) return '?';
    return `${this.profileData.first_name[0] || ''}${this.profileData.last_name[0] || ''}`.toUpperCase();
  }

  updateContact(): void {
    if (this.contactForm.invalid || this.isLoadingContact) return;

    const f = this.contactForm.value;
    const emailUser = f.email_user ? f.email_user.trim() : '';
    const domain = f.email_domain === 'otro' ? (f.email_custom ? f.email_custom.trim() : '') : f.email_domain;
    const phoneNum = f.phone_number ? f.phone_number.trim() : '';

    if (!emailUser || emailUser === '0' || emailUser.toLowerCase() === 'null') {
      this.swal.error('Validación', 'El usuario del correo electrónico no es válido.');
      return;
    }
    if (!domain || domain === '0' || domain.toLowerCase() === 'null') {
      this.swal.error('Validación', 'El dominio del correo electrónico no es válido.');
      return;
    }
    if (!phoneNum || phoneNum === '0' || /^0+$/.test(phoneNum)) {
      this.swal.error('Validación', 'El número de teléfono no puede estar vacío, ser 0 o estar compuesto únicamente por ceros.');
      return;
    }

    this.isLoadingContact = true;
    const fullEmail = `${emailUser}@${domain}`;
    const fullPhone = `${f.phone_prefix}${phoneNum}`;

    this.authService.updateProfileContact(fullEmail, fullPhone)
      .pipe(finalize(() => this.isLoadingContact = false))
      .subscribe({
        next: () => {
          this.swal.success('Listo', 'Información actualizada.');
          this.loadProfile();
        },
        error: (err) => this.swal.error('Error', err.error?.detail || 'Fallo de actualización.')
      });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid || this.isLoadingPassword) return;

    const f = this.passwordForm.value;
    const oldPass = f.old_password ? f.old_password.trim() : '';
    const newPass = f.new_password ? f.new_password.trim() : '';
    const confPass = f.confirm_password ? f.confirm_password.trim() : '';

    if (!oldPass || !newPass || !confPass) {
      this.swal.error('Validación', 'Los campos de contraseña no pueden estar vacíos ni contener solo espacios.');
      return;
    }
    if (newPass === '0' || oldPass === '0') {
      this.swal.error('Validación', 'La contraseña no puede ser "0".');
      return;
    }

    this.isLoadingPassword = true;
    this.authService.changePassword({ old_password: oldPass, new_password: newPass, confirm_password: confPass })
      .pipe(
        finalize(() => {
          this.isLoadingPassword = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.swal.success('Éxito', 'Contraseña actualizada.');
          this.passwordForm.reset();
          this.passwordRules = {
            hasMinLength: false,
            hasUppercase: false,
            hasLowercase: false,
            hasNumber: false,
            hasSpecialChar: false,
            hasNoSpaces: false,
            isValid: false
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          const errorMsg = err.error?.old_password?.[0] || err.error?.detail || 'Fallo al cambiar contraseña.';
          this.swal.error('Seguridad', errorMsg);
          this.cdr.detectChanges();
        }
      });
  }
}

