import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { ExceptionRule, TrackingException, TrackingSettings } from '../../models/tracking-settings';
import { TrackingSettingsService } from '../../services/tracking-settings-service';
import { TrackingSettingsStore } from '../../stores/tracking-settings-store';
import { TrkTimeField } from '../../components/shared/date-field/trk-time-field';

@Component({
  selector: 'qfin-tracking-settings',
  imports: [DatePipe, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule, LucideDynamicIcon, TrkTimeField],
  templateUrl: './tracking-settings.html',
})
export class TrackingSettingsPage {
  readonly store = inject(TrackingSettingsStore);
  private readonly service = inject(TrackingSettingsService);
  private readonly popups = inject(AlertService);

  readonly ruleOptions: { value: ExceptionRule; label: string }[] = [
    { value: 'Stationary', label: 'Stationary > threshold' },
    { value: 'NearHome', label: 'Near home' },
    { value: 'OutsideBranchRadius', label: 'Outside branch radius' },
    { value: 'GpsOff', label: 'GPS off' },
    { value: 'All', label: 'All location alerts' },
  ];

  /** Editable working copy; saved as a whole. */
  readonly draft = signal<TrackingSettings | null>(null);
  readonly saving = signal(false);
  readonly dirty = computed(() => {
    const d = this.draft();
    const s = this.store.settings();
    return !!d && !!s && JSON.stringify(d) !== JSON.stringify(s);
  });

  readonly thresholds: { key: keyof TrackingSettings; label: string; unit: string; hint: string; min: number }[] = [
    { key: 'homeRadiusMeters', label: 'Near-home radius', unit: 'm', hint: 'Alert when an employee is this close to their registered home during duty.', min: 10 },
    { key: 'stationaryMinutes', label: 'Stationary while travelling', unit: 'min', hint: 'Alert the CO and reporting officials after this long without moving.', min: 5 },
    { key: 'branchRadiusKm', label: 'Branch operating radius', unit: 'km', hint: 'Travel beyond this needs prior approval.', min: 1 },
    { key: 'locationMatchRadiusMeters', label: 'Task location match', unit: 'm', hint: 'Default distance accepted for arrival and completion photos.', min: 10 },
    { key: 'gpsOffGraceMinutes', label: 'GPS-off grace period', unit: 'min', hint: 'Wait this long before raising a GPS-off alert.', min: 0 },
    { key: 'stopMinMinutes', label: 'Stop – minimum halt', unit: 'min', hint: 'A halt this long or longer is listed as a stop in the day route.', min: 1 },
    { key: 'stopRadiusMeters', label: 'Stop – tolerance', unit: 'm', hint: 'Added to a task point’s radius when deciding if a stop is designated.', min: 10 },
    { key: 'positionIntervalSeconds', label: 'Position update interval', unit: 'sec', hint: 'How often the mobile app sends a location fix.', min: 15 },
  ];

  constructor() {
    effect(() => {
      const s = this.store.settings();
      if (s && !this.draft()) this.draft.set(structuredClone(s));
    });
  }

  num(key: keyof TrackingSettings): number {
    return (this.draft()?.[key] as number) ?? 0;
  }

  set<K extends keyof TrackingSettings>(key: K, value: TrackingSettings[K]) {
    this.draft.update((d) => (d ? { ...d, [key]: value } : d));
  }

  updateException(id: string, patch: Partial<TrackingException>) {
    this.draft.update((d) => (d ? { ...d, exceptions: d.exceptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : d));
  }

  addException() {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `x-${Date.now()}`;
    this.draft.update((d) =>
      d ? { ...d, exceptions: [...d.exceptions, { id, name: '', appliesTo: 'Stationary', description: '', fromTime: null, toTime: null, isActive: true }] } : d,
    );
  }

  removeException(id: string) {
    this.draft.update((d) => (d ? { ...d, exceptions: d.exceptions.filter((x) => x.id !== id) } : d));
  }

  reset() {
    const s = this.store.settings();
    if (s) this.draft.set(structuredClone(s));
  }

  save() {
    const d = this.draft();
    if (!d) return;
    if (d.exceptions.some((x) => !x.name.trim())) {
      this.popups.warning('Name every exception', 'Each operational exception needs a short name.');
      return;
    }
    this.saving.set(true);
    this.service.save(d).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.draft.set(structuredClone(saved));
        this.store.refresh();
        this.popups.toast('success', 'Tracking settings saved');
      },
      error: () => this.saving.set(false),
    });
  }
}
