import { Routes } from '@angular/router';

export const AppRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'menus',
                loadComponent: () => import('./pages/menu/menu').then(m => m.MenuPage)
            },
            {
                path: 'roles',
                loadComponent: () => import('./pages/role/role').then(m => m.RolePage)
            },
            {
                path: 'users',
                loadComponent: () => import('./pages/user/user').then(m => m.UserPage)
            }
        ]
    }
];