import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appSoloNumeros]',
  standalone: true
})
export class SoloNumerosDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInputChange(event: any) {
    this._sanitize(event.target);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const input = this.el.nativeElement;
    // Insertar en la posición del cursor
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const current = input.value;
    input.value = current.slice(0, start) + pasted + current.slice(end);
    this._sanitize(input);
  }

  private _sanitize(input: HTMLInputElement): void {
    const initial = input.value;
    // Eliminar todo lo que no sea dígito
    let cleaned = initial.replace(/[^0-9]/g, '');
    // Eliminar ceros a la izquierda
    if (cleaned.length > 0) {
      cleaned = cleaned.replace(/^0+/, '') || '0';
    }
    if (initial !== cleaned) {
      input.value = cleaned;
      // Disparar evento de Angular para sincronizar el modelo
      input.dispatchEvent(new Event('input'));
    }
  }
}
