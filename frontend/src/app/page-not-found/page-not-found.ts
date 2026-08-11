import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink], // RouterLink SÍ se usa en el template
  templateUrl: './page-not-found.html',
  styleUrls: ['./page-not-found.css']
})
export class PageNotFoundComponent {}