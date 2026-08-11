import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  credentials = {
    username: '',
    password: ''
  };
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const theme = localStorage.getItem('phoenixTheme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.login(
        this.credentials.username,
        this.credentials.password
      );

      if (success) {
        this.router.navigate(['/inicio']);
      } else {
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    } catch (error) {
      this.errorMessage = 'Error al conectar con el servidor';
    } finally {
      this.isLoading = false;
    }
  }
}