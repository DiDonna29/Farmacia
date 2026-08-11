import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter<void>();
  user: User | null = null;

  constructor(private authService: AuthService) {}

  isDarkTheme = false;

  ngOnInit(): void {
    // Obtenemos los datos del usuario logueado
    this.user = this.authService.getCurrentUser();
    
    // Configuración inicial del tema
    const stored = localStorage.getItem('theme') || localStorage.getItem('phoenixTheme');
    if (stored === 'dark') {
      this.isDarkTheme = true;
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkTheme = false;
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    const theme = this.isDarkTheme ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (this.isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
    localStorage.setItem('phoenixTheme', theme); // Sincronizar con JS nativo de Phoenix
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}