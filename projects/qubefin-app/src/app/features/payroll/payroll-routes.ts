import { Routes } from '@angular/router';

export const PayrollRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'monthly-payroll',
                loadComponent: () => import('./pages/monthly-payroll/monthly-payroll').then(m => m.MonthlyPayroll)
            }
        ]
    }
];