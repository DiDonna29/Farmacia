import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appUppercase]',
  standalone: true
})
export class UppercaseDirective {
  @HostListener('input', ['$event']) onInputChange(event: any) {
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    const initialValue = event.target.value;
    const upperValue = initialValue.toUpperCase();

    if (initialValue !== upperValue) {
      event.target.value = upperValue;
      event.target.setSelectionRange(start, end);
      // Notificar a Angular del cambio manual del valor solo si cambió
      event.target.dispatchEvent(new Event('input'));
    }
    event.stopPropagation();
  }
}
