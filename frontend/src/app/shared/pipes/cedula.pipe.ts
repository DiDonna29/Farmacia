import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cedula',
  standalone: true
})
export class CedulaPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined) return '';
    const str = value.toString();
    const digits = str.replace(/\D/g, '');
    
    // Si no contiene dígitos (ej: "admin"), devolver original
    if (!digits) return str;
    // Si la longitud es mayor a 9, se asume que es un certificado o un número especial, y se devuelve sin puntos
    if (digits.length > 9) return digits;

    // Formatear con puntos cada 3 dígitos
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}
