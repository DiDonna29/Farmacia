import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TitularService } from '../../core/services/titular.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio implements OnInit {
  rol: 'ANALISTA_FRONT' | 'ADMINISTRADOR' | null = null;
  solicitudesPendientes = 0;
  
  // Para la búsqueda rápida
  cedulaBusqueda: string = '';

  constructor(
    private authService: AuthService,
    private titularService: TitularService,
    private solicitudesService: SolicitudesService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.rol = user ? (user.rol as 'ANALISTA_FRONT' | 'ADMINISTRADOR') : null;

    if (this.rol === 'ADMINISTRADOR') {
      this.solicitudesService.solicitudes$.subscribe(solicitudes => {
        this.solicitudesPendientes = solicitudes.filter(s => s.estado === 'EN_REVISION').length;
      });
    }
  }

  buscarFuncionario() {
    if (!this.cedulaBusqueda) return;
    this.router.navigate(['/perfil', this.cedulaBusqueda]);
  }
}
