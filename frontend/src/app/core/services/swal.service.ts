import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SwalService {

  success(title: string, text: string = '') {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  error(title: string, text: string = '') {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#ef4444'
    });
  }

  warning(title: string, text: string = '') {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#f59e0b'
    });
  }

  confirm(title: string, html: string = '', confirmButtonText: string = 'Sí, continuar') {
    return Swal.fire({
      icon: 'question',
      title,
      html,
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6e7d88',
      confirmButtonText,
      cancelButtonText: 'Cancelar'
    });
  }

  loading(title: string = 'Procesando...', text: string = '') {
    Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  loadingToast(title: string = 'Cargando...') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({
      icon: 'info',
      title
    });
  }

  close() {
    Swal.close();
  }
}
