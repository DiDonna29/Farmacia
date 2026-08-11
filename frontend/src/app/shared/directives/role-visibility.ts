import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Directive({
  selector: '[appRoleVisibility]',
  standalone: true
})
export class RoleVisibility {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);

  @Input() set appRoleVisibility(allowedRoles: UserRole[]) {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && allowedRoles.includes(currentUser.rol)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
