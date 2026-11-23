import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { AdministrativeUnitCascade } from '../../../../administrative-unit-cascade/administrative-unit-cascade';
import { AdministrativeUnitService } from '../../../../../services/administrative-unit-service';
import { BRANCH_SURVEY_OPTIONS, IGeographicSection } from '../../../../../models/branch-survey';
import { IPoliceStationList } from '../../../../../models/police-sation';

// Step 1 - Section A: Geographic Information
@Component({
  selector: 'qfin-geographic-step',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  templateUrl: './geographic-step.html',
})
export class GeographicStep {
  readonly section = input.required<FieldTree<IGeographicSection>>();

  private readonly administrativeUnitService = inject(AdministrativeUnitService);
  private readonly alertService = inject(AlertService);

  readonly administrativeStatusOptions = BRANCH_SURVEY_OPTIONS.administrativeStatus;
  readonly policeStations = signal<IPoliceStationList[]>([]);

  // Police stations of the selected district. A saved police station is kept in the list even if the list does not contain it.
  readonly policeStationOptions = computed(() => {
    const names = this.policeStations().map((station) => station.name);
    const savedName = this.section().policeStation().value();
    return savedName && !names.includes(savedName) ? [savedName, ...names] : names;
  });

  constructor() {
    // The Geo Tag is always "latitude, longitude", so the surveyor never types it.
    effect(() => {
      const section = this.section();
      // People who can only view the form must not change anything.
      if (section.latitude().readonly()) {
        return;
      }

      const latitude = section.latitude().value();
      const longitude = section.longitude().value();
      const geoTag = latitude != null && longitude != null ? `${latitude}, ${longitude}` : '';

      if (section.geoTag().value() !== geoTag) {
        section.geoTag().value.set(geoTag);
      }
    });
  }

  protected onAreaChanged(administrativeUnitId: string) {
    this.section().administrativeUnitId().value.set(administrativeUnitId);
  }

  // Runs when the district is restored or changed, to load its police stations.
  protected onDistrictChanged(districtId: string) {
    if (!districtId) {
      this.policeStations.set([]);
      return;
    }

    this.administrativeUnitService.getPoliceStationByDistrict(districtId).subscribe({
      next: (stations) => this.policeStations.set(stations as IPoliceStationList[]),
    });
  }

  // The user picked another district, so the old police station no longer applies.
  protected onDistrictChangedByUser() {
    this.section().policeStation().value.set(null);
  }

  protected useCurrentLocation() {
    if (!navigator.geolocation) {
      this.alertService.error('Oops ....', 'Your browser does not support location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.section().latitude().value.set(Number(position.coords.latitude.toFixed(6)));
        this.section().longitude().value.set(Number(position.coords.longitude.toFixed(6)));
      },
      () => {
        this.alertService.error(
          'Oops ....',
          'Could not get your location. Please allow location access or enter it manually.',
        );
      },
    );
  }
}
