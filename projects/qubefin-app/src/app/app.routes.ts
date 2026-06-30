import { Routes } from '@angular/router';
import { Container as PublicContainer } from './layouts/public/container/container';
import { Container as SecureContainer } from './layouts/secure/container/container';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'public/auth/login',
        pathMatch: 'full',
    },
    {
        path: 'public',
        component: PublicContainer,
        children: [
            {
                path: 'auth',
                loadChildren: () => import('./features/auth/auth-routes').then(m => m.AuthRoutes),
            }
        ]
    },
    {
        path: 'secure',
        component: SecureContainer,
        children: [
            {
                path: 'home',
                loadChildren: () => import('./features/home/home-routes').then(m => m.HomeRoutes),
            },
            {
                path: 'global',
                loadChildren: () => import('./features/global/global-routes').then(m => m.GlobalRoutes),
            }
        ]
    }
];
