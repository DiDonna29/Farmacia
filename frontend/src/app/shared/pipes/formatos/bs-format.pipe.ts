import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsFormat',
  standalone: true
})
export class BsFormatPipe implements PipeTransform {
  transform(value: number | string | undefined | null): string {
    if (value == null || value === '') return '0,00';
    
    // Parse to number to ensure we handle it correctly
    let num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '0,00';
    
    // Convert to standard format with 2 decimals
    let formattedStr = num.toFixed(2);
    
    // Replace '.' with ',' for decimal separator
    formattedStr = formattedStr.replace('.', ',');
    
    // Add '.' as thousands separator using regex
    return formattedStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}
