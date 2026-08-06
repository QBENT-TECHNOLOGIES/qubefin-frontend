import { Routes } from '@angular/router';

export const HrmsRoutes: Routes = [
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
                path: 'employee-components',
                loadComponent: () => import('./pages/employee-component/employee-component').then(m => m.EmployeeComponent)
            },
            {
                path: 'approval-workflow-events',
                loadComponent: () => import('./pages/approval-workflow-event/approval-workflow-event').then(m => m.ApprovalWorkflowEvent),
                data: {
                    title: 'Approval Workflow Events',
                    subTitle: 'Configure the approval steps required for HRMS events.',
                    icon: 'clipboard-check'
                }
            }
        ]
    }
];
