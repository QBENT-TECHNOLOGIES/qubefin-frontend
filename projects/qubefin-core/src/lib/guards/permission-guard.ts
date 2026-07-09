import { inject, Injectable } from "@angular/core";
import { CanActivate, ActivatedRouteSnapshot, Router } from "@angular/router";
import { PermissionStore } from "../stores/permission-store";

@Injectable({
    providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

    router = inject(Router);
    permissionStore = inject(PermissionStore);

    canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
        const required = route.data['permission'];
        if (this.permissionStore.has(required)) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve(this.router.navigate(['/secure/unauthorized']));
        }
    }
}