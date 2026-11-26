import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideDynamicIcon } from '@lucide/angular';

// The place where a survey was done: a map in a frame and a button that opens Google Maps.
@Component({
  selector: 'qfin-location-map',
  imports: [LucideDynamicIcon],
  templateUrl: './location-map.html',
})
export class LocationMap {
  private readonly sanitizer = inject(DomSanitizer);

  readonly latitude = input<number | null | undefined>(null);
  readonly longitude = input<number | null | undefined>(null);
  readonly title = input<string>('Survey location');

  readonly hasLocation = computed(() => this.latitude() != null && this.longitude() != null);

  // Google Maps embed, centred on the saved latitude and longitude.
  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.hasLocation()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${this.latitude()},${this.longitude()}&z=16&output=embed`,
    );
  });

  protected openInMaps() {
    if (!this.hasLocation()) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${this.latitude()},${this.longitude()}`,
      '_blank',
      'noopener',
    );
  }
}