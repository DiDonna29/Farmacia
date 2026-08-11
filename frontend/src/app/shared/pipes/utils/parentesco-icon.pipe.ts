import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parentescoIcon',
  standalone: true
})
export class ParentescoIconPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return 'fas fa-user-circle';
    
    const lowerVal = value.toLowerCase();
    
    if (lowerVal.includes('titular')) return 'fas fa-user-tie text-primary';
    if (lowerVal.includes('hijo') || lowerVal.includes('hija')) return 'fas fa-child text-info';
    if (lowerVal.includes('padre') || lowerVal.includes('madre')) return 'fas fa-user-friends text-secondary';
    if (lowerVal.includes('conyuge') || lowerVal.includes('espos')) return 'fas fa-user-friends text-warning';
    
    return 'fas fa-user text-dark';
  }
}
