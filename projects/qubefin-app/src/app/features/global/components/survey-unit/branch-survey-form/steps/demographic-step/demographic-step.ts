import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BRANCH_SURVEY_OPTIONS, IDemographicSection } from '../../../../../models/branch-survey';

type DemographicNumberKey = Exclude<keyof IDemographicSection, 'migrationTrend'>;

// Step 3 - Section C: Demographic Profile
@Component({
  selector: 'qfin-demographic-step',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './demographic-step.html',
})
export class DemographicStep {
  readonly section = input.required<FieldTree<IDemographicSection>>();

  readonly ratingOptions = BRANCH_SURVEY_OPTIONS.rating;

  readonly numberFields: { key: DemographicNumberKey; label: string; icon: string; unit?: string }[] = [
    { key: 'estimatedPopulation', label: 'Estimated Population', icon: 'users' },
    { key: 'numberOfHouseholds', label: 'Number of Households', icon: 'map-pin-house' },
    { key: 'averageFamilySize', label: 'Average Family Size', icon: 'users' },
    { key: 'femalePopulationPercent', label: 'Female Population', icon: 'percent', unit: '%' },
    { key: 'literacyRate', label: 'Literacy Rate', icon: 'percent', unit: '%' },
    { key: 'workingPopulation', label: 'Working Population', icon: 'users' },
    { key: 'minorityPopulationPercent', label: 'Minority Population', icon: 'percent', unit: '%' },
    { key: 'scheduledCastePercent', label: 'Scheduled Caste', icon: 'percent', unit: '%' },
    { key: 'scheduledTribePercent', label: 'Scheduled Tribe', icon: 'percent', unit: '%' },
  ];
}
