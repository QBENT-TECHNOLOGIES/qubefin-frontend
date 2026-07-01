import { Routes } from '@angular/router';

export const HomeRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
                data: {
                    title: 'Dashboard',
                    subTitle: 'Track your organization\'s performance with real-time operational and financial insights.',
                    icon: 'dashboard'
                }
            },
            {
                path: 'profile',
                loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
                data: {
                    title: 'Profile',
                    subTitle: 'Manage your personal information and settings.',
                    icon: 'person'
                }
            }
        ]
    }
];