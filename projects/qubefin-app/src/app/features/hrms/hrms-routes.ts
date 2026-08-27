import { Routes } from '@angular/router';

export const HrmsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'employees',
        loadComponent: () =>
          import('./pages/employee-component/employee-component').then((m) => m.EmployeeComponent),
      },
      {
        path: 'approval-workflows',
        loadComponent: () =>
          import('./pages/approval-workflow/approval-workflow').then((m) => m.ApprovalWorkflow),
        data: {
          title: 'Approval Workflows',
          subTitle: 'Configure the approval steps required for HRMS events.',
          icon: 'clipboard-check',
        },
      },
      {
        path: 'attendance-history',
        loadComponent: () =>
          import('./pages/attendance-history-component/attendance-history-component').then(
            (m) => m.AttendanceHistoryComponent,
          ),
      },
      {
        path: 'attendance-regularization',
        loadComponent: () =>
          import('./pages/attendance-regularizations/attendance-regularizations').then(
            (m) => m.AttendanceRegularizations,
          ),
      },
      {
        path: 'approval-regularization',
        loadComponent: () =>
          import('./pages/approval-regularizations/approval-regularizations').then(
            (m) => m.ApprovalRegularizations,
          ),
      },
      {
        path: 'leave-requests',
        loadComponent: () =>
          import('./pages/leave-request-component/leave-request-component').then(
            (m) => m.LeaveRequestComponent,
          ),
        data: {
          title: 'Leave Requests',
          subTitle: 'Manage Leave Requests',
          icon: 'apartment',
        },
      },
      {
        path: 'leave-approvals',
        loadComponent: () =>
          import('./pages/leave-approval-component/leave-approval-component').then(
            (m) => m.LeaveApprovalComponent,
          ),
        data: {
          title: 'Leave Approval',
          subTitle: 'Manage Leave Approvals',
          icon: 'apartment',
        },
      },
      {
        path: 'leave-prayers',
        loadComponent: () =>
          import('./pages/leave-prayer-component/leave-prayer-component').then(
            (m) => m.LeavePrayerComponent,
          ),
        data: {
          title: 'Leave Prayers',
          subTitle: 'Manage Leave Prayers',
          icon: 'zodiac-leo',
        },
      },
      {
        path: 'leave-prayer-approvals',
        loadComponent: () =>
          import('./pages/leave-prayer-approval-component/leave-prayer-approval-component').then(
            (m) => m.LeavePrayerApprovalComponent,
          ),
        data: {
          title: 'Leave Prayer Approvals',
          subTitle: 'Manage Leave Prayer Approvals',
          icon: 'zodiac-leo',
        },
      },
      {
        path: 'employee-attendance-history',
        loadComponent: () =>
          import('./pages/employee-attendance-history-component/employee-attendance-history-component').then(
            (m) => m.EmployeeAttendanceHistoryComponent,
          ),
      },
      {
        path: 'employee-lop-finalization',
        loadComponent: () =>
          import(
            './pages/employee-lop-finalization-component/employee-lop-finalization-component'
          ).then((c) => c.EmployeeLopFinalizationComponent),
        data: { breadcrumb: 'Employee LOP Finalization' },
      },
      {
        path: 'leave-fitness',
        loadComponent: () =>
          import(
            './pages/leave-fitness-component/leave-fitness-component'
          ).then((c) => c.LeaveFitnessComponent),
        data: { breadcrumb: 'Leave Fitness' },
      },
    ],
  },
];
