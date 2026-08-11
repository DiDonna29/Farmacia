import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateText',
  standalone: true
})
export class TruncateTextPipe implements PipeTransform {
  transform(value: string | undefined | null, limit: number = 25, trailing: string = '...'): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit) + trailing : value;
  }
}
