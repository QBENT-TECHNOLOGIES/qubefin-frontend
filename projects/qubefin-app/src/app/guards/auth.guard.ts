import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStore } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): boolean {
    if (this.authStore.isAuthenticated()) {
      return true;
    }

    this.router.navigate(['/public/auth/login']);
    return false;
  }
}
