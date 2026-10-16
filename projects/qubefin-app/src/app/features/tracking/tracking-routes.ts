import { Routes } from '@angular/router';

/** /secure/tracking/* — employee task assignment and GPS monitoring (web side). */
export const TrackingRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'jobs' },
      // Old Phase-1 link; tasks now live inside jobs.
      { path: 'tasks', pathMatch: 'full', redirectTo: 'jobs' },
      {
        path: 'jobs',
        loadComponent: () => import('./pages/jobs/jobs').then((m) => m.Jobs),
        data: { title: 'Jobs', subTitle: 'Create jobs with tasks, assign, transfer and audit', icon: 'briefcase' },
      },
      {
        path: 'od-follow-up',
        loadComponent: () => import('./pages/od-follow-up/od-follow-up').then((m) => m.OdFollowUp),
        data: { title: 'OD Follow-up', subTitle: 'Add overdue customers to a job', icon: 'indian-rupee' },
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./pages/job-monitoring/job-monitoring').then((m) => m.JobMonitoring),
        data: { title: 'Job Monitoring', subTitle: 'Task points, completion photos and location checks', icon: 'list-checks' },
      },
      {
        path: 'live-map',
        loadComponent: () => import('./pages/live-map/live-map').then((m) => m.LiveMap),
        data: { title: 'Live Map', subTitle: 'Where the field team is right now', icon: 'map' },
      },
      {
        path: 'route-history',
        loadComponent: () => import('./pages/route-history/route-history').then((m) => m.RouteHistory),
        data: { title: 'Day Route', subTitle: 'Day-wise route, stops and distance travelled', icon: 'route' },
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
