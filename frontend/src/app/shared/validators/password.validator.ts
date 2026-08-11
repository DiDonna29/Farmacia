import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordRulesState {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasNoSpaces: boolean;
  isValid: boolean;
}

export function evaluatePassword(password: string): PasswordRulesState {
  if (!password) {
    return {
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasNoSpaces: false,
      isValid: false
    };
  }
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9\s]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasNoSpaces;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasNoSpaces,
    isValid
  };
}

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value || '';
    if (!value) {
      return null;
    }
    const state = evaluatePassword(value);
    if (!state.isValid) {
      return { passwordStrength: state };
    }
    return null;
  };
}
