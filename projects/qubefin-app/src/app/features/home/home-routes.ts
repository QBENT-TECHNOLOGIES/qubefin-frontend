import { Routes } from '@angular/router';

export const HomeRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: 'profile',
                loadComponent: () => import('./pages/profile/profile').then(m => m.Profile)
            }
        ]
    }
];