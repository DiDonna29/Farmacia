import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'edad',
  standalone: true
})
export class EdadPipe implements PipeTransform {
  transform(fechaNacimiento: string | Date | undefined): string {
    if (!fechaNacimiento) return '';
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    
    if (isNaN(nacimiento.getTime())) return '';
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return `${edad} años`;
  }
}
