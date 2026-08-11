import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() inputClass: string = 'border-primary';

  prefix: string = '';
  number: string = '';
  disabled: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  writeValue(value: string | null): void {
    if (!value) {
      this.prefix = '';
      this.number = '';
      return;
    }

    // Limpiar caracteres no numéricos
    let chars = value.toString().replace(/\D/g, '');

    // Si comienza con un número distinto a 0 y tiene 10 dígitos (ej: 4242092088), agregar el 0
    if (chars.length === 10 && !chars.startsWith('0')) {
      chars = '0' + chars;
    }

    // Analiza las partes
    if (chars.length > 4) {
      const p = chars.substring(0, 4);
      // Validar si el prefijo es uno de los aceptados
      if (['0414','0424','0412','0422','0416','0426'].includes(p)) {
        this.prefix = p;
      } else {
        // En caso de prefijos viejos (ej: 0212), lo tratamos como vacío o dejamos que se limpie?
        // El usuario pidió restringir estrictamente a Opciones. Lo dejamos en blanco si no coincide.
        this.prefix = '';
      }
      this.number = chars.substring(4, 11);
    } else {
      this.prefix = '';
      this.number = chars;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, ''); // Solo números enteros
    if (val.length > 7) {
      val = val.substring(0, 7);
    }
    input.value = val;
    this.number = val;
    this.emitChange();
  }

  onBlur(): void {
    this.onTouched();
  }

  emitChange(): void {
    if (this.prefix || this.number) {
      this.onChange(`${this.prefix}${this.number}`);
    } else {
      this.onChange('');
    }
  }
}
