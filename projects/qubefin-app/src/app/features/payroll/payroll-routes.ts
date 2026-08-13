import { Routes } from '@angular/router';

export const PayrollRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'salary-components',
                loadComponent: () => import('./pages/salary-component/salary-component').then(m => m.SalaryComponent),
                data: {
                    title: 'Salary Components',
                    subTitle: 'Manage and organize administrative units within your organization.',
                    icon: 'apartment'
                }
            },
            {
                path: 'monthly-payroll',
                loadComponent: () => import('./pages/monthly-payroll/monthly-payroll').then(m => m.MonthlyPayroll)
            }
        ]
    }
];