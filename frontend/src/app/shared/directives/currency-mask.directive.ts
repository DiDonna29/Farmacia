import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CurrencyMaskDirective),
    multi: true
  }]
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  private el: HTMLInputElement;
  private onTouched!: () => void;
  private onChange!: (value: any) => void;

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  // Model to View
  writeValue(value: any): void {
    if (value !== undefined && value !== null) {
      this.el.value = this.formatCurrency(value.toString());
    } else {
      this.el.value = '';
    }
  }

  // View to Model
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.el.disabled = isDisabled;
  }

  @HostListener('input', ['$event.target'])
  onInput(target: EventTarget | null) {
    if (!target) return;
    const inputElement = target as HTMLInputElement;
    const value = inputElement.value;
    // Only allow digits to be processed
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly === '') {
      this.onChange(null);
      this.el.value = '';
      return;
    }

    // Convert string of digits into a number (e.g. '12345' -> 123.45)
    // We assume the user is typing without dot and the last two digits are decimals
    let numValue = parseInt(digitsOnly, 10) / 100;
    
    // Format the value visually
    this.el.value = this.formatCurrency(numValue.toString());

    // Send the raw number to the model (for backend)
    this.onChange(numValue);
  }

  @HostListener('blur')
  onBlur() {
    if (this.onTouched) {
      this.onTouched();
    }
  }

  private formatCurrency(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    
    // 1234.56 -> "1234.56"
    let formattedStr = num.toFixed(2);
    
    // Reemplaza '.' con ',' para los decimales
    formattedStr = formattedStr.replace('.', ',');
    
    // Reemplaza miles con '.'
    return formattedStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}
