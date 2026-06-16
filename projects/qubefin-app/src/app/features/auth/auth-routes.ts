import { Routes } from '@angular/router';

export const AuthRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'login',
                loadComponent: () => import('./pages/login/login').then(m => m.Login)
            }
        ]
    }
];