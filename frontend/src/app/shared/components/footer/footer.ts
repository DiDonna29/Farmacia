import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  host: {
    'class': 'mt-auto d-block w-100'
  }
})
export class FooterComponent {
  private authService = inject(AuthService);

  irAIntranet(event: Event): void {
    event.preventDefault();
    if (this.authService.isAuthenticated()) {
      this.authService.logout();
    }
    window.location.href = 'http://intranet2.dem.int';
  }
}