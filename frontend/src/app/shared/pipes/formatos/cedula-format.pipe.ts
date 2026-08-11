import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cedulaFormat',
  standalone: true
})
export class CedulaFormatPipe implements PipeTransform {
  transform(value: number | string | undefined, isCertificado: boolean = false): string {
    if (!value) return '';
    
    // Convert to string and remove non-digit characters
    const cleanValue = value.toString().replace(/\D/g, '');
    
    if (isCertificado) {
      return cleanValue; // No prefix, no thousands separators for Certificates
    }
    
    // Apply "12.345.678" format using regex for thousand separators
    const formatted = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `V-${formatted}`;
  }
}
