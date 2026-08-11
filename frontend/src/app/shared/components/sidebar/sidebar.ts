import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

// Este es el sidebar legacy del proyecto genérico.
// La farmacia usa el sidebar en shared/sidebar/sidebar.component.ts
// Este archivo se mantiene vacío para compatibilidad con el compilador.
@Component({
  selector: 'app-sidebar-legacy',
  standalone: true,
  imports: [CommonModule],
  template: '',
})
export class SidebarComponent {
  constructor(private authService: AuthService) {}
}