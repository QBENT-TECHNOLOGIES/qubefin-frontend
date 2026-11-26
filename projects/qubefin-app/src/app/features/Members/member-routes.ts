import { Routes } from '@angular/router';

export const MemberRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'members',
        loadComponent: () =>
          import('./pages/member-component/member-component').then((m) => m.MemberComponent),
        data: {
          title: 'Members',
          subTitle: 'Manage Members',
          icon: 'users',
        },
      },
    ],
  },
];
