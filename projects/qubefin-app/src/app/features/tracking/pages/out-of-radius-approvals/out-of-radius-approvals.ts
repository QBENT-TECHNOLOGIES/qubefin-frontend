import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { ApprovalStatus, OutOfRadiusRequest } from '../../models/approval-request';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { OutOfRadiusApprovalService } from '../../services/out-of-radius-approval-service';
import { OutOfRadiusApprovalStore } from '../../stores/out-of-radius-approval-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { centroid, DEFAULT_CENTER } from '../../utils/geo-utils';
import { MarkerContentCache } from '../../utils/marker-content';
import { pollWhileVisible } from '../../utils/poll';
import { ACTIVITY_LABEL, APPROVAL_STATUS, ROLE_LABEL } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { RemarksDialog, RemarksDialogData } from '../../components/shared/remarks-dialog/remarks-dialog';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';

@Component({
  selector: 'qfin-out-of-radius-approvals',
  imports: [DatePipe, DecimalPipe, LucideDynamicIcon, GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline, MapStatus, TrackingChip],
  templateUrl: './out-of-radius-approvals.html',
})
export class OutOfRadiusApprovals {
  readonly store = inject(OutOfRadiusApprovalStore);
  private readonly lookup = inject(TrackingLookupStore);
  private readonly service = inject(OutOfRadiusApprovalService);
  private readonly popups = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  readonly maps = inject(MapsLoaderService);

  readonly APPROVAL_STATUS = APPROVAL_STATUS;
  readonly ACTIVITY_LABEL = ACTIVITY_LABEL;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly tabs: { value: ApprovalStatus | null; label: string }[] = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: null, label: 'All' },
  ];
  private readonly markers = new MarkerContentCache();

  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => {
    const list = this.store.requests();
    return list.find((r) => r.id === this.selectedId()) ?? list[0] ?? null;
  });

  readonly mapCenter = computed(() => {
    const r = this.selected();
    if (!r) return DEFAULT_CENTER;
    return centroid([r.destination, ...(r.branchLocation ? [r.branchLocation] : [])], r.destination);
  });
  readonly radiusKm = computed(() => {
    const r = this.selected();
    return (r && this.lookup.branchById().get(r.branchId)?.operatingRadiusKm) || 30;
  });
  readonly branchPin = computed(() => this.markers.pin('branch', 'B', '#0F172A', { small: true }));
  readonly destPin = computed(() => this.markers.pin('dest', '!', '#7C3AED', { selected: true }));

  readonly circleOptions: google.maps.CircleOptions = { strokeColor: '#16A34A', strokeWeight: 1.5, fillColor: '#16A34A', fillOpacity: 0.06, clickable: false };
  readonly lineOptions: google.maps.PolylineOptions = {
    strokeOpacity: 0,
    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#7C3AED', scale: 3 }, offset: '0', repeat: '14px' }],
    clickable: false,
  };
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false };

  constructor() {
    this.maps.load().catch(() => undefined);
    pollWhileVisible(() => this.store.refresh());
  }

  setTab(v: ApprovalStatus | null) {
    this.store.status.set(v);
    this.selectedId.set(null);
  }

  decide(r: OutOfRadiusRequest, approved: boolean) {
    this.dialog
      .open<RemarksDialog, RemarksDialogData, string>(RemarksDialog, {
        data: {
          title: approved ? `Approve ${r.requestNo}?` : `Reject ${r.requestNo}?`,
          message: `${r.employeeName} → ${r.destinationName}, ${r.distanceFromBranchKm} km from ${r.branchName} on ${r.requestedForDate}.`,
          label: approved ? 'Conditions / remarks' : 'Reason for rejection',
          confirmText: approved ? 'Approve' : 'Reject',
          icon: approved ? 'shield-check' : 'circle-x',
          tone: approved ? 'success' : 'danger',
          required: !approved,
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((remarks) => {
        if (remarks === undefined) return;
        this.service.decide(r.id, { approved, remarks }).subscribe(() => {
          this.popups.toast('success', approved ? 'Request approved' : 'Request rejected');
          this.store.refresh();
        });
      });
  }
}
