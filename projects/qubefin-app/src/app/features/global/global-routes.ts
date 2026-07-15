import { Routes } from '@angular/router';

export const GlobalRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'administrative-units',
        loadComponent: () =>
          import('./pages/administrative-unit/administrative-unit').then(
            (m) => m.AdministrativeUnitPage,
          ),
        data: {
          title: 'Administrative Units',
          subTitle: 'Manage and organize administrative units within your organization.',
          icon: 'apartment',
        },
      },
      {
        path: 'organization-units',
        loadComponent: () =>
          import('./pages/organization-unit/organization-unit').then((m) => m.OrganizationUnitPage),
        data: {
          title: 'Organization Units',
          subTitle: 'Manage and organize Organization units within your organization.',
          icon: 'apartment',
        },
      },
      {
        path: 'survey-committees',
        loadComponent: () =>
          import('./pages/survey-committee-unit/survey-committee-unit').then(
            (m) => m.SurveyCommitteeUnit,
          ),
        data: {
          title: 'Survey Committee Units',
          subTitle: 'Manage and organize survey committee units within your organization.',
          icon: 'apartment',
        },
      },
    ],
  },
];
