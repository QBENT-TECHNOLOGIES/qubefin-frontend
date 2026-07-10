import { Routes } from '@angular/router';

export const HrmsRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'salary-components',
                loadComponent: () => import('./pages/salary-component/salary-component').then(m => m.SalaryComponent)
            }
        ]
    }
];