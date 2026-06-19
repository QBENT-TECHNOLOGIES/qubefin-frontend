import { Routes } from '@angular/router';
import { Container } from './layouts/public/container/container';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'public/auth/login',
        pathMatch: 'full',
    },
    {
        path: 'public',
        component: Container,
        children: [
            {
                path: 'auth',
                loadChildren: () => import('./features/auth/auth-routes').then(m => m.AuthRoutes),
            }
        ]
    }

];
