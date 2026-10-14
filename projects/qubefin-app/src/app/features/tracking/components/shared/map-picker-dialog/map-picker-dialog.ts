import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoogleMap, MapAdvancedMarker, MapCircle } from '@angular/google-maps';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { GeoPoint } from '../../../models/geo';
import { MapsLoaderService } from '../../../services/maps-loader.service';
import { DEFAULT_CENTER, distanceMeters, formatCoords, formatDistance } from '../../../utils/geo-utils';
import { MarkerContentCache } from '../../../utils/marker-content';
import { MapStatus } from '../map-status/map-status';

export interface MapPickerDialogData {
  title: string;
  subtitle?: string;
  location: GeoPoint | null;
  radiusMeters: number;
  /** Where to centre the map if there is no location yet (e.g. the branch). */
  fallbackCenter?: GeoPoint | null;
  allowRadius?: boolean;
  /** Changing an existing location must be justified for the audit trail. */
  requireReason?: boolean;
  color?: string;
}

export interface MapPickerDialogResult {
  location: GeoPoint;
  radiusMeters: number;
  reason: string;
}

@Component({
  selector: 'qfin-map-picker-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    MapStatus,
  ],
  templateUrl: './map-picker-dialog.html',
})
export class MapPickerDialog {
  readonly data = inject<MapPickerDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MapPickerDialog, MapPickerDialogResult>);
  readonly maps = inject(MapsLoaderService);

  private readonly markers = new MarkerContentCache();
  readonly formatCoords = formatCoords;

  readonly location = signal<GeoPoint | null>(this.data.location);
  readonly radius = signal(this.data.radiusMeters);
  readonly reason = signal('');
  readonly search = signal('');
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly center = signal<GeoPoint>(this.data.location ?? this.data.fallbackCenter ?? DEFAULT_CENTER);

  readonly movedBy = computed(() => {
    const o = this.data.location;
    const n = this.location();
    return o && n ? formatDistance(distanceMeters(o, n)) : null;
  });

  readonly reasonRequired = computed(() => (this.data.requireReason ?? true) && !!this.data.location);
  readonly valid = computed(
    () => !!this.location() && this.radius() > 0 && (!this.reasonRequired() || this.reason().trim().length >= 3),
  );

  readonly mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
  };

  constructor() {
    this.maps.load().catch(() => undefined);
  }

  pinContent() {
    return this.markers.pin('picker', '', this.data.color ?? '#16C784', { selected: true });
  }

  onMapClick(e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) {
    if (e.latLng) this.location.set({ lat: +e.latLng.lat().toFixed(6), lng: +e.latLng.lng().toFixed(6) });
  }

  onDragEnd(e: google.maps.MapMouseEvent) {
    if (e.latLng) this.location.set({ lat: +e.latLng.lat().toFixed(6), lng: +e.latLng.lng().toFixed(6) });
  }

  /** Needs the Geocoding API enabled on the key. */
  async findAddress() {
    const q = this.search().trim();
    if (!q || this.maps.status() !== 'ready') return;
    this.searching.set(true);
    this.searchError.set(null);
    try {
      const res = await new google.maps.Geocoder().geocode({ address: q, region: 'in' });
      const hit = res.results[0]?.geometry.location;
      if (!hit) throw new Error('none');
      const p = { lat: +hit.lat().toFixed(6), lng: +hit.lng().toFixed(6) };
      this.location.set(p);
      this.center.set(p);
    } catch {
      this.searchError.set('No match found (check that the Geocoding API is enabled for this key).');
    } finally {
      this.searching.set(false);
    }
  }

  useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        this.location.set(p);
        this.center.set(p);
      },
      () => this.searchError.set('Browser location is blocked or unavailable.'),
    );
  }

  setManual(lat: string, lng: string) {
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
      this.location.set({ lat: la, lng: ln });
      this.center.set({ lat: la, lng: ln });
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (!this.valid()) return;
    this.dialogRef.close({ location: this.location()!, radiusMeters: this.radius(), reason: this.reason().trim() || 'Initial geo-tag' });
  }
}
