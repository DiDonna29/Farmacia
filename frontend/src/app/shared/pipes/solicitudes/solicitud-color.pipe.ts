import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'solicitudStatusColor',
  standalone: true
})
export class SolicitudColorPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return 'badge bg-secondary';
    
    // Status mapping specifically for bootstrap badge classes
    const statusObj: { [key: string]: string } = {
      'EN_REVISION': 'badge bg-warning text-dark',
      'APROBADO': 'badge bg-success',
      'RECHAZADO': 'badge bg-danger',
      'DEVUELTO': 'badge bg-info'
    };
    return statusObj[value.toUpperCase()] || 'badge bg-secondary';
  }
}
