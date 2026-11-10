import { Routes } from '@angular/router';

export const CollectionRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'bc-group-collection',
                loadComponent: () => import('./pages/bc-group-collection/bc-group-collection').then(m => m.BcGroupCollection),
                data: {
                    title: 'BC Group Collection',
                    subTitle: 'Manage collections for BC groups.',
                    icon: 'payments'
                }
            },
            {
                path: 'bc-payment-collection',
                loadComponent: () => import('./pages/bc-payment-collection/bc-payment-collection').then(m => m.BcPaymentCollection),
                data: {
                    title: 'BC Payment Collection',
                    subTitle: 'Manage BC payment collections.',
                    icon: 'payments'
                }
            }
        ]
    }
];
