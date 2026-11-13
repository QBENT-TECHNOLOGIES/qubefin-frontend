import { Routes } from '@angular/router';

export const ReportRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'leave-balance-report',
        loadComponent: () =>
          import('./pages/leave-balance-report/leave-balance-report').then(
            (m) => m.LeaveBalanceReport,
          ),
      },
    ],
  },
];
