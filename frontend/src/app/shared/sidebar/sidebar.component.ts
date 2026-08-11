import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { CedulaPipe } from '../../shared/pipes/cedula.pipe';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: any;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, CedulaPipe],
  template: `
    <aside class="sidebar">
      <!-- Logo DEM -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-title">!!! ACTUALIZADO !!!</span>
          <span class="brand-sub">DEM</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="sidebar-user" *ngIf="currentUser">
        <div class="user-avatar">{{ getInitials() }}</div>
        <div class="user-info d-flex flex-column">
          <p class="user-name mb-1">
            {{ currentUser.first_name }} {{ currentUser.last_name }}
            <small class="text-400 d-block fs--2">ROL: {{ currentUser.rol || 'NO ASIGNADO' }}</small>
          </p>
          <div class="d-flex align-items-center gap-2">
            <span class="user-role role-badge" [class]="'role-' + (currentUser.rol.toLowerCase() || 'sin-rol')">
              {{ currentUser.rol || 'Sin Rol' }}
            </span>
            <span class="text-500 fs--2 fw-bold">{{ currentUser.username | cedula }}</span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section">
          <p class="nav-section-label">Principal</p>
          <ng-container *ngFor="let item of navItems">
            <a
              *ngIf="canSeeItem(item)"
              [routerLink]="item.route"
              [queryParams]="item.queryParams"
              routerLinkActive="active"
              class="nav-item"
              [title]="item.label"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </ng-container>
        </div>
      </nav>

      <!-- Logout -->
      <div class="sidebar-footer">
        <button class="logout-btn" (click)="logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      min-width: 260px;
      background: #007bff;
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 1.5rem 1.25rem;
      border-bottom: 1px solid var(--sidebar-border);
    }
    .brand-icon {
      width: 42px;
      height: 42px;
      background: var(--accent-gradient);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }
    .brand-title {
      display: block;
      font-weight: 700;
      font-size: 1rem;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--accent);
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--sidebar-border);
    }
    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .user-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 2px;
      line-height: 1.2;
    }
    .user-role {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .role-administrador { background: #fee2e2; color: #dc2626; }
    .role-encargado { background: #dbeafe; color: #2563eb; }
    .role-farmaceutico { background: #dcfce7; color: #16a34a; }
    .role-proveeduria { background: #f3e8ff; color: #9333ea; }
    .role-auditor { background: #f1f5f9; color: #475569; }
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      overflow-y: auto;
    }
    .nav-section-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 0 0.5rem;
      margin: 0 0 0.5rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      margin-bottom: 2px;
    }
    .nav-item:hover {
      background: var(--sidebar-hover);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: var(--accent-light);
      color: var(--accent);
      font-weight: 600;
    }
    .nav-icon { display: flex; align-items: center; flex-shrink: 0; }
    .nav-label { flex: 1; }
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid var(--sidebar-border);
    }
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logout-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }
  `]
})
export class SidebarComponent implements OnInit {
  currentUser: User | null = null;
  userRole: string = '';

  navItems: NavItem[] = [
    {
      label: 'Inicio ',
      route: '/inicio',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    },
    {
      label: 'Inventario Farmacia',
      route: '/inventario',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    },
    {
      label: 'Medicamentos',
      route: '/medicamentos',
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'FARMACEUTICO', 'ADMINISTRADOR DE FARMACIA', 'PROVEEDURIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"/><path d="M12 8v8M8 12h8"/></svg>',
    },
    {
      label: 'Dotación',
      route: '/dotacion',
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'FARMACEUTICO', 'ADMINISTRADOR DE FARMACIA', 'PROVEEDURIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    },
    {
      label: 'Despacho',
      route: '/despacho',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    },
    {
      label: 'Historial',
      route: '/historial',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    },
    {
      label: 'Usuarios',
      route: '/usuarios',
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'ADMINISTRADOR DE FARMACIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    },
    {
      label: 'Estadísticas',
      route: '/estadisticas',
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'ADMINISTRADOR DE FARMACIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    },
    {
      label: 'Papelera',
      route: '/auditoria/bajas',
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'ADMINISTRADOR DE FARMACIA', 'PROVEEDURIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>',
    },
    {
      label: 'Solicitudes Farmacia',
      route: '/proveeduria/solicitudes',
      queryParams: { origen: 'FARMACIA' },
      roles: ['ENCARGADO', 'ADMINISTRADOR', 'FARMACEUTICO', 'ADMINISTRADOR DE FARMACIA', 'PROVEEDURIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
    },
    {
      label: 'Solicitudes Pr.',
      route: '/proveeduria/solicitudes',
      queryParams: { origen: 'PROVEEDURIA' },
      roles: ['PROVEEDURIA', 'ENCARGADO', 'ADMINISTRADOR', 'ADMINISTRADOR DE FARMACIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>',
    },
    {
      label: 'Inv. Proveeduría',
      route: '/proveeduria/inventario',
      roles: ['PROVEEDURIA', 'ENCARGADO', 'ADMINISTRADOR', 'ADMINISTRADOR DE FARMACIA'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    },
    {
      label: 'Bitácora Eventos',
      route: '/auditoria/logs',
      roles: ['ADMINISTRADOR', 'AUDITOR'],
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    },
  ];

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.userRole = user?.rol?.toUpperCase().trim() || '';
      this.cdr.detectChanges();
    });
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.first_name[0] || ''}${this.currentUser.last_name[0] || ''}`.toUpperCase();
  }

  canSeeItem(item: NavItem): boolean {
    if (!item.roles) return true;
    if (!this.userRole) return false;
    return item.roles.some(r => r.toUpperCase().trim() === this.userRole);
  }

  logout(): void {
    this.authService.logout();
  }
}

