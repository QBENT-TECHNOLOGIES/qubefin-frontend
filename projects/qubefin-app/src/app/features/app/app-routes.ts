import { Routes } from '@angular/router';

export const AppRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'menus',
                loadComponent: () => import('./pages/menu/menu').then(m => m.MenuPage),
                data: {
                    title: 'Menus',
                    subTitle: 'Manage and organize menus of the system.',
                    icon: 'apartment'
                }
            }
        ]
    }
];