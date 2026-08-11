import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'genero',
  standalone: true
})
export class GeneroPipe implements PipeTransform {
  transform(sexo: string | undefined): string {
    if (!sexo) return '';
    
    const normalize = sexo.toUpperCase().trim();
    if (normalize === 'F' || normalize === 'FEMENINO') return 'Femenino';
    if (normalize === 'M' || normalize === 'MASCULINO') return 'Masculino';
    
    return sexo;
  }
}
