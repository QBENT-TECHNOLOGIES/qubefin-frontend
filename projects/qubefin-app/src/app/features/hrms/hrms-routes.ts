import { Routes } from '@angular/router';

export const HrmsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'salary-components',
        loadComponent: () =>
          import('./pages/salary-component/salary-component').then((m) => m.SalaryComponent),
        data: {
          title: 'Salary Components',
          subTitle: 'Manage and organize administrative units within your organization.',
          icon: 'apartment',
        },
      },
      {
        path: 'employee-components',
        loadComponent: () =>
          import('./pages/employee-component/employee-component').then((m) => m.EmployeeComponent),
      },
      {
        path: 'attendance-history',
        loadComponent: () =>
          import('./pages/attendance-history-component/attendance-history-component').then(
            (m) => m.AttendanceHistoryComponent,
          ),
      },
    ],
  },
];
