import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarVerticalComponent } from '../navbar-vertical/navbar-vertical.component';
import { NavbarTopComponent } from '../navbar-top/navbar-top.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarVerticalComponent, NavbarTopComponent],
  template: `
    <main class="main" id="top">
      <app-navbar-vertical />
      <app-navbar-top />
      
      <!-- Overlay para cerrar el sidebar en móviles al hacer click afuera -->
      <div class="sidebar-overlay" (click)="closeMobileNavbar()"></div>
      
      <div class="content">
        <div class="px-4 pt-0 pb-4">
          <router-outlet />
        </div>
        
        <!-- <footer class="footer position-static mt-auto border-top border-subtle">
          <div class="row g-0 justify-content-between align-items-center h-100 px-4">
            <div class="col-12 col-sm-auto text-center">
              <p class="mb-0 mt-2 mt-sm-0 text-700 fs--1">
                FARMACIA DEM
                <span class="text-300 mx-2">|</span>
                Sistema de Gestión Farmacéutica
                <span class="text-300 mx-2">&copy;</span>
                {{ currentYear }}
              </p>
            </div>
          </div>
        </footer> -->
  <footer class="footer position-static mt-auto border-top border-300" style="height: 65px; background-color: inherit;">
          <div class="row g-0 justify-content-between align-items-center h-100 px-4">
            <div class="col-12 col-sm text-center text-sm-start">
              <p class="mb-0 text-900 small">
                Desarrollado por la "Oficina de Desarrollo Informático de la Dirección Ejecutiva de la Magistratura del Tribunal Supremo de Justicia." | {{ currentYear }} &copy;<a href="http://intranet2.dem.int" (click)="irAIntranet($event)" class="text-decoration-none fw-bold">Intranet</a>
              </p>
            </div>
            <div class="col-12 col-sm-auto text-center text-sm-end mt-2 mt-sm-0">
              <p class="mb-0 text-600 small">v1.0.0</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  `,
})
export class LayoutComponent {
  private authService = inject(AuthService);
  currentYear = new Date().getFullYear();

  irAIntranet(event: Event): void {
    event.preventDefault();
    if (this.authService.isAuthenticated()) {
      this.authService.logout();
    }
    window.location.href = 'http://intranet2.dem.int';
  }

  closeMobileNavbar(): void {
    const nav = document.querySelector('.navbar-vertical');
    const overlay = document.querySelector('.sidebar-overlay');
    if (nav) nav.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
  }
}
