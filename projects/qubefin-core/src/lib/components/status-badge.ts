import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'qfin-status-badge-component',
    standalone: true,
    templateUrl: './status-badge.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponentComponent {

    @Input() text = '';

    get classes(): string {
        const status = this.text.trim().toLowerCase();

        const map: Record<string, string> = {
            active: 'bg-green-100 text-green-700 ring-green-600/20',
            inactive: 'bg-red-100 text-red-700 ring-red-600/20',

            approved: 'bg-green-100 text-green-700 ring-green-600/20',
            rejected: 'bg-red-100 text-red-700 ring-red-600/20',
            pending: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',

            draft: 'bg-slate-100 text-slate-700 ring-slate-600/20',
            processing: 'bg-blue-100 text-blue-700 ring-blue-600/20',
            shipped: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
            delivered: 'bg-green-100 text-green-700 ring-green-600/20',
            cancelled: 'bg-red-100 text-red-700 ring-red-600/20',

            enabled: 'bg-green-100 text-green-700 ring-green-600/20',
            disabled: 'bg-gray-100 text-gray-700 ring-gray-600/20'
        };

        return map[status] ?? 'bg-gray-100 text-gray-700 ring-gray-600/20';
    }
}