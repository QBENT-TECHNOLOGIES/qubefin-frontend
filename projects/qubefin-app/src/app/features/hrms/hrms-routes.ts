import { Routes } from '@angular/router';

export const HrmsRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'salary-components',
                loadComponent: () => import('./pages/salary-component/salary-component').then(m => m.SalaryComponent)
            },
            {
                path: 'employee-components',
                loadComponent: () => import('./pages/employee-component/employee-component').then(m => m.EmployeeComponent)
            }
        ]
    }
];