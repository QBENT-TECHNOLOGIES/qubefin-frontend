import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle } from '@angular/google-maps';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, DocumentModalService } from 'qubefin-core';
import { GeoTag, GeoTagKind } from '../../models/geo-tag';
import { GeoTagService } from '../../services/geo-tag-service';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { GeoTagStore } from '../../stores/geo-tag-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { DEFAULT_CENTER, centroid, formatCoords, formatDistance, googleMapsLink } from '../../utils/geo-utils';
import { MarkerContentCache } from '../../utils/marker-content';
import { GEO_TAG_KIND } from '../../utils/tracking-labels';
import { needsVerifiedLocation } from '../../utils/job-rules';
import { MapPickerDialog, MapPickerDialogData, MapPickerDialogResult } from '../../components/shared/map-picker-dialog/map-picker-dialog';
import { MapStatus } from '../../components/shared/map-status/map-status';

/** Kinds whose location can be changed from the web. Member homes are captured on the mobile app with a photo. */
const EDITABLE: ReadonlySet<GeoTagKind> = new Set(['Branch', 'GroupCentre', 'EmployeeHome']);

@Component({
  selector: 'qfin-geo-tag-registry',
  imports: [DatePipe, MatFormFieldModule, MatSelectModule, MatTooltipModule, LucideDynamicIcon, GoogleMap, MapAdvancedMarker, MapCircle, MapStatus],
  templateUrl: './geo-tag-registry.html',
})
export class GeoTagRegistry {
  readonly store = inject(GeoTagStore);
  readonly lookup = inject(TrackingLookupStore);
  readonly maps = inject(MapsLoaderService);
  private readonly service = inject(GeoTagService);
  private readonly popups = inject(AlertService);
  private readonly documents = inject(DocumentModalService);
  private readonly dialog = inject(MatDialog);

  readonly GEO_TAG_KIND = GEO_TAG_KIND;
  readonly kinds = Object.keys(GEO_TAG_KIND) as GeoTagKind[];
  readonly formatCoords = formatCoords;
  readonly formatDistance = formatDistance;
  readonly googleMapsLink = googleMapsLink;
  private readonly markers = new MarkerContentCache();

  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => this.store.tags().find((t) => t.id === this.selectedId()) ?? null);
  readonly editable = computed(() => EDITABLE.has(this.store.kind()));

  readonly tagged = computed(() => this.store.tags().filter((t) => !!t.location));
  readonly mapCenter = computed(() => this.selected()?.location ?? centroid(this.tagged().map((t) => t.location!), DEFAULT_CENTER));
  readonly mapZoom = computed(() => (this.selected()?.location ? 15 : this.store.kind() === 'Branch' ? 8 : 10));

  readonly pins = computed(() => {
    const color = GEO_TAG_KIND[this.store.kind()].color;
    return this.tagged().map((t) => ({
      id: t.id,
      position: t.location!,
      title: `${t.name} · ${t.refCode}`,
      content: this.markers.pin(`g-${t.id}`, '', color, { small: t.id !== this.selectedId(), selected: t.id === this.selectedId() }),
    }));
  });

  readonly circleOptions = computed<google.maps.CircleOptions>(() => {
    const c = GEO_TAG_KIND[this.store.kind()].color;
    return { strokeColor: c, strokeWeight: 1.5, fillColor: c, fillOpacity: 0.12, clickable: false };
  });
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true, clickableIcons: false };

  constructor() {
    this.maps.load().catch(() => undefined);
  }

  setKind(kind: GeoTagKind) {
    this.store.kind.set(kind);
    this.selectedId.set(null);
  }

  radiusLabel(t: GeoTag) {
    return t.kind === 'Branch' ? `${t.radiusMeters / 1000} km operating radius` : `${t.radiusMeters} m match radius`;
  }

  edit(t: GeoTag) {
    const branch = this.lookup.branchById().get(t.branchId);
    this.dialog
      .open<MapPickerDialog, MapPickerDialogData, MapPickerDialogResult>(MapPickerDialog, {
        data: {
          title: t.location ? `Change location – ${t.name}` : `Geo-tag ${t.name}`,
          subtitle: `${GEO_TAG_KIND[t.kind].label.replace(/s$/, '')} · ${t.refCode} · ${t.branchName}`,
          location: t.location,
          radiusMeters: t.radiusMeters,
          fallbackCenter: branch?.location ?? null,
          allowRadius: true,
          requireReason: true,
          color: GEO_TAG_KIND[t.kind].color,
        },
        panelClass: 'glass-modal',
        maxWidth: '96vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.service.update(t.id, { location: res.location, radiusMeters: res.radiusMeters, reason: res.reason }).subscribe(() => {
          this.popups.toast(
            'success',
            needsVerifiedLocation(t.kind) ? 'Location saved. It must be verified from the mobile app before it can get tasks.' : 'Location saved',
          );
          this.store.refresh();
          this.lookup.refresh();
          this.selectedId.set(t.id);
        });
      });
  }

  /** Groups, members and OD members need a verified location (from the mobile app) before they can get tasks. */
  unverified(t: GeoTag) {
    return !!t.location && !t.verified && needsVerifiedLocation(t.kind);
  }

  openPhoto(t: GeoTag) {
    if (t.photoUrl) this.documents.open({ url: t.photoUrl, documentName: `${t.refCode}-geotag`, extension: 'png', downloadAccess: true });
  }
}
