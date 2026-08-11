import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { InventarioService } from '../../core/services/inventario.service';
import { LoteInventario } from '../../core/models/farmacia.models';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-navbar-top',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule],
  template: `
    <nav class="navbar navbar-top fixed-top justify-content-between px-3 px-sm-4" id="navbarTop" style="height: var(--navbar-top-height);">
      <!-- Area Izquierda: Logos (DEM + SIFARMA) y Botón Hamburguesa -->
      <div class="d-flex align-items-center gap-2">
        <button
          class="btn navbar-toggler-humburger-icon hover-bg-transparent d-inline-block d-lg-none"
          type="button"
          (click)="toggleMobileNavbar()"
          aria-label="Toggle navigation"
          style="border: none; padding: 0.25rem; margin-right: 0.25rem;"
        >
          <span class="navbar-toggle-icon"><span class="toggle-line"></span></span>
        </button>
        <a class="navbar-brand me-0" routerLink="/inicio">
          <div class="d-flex align-items-center gap-2 gap-sm-3">
            <div class="d-flex align-items-center">
              <img class="d-light-none" src="assets/img/dem.png" alt="Logo DEM" style="height: 38px; width: auto;" />
              <img class="d-dark-none" src="assets/img/dem-2.png" alt="Logo DEM" style="height: 38px; width: auto;" />
            </div>
            <!-- Separador vertical -->
            <div class="vr bg-300 d-none d-sm-block" style="height: 24px; opacity: 0.5;"></div>
            <!-- Logo SIFARMA -->
            <div class="d-flex align-items-center">
              <img class="d-light-none" src="assets/img/logo sifarma simple - version oscuro.png" alt="Logo SIFARMA" style="height: 45px; width: auto; max-width: 100%; object-fit: contain;" />
              <img class="d-dark-none" src="assets/img/logo sifarma simple - version claro.png" alt="Logo SIFARMA" style="height: 45px; width: auto; max-width: 100%; object-fit: contain;" />
            </div>
          </div>
        </a>
      </div>

      <!-- Area Centro: Título Institucional (Centrado y Opaco) -->
      <div class="d-none d-xl-flex flex-column align-items-center text-center flex-grow-1 px-3">
        <div class="mt-1 text-uppercase text-600" style="font-size: 0.65rem; font-weight: 600; opacity: 0.8; letter-spacing: 1px;">
          Sistema de Inventario de Farmacia
        </div>
      </div>

      <!-- Area Derecha: Iconos y Usuario -->
      <ul class="navbar-nav navbar-nav-icons flex-row align-items-center gap-1 gap-sm-3 m-0 p-0" style="list-style: none;">
        <!-- Location indicator -->
        <li class="nav-item d-none d-md-block me-3 mt-2">
          <div class="d-flex align-items-center bg-body-tertiary border border-subtle px-3 py-1 rounded-pill shadow-sm">
            <div class="me-2 text-primary">
              <span class="fas fa-hospital fs-0"></span>
            </div>
            <div class="d-flex flex-column">
              <span class="fw-bolder text-1100 fs--2 lh-1 text-uppercase" style="letter-spacing: 0.5px">Farmacia Central</span>
              <span class="text-600 fs--2 fw-medium">{{ today | date:'d MMM y, HH:mm':'':'es' }}</span>
            </div>
          </div>
        </li>

        <!-- Theme toggle -->
        <li class="nav-item">
          <div class="theme-control-toggle fa-icon-wait px-2">
            <input
              class="form-check-input ms-0 theme-control-toggle-input"
              type="checkbox"
              [checked]="isDarkTheme"
              (change)="toggleTheme()"
              id="themeControlToggleTop"
            />
            <label class="mb-0 theme-control-toggle-label theme-control-toggle-light" for="themeControlToggleTop" title="Modo Oscuro">
              <span class="fas fa-moon"></span>
            </label>
            <label class="mb-0 theme-control-toggle-label theme-control-toggle-dark" for="themeControlToggleTop" title="Modo Claro">
              <span class="fas fa-sun"></span>
            </label>
          </div>
        </li>

        <!-- User profile -->
        <li class="nav-item dropdown">
          <a class="nav-link lh-1 pe-0" id="navbarDropdownUser" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <div class="avatar avatar-m d-flex align-items-center justify-content-center rounded-circle fw-bolder"
                 style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;font-size:0.7rem;width:34px;height:34px">
              {{ getInitials() }}
            </div>
          </a>
          <div class="dropdown-menu dropdown-menu-end navbar-dropdown-caret py-0 dropdown-profile shadow border border-300">
            <div class="card position-relative border-0 shadow-none">
              <div class="card-body p-0">
                <div class="text-center pt-4 pb-3">
                  <div class="avatar avatar-xl d-flex align-items-center justify-content-center rounded-circle mx-auto mb-2 fw-bolder fs-2"
                       style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;width:72px;height:72px">
                    {{ getInitials() }}
                  </div>
                  <h6 class="mt-2 text-black mb-0">{{ currentUser?.first_name }} {{ currentUser?.last_name }}</h6>
                  <p class="text-600 fs--2 mb-1">@{{ currentUser?.username }}</p>
                  <span class="badge badge-phoenix fs--2"
                    [ngClass]="{
                      'badge-phoenix-danger': currentUser?.rol === 'ADMINISTRADOR',
                      'badge-phoenix-primary': currentUser?.rol === 'ENCARGADO',
                      'badge-phoenix-success': currentUser?.rol === 'FARMACEUTICO'
                    }"
                  >{{ currentUser?.rol }}</span>
                </div>
              </div>
              <div class="card-footer p-0 border-top">
                <div class="px-3 pt-3">
                  <a class="btn btn-phoenix-primary d-flex flex-center w-100 mb-2" routerLink="/perfil">
                    <span class="me-2 fas fa-user"></span>Mi Perfil
                  </a>
                  <a class="btn btn-phoenix-danger d-flex flex-center w-100" href="#!" (click)="logout(); $event.preventDefault()">
                    <span class="me-2 fas fa-sign-out-alt"></span>Cerrar Sesión
                  </a>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  `,
})
export class NavbarTopComponent implements OnInit {
  currentUser: User | null = null;
  isDarkTheme = false;
  today = new Date();
  
