import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'telefonoFormat',
  standalone: true
})
export class TelefonoFormatPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return 'N/A';
    
    // Remove non-digit chars
    const cleaned = ('' + value).replace(/\D/g, '');
    
    // Match local format (e.g. 0412 123 4567) -> (0412)-1234567
    const match = cleaned.match(/^(\d{1,4})(\d{0,7})$/);
    if (match) {
      if (match[2]) {
        return `(${match[1]})-${match[2]}`;
      } else {
        return `(${match[1]}`;
      }
    }
    
    // Return original if it doesn't match usual VE format
    return value;
  }
}
