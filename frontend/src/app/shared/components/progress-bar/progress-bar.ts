import { Component, Input } from '@angular/core';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [NgClass, CurrencyPipe, DecimalPipe],
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.css',
})
export class ProgressBar {
  @Input() coberturaUsada: number = 0;
  @Input() limite: number = 100;

  get porcentaje(): number {
    return this.limite > 0 ? (this.coberturaUsada / this.limite) * 100 : 0;
  }

  get colorClase(): string {
    const p = this.porcentaje;
    if (p < 50) return 'bg-success';
    if (p < 80) return 'bg-warning';
    return 'bg-danger';
  }
}