  searchQuery = '';
  results: LoteInventario[] = [];
  showResults = false;
  private searchSubject = new Subject<string>();

  private pageTitles: Record<string, string> = {
    '/inicio': 'Inicio',
    '/inventario': 'Inventario',
    '/medicamentos': 'Catálogo de Medicamentos',
    '/dotacion': 'Ingreso de Dotación',
    '/despacho': 'Despacho',
    '/historial': 'Historial de Despachos',
    '/usuarios': 'Gestión de Usuarios',
    '/estadisticas': 'Estadísticas',
  };

  constructor(
    private authService: AuthService, 
    private router: Router,
    private inventarioService: InventarioService
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => this.performSearch(q));
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    this.isDarkTheme = localStorage.getItem('phoenixTheme') === 'dark';
    
    // Reloj en tiempo real para el navbar
    setInterval(() => {
      this.today = new Date();
    }, 1000);
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  performSearch(q: string): void {
    if (!q) {
      this.results = [];
      this.showResults = false;
      return;
    }
    this.inventarioService.getInventario({ busqueda: q, page_size: 5 }).subscribe(res => {
      this.results = res.results;
      this.showResults = true;
    });
  }

  hideResults(): void {
    setTimeout(() => this.showResults = false, 200);
  }

  goToItem(item: LoteInventario): void {
    this.router.navigate(['/inventario'], { queryParams: { busqueda: item.numero_lote } });
    this.searchQuery = '';
    this.showResults = false;
  }

  getPageTitle(): string {
    const url = this.router.url.split('?')[0];
    return this.pageTitles[url] || 'Farmacia DEM';
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.first_name[0] || ''}${this.currentUser.last_name[0] || ''}`.toUpperCase();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    const theme = this.isDarkTheme ? 'dark' : 'light';
    localStorage.setItem('phoenixTheme', theme);
    document.documentElement.classList.toggle('dark', this.isDarkTheme);
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileNavbar(): void {
    const nav = document.querySelector('.navbar-vertical');
    const overlay = document.querySelector('.sidebar-overlay');
    if (nav) {
      const show = nav.classList.toggle('show');
      if (overlay) {
        if (show) {
          overlay.classList.add('show');
        } else {
          overlay.classList.remove('show');
        }
      }
    }
  }
}
