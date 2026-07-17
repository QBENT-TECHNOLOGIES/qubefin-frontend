import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../lucide-icons';


@Component({
    selector: 'qfin-page-unauthorized',
    imports: [LucideDynamicIcon],
    templateUrl: './page-unauthorized.html',
    styleUrls: ['./page-unauthorized.css']
})
export class PageUnauthorized {
    private router = inject(Router);
    readonly iconMap = APP_ICONS_MAP;
    goHome(): void {
      this.router.navigateByUrl('/public/auth/login');
    }

    goBack(): void {
      window.history.back();
    }

}
