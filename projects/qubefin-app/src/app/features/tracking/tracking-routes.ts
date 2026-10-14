import { Routes } from '@angular/router';

/** /secure/tracking/* — employee task assignment and GPS monitoring (web side). */
export const TrackingRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tasks' },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/task-assignment/task-assignment').then((m) => m.TaskAssignment),
        data: { title: 'Task Assignment', subTitle: 'Assign, reassign and audit field tasks', icon: 'clipboard-list' },
      },
      {
        path: 'od-follow-up',
        loadComponent: () => import('./pages/od-follow-up/od-follow-up').then((m) => m.OdFollowUp),
        data: { title: 'OD Follow-up', subTitle: 'Assign overdue customer visits', icon: 'indian-rupee' },
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./pages/task-monitoring/task-monitoring').then((m) => m.TaskMonitoring),
        data: { title: 'Task Monitoring', subTitle: 'Arrival, completion and location checks', icon: 'list-checks' },
      },
      {
        path: 'live-map',
        loadComponent: () => import('./pages/live-map/live-map').then((m) => m.LiveMap),
        data: { title: 'Live Map', subTitle: 'Where the field team is right now', icon: 'map' },
      },
      {
        path: 'alerts',
        loadComponent: () => import('./pages/tracking-alerts/tracking-alerts').then((m) => m.TrackingAlerts),
        data: { title: 'Tracking Alerts', subTitle: 'Rule violations sent to reporting officials', icon: 'siren' },
      },
      {
        path: 'approvals',
        loadComponent: () => import('./pages/out-of-radius-approvals/out-of-radius-approvals').then((m) => m.OutOfRadiusApprovals),
        data: { title: 'Out-of-Radius Approvals', subTitle: 'Field work beyond the branch radius', icon: 'shield-check' },
      },
      {
        path: 'geo-tags',
        loadComponent: () => import('./pages/geo-tag-registry/geo-tag-registry').then((m) => m.GeoTagRegistry),
        data: { title: 'Geo-tag Registry', subTitle: 'Branches, centres, customer and employee homes', icon: 'map-pinned' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/tracking-settings/tracking-settings').then((m) => m.TrackingSettingsPage),
        data: { title: 'Tracking Settings', subTitle: 'Thresholds, exceptions and auto-allocation', icon: 'settings' },
      },
    ],
  },
];
