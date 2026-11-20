import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStore } from '../stores/auth-store';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
    if (this.authStore.isAuthenticated()) {
      return true;
    }

    // Token missing or expired: clear tokens and reset login state before redirecting
    this.authStore.logout();
    this.router.navigate(['/public/auth/login']);
    return false;
  }
}
