import { Routes } from '@angular/router';

export const GlobalRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'administrative-units',
                loadComponent: () => import('./pages/administrative-unit/administrative-unit').then(m => m.AdministrativeUnit)
            }
        ]
    }
];