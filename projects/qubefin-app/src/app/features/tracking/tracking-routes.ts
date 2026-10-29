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
        data: { title: 'Jobs & Tasks', subTitle: 'Create jobs with tasks, assign, transfer and audit', icon: 'briefcase' },
      },
      {
        path: 'od-follow-up', // URL kept: the backend menu/page record is keyed by this path
        loadComponent: () => import('./pages/od-members/od-members').then((m) => m.OdMembers),
        data: { title: 'OD Members', subTitle: 'Add OD members to a job', icon: 'indian-rupee' },
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./pages/job-monitoring/job-monitoring').then((m) => m.JobMonitoring),
        data: { title: 'Job Monitoring', subTitle: 'Task points, completion photos and location checks', icon: 'list-checks' },
      },
      {
        path: 'live-map',
        loadComponent: () => import('./pages/live-map/live-map').then((m) => m.LiveMap),
        data: { title: 'Live Tracking', subTitle: 'Where the field team is right now', icon: 'map' },
      },
      {
        path: 'route-history',
        loadComponent: () => import('./pages/route-history/route-history').then((m) => m.RouteHistory),
        data: { title: 'Tracking History', subTitle: 'Day-wise route, stops and distance travelled', icon: 'route' },
      },
      {
        path: 'alerts',
        loadComponent: () => import('./pages/tracking-alerts/tracking-alerts').then((m) => m.TrackingAlerts),
        data: { title: 'Alerts', subTitle: 'Rule violations sent to reporting officials', icon: 'siren' },
      },
      {
        path: 'approvals',
        loadComponent: () => import('./pages/out-of-radius-approvals/out-of-radius-approvals').then((m) => m.OutOfRadiusApprovals),
        data: { title: 'Approvals', subTitle: 'Field work beyond the branch radius', icon: 'shield-check' },
      },
      {
        path: 'geo-tags',
        loadComponent: () => import('./pages/geo-tag-registry/geo-tag-registry').then((m) => m.GeoTagRegistry),
        data: { title: 'Geo Tags/POIs', subTitle: 'Branches, centres, member and employee homes', icon: 'map-pinned' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/tracking-settings/tracking-settings').then((m) => m.TrackingSettingsPage),
        data: { title: 'Settings', subTitle: 'Thresholds, exceptions and auto-allocation', icon: 'settings' },
      },
    ],
  },
];
