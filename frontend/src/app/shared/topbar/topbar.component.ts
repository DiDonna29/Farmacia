import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">{{ getCurrentPageTitle() }}</h1>
        <p class="page-date">{{ today | date:'EEEE, d MMMM y':'':'es' }}</p>
      </div>
      <div class="topbar-right">
        <div class="system-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          Sistema Farmacia DEM
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 2rem;
      background: var(--topbar-bg);
      border-bottom: 1px solid var(--border);
      min-height: 64px;
    }
    .page-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 2px;
    }
    .page-date {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
      text-transform: capitalize;
    }
    .system-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
    }
  `]
})
export class TopbarComponent {
  today = new Date();

  private pageTitles: Record<string, string> = {
    '/inicio': 'Dashboard',
    '/inventario': 'Inventario de Medicamentos',
    '/medicamentos': 'Catálogo de Medicamentos',
    '/dotacion': 'Ingreso de Dotación',
    '/despacho': 'Despacho de Medicamentos',
    '/historial': 'Historial de Despachos',
    '/usuarios': 'Gestión de Usuarios',
    '/estadisticas': 'Estadísticas e Informes',
  };

  constructor(private router: Router) {}

  getCurrentPageTitle(): string {
    const url = this.router.url.split('?')[0];
    return this.pageTitles[url] || 'Farmacia DEM';
  }
}
