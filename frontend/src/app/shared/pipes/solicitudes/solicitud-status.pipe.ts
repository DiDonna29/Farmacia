import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'solicitudStatusText',
  standalone: true
})
export class SolicitudStatusPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return 'DESCONOCIDO';
    
    // Status mapping specifically for text
    const statusObj: { [key: string]: string } = {
      'EN_REVISION': 'En Revisión (Administrador)',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado (Cerrado)',
      'DEVUELTO': 'Devuelto (Requiere Corrección)'
    };
    return statusObj[value.toUpperCase()] || value.toUpperCase();
  }
}
