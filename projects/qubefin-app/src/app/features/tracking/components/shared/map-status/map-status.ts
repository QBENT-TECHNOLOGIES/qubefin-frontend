import { Component, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { MapsLoaderService } from '../../../services/maps-loader.service';

/** Placeholder shown in place of <google-map> while the API loads or when it cannot load. */
@Component({
  selector: 'qfin-map-status',
  imports: [LucideDynamicIcon],
  templateUrl: './map-status.html',
})
export class MapStatus {
  readonly maps = inject(MapsLoaderService);
  readonly height = input('100%');
}
