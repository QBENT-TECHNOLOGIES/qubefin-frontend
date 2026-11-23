import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  BRANCH_SURVEY_OPTIONS,
  IAccessibilitySection,
  ITransportationSection,
} from '../../../../../models/branch-survey';

// Step 2 - Section B: Accessibility Assessment and Section F: Transportation Facilities
@Component({
  selector: 'qfin-accessibility-step',
  imports: [FormField, MatFormFieldModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './accessibility-step.html',
})
export class AccessibilityStep {
  readonly accessibility = input.required<FieldTree<IAccessibilitySection>>();
  readonly transportation = input.required<FieldTree<ITransportationSection>>();

  readonly ratingOptions = BRANCH_SURVEY_OPTIONS.rating;
  readonly yesNoOptions = BRANCH_SURVEY_OPTIONS.yesNo;

  readonly accessibilityFields: { key: keyof IAccessibilitySection; label: string; icon: string }[] = [
    { key: 'roadCondition', label: 'Road Condition', icon: 'route' },
    { key: 'publicTransportAvailability', label: 'Public Transport Availability', icon: 'bus' },
    { key: 'railwayConnectivity', label: 'Railway Connectivity', icon: 'train-front' },
    { key: 'busConnectivity', label: 'Bus Connectivity', icon: 'bus' },
    { key: 'mobileNetworkCoverage', label: 'Mobile Network Coverage', icon: 'smartphone' },
    { key: 'internetAvailability', label: 'Internet Availability', icon: 'wifi' },
    { key: 'electricitySupply', label: 'Electricity Supply', icon: 'zap' },
    { key: 'drinkingWaterAvailability', label: 'Drinking Water Availability', icon: 'droplet' },
    { key: 'safetyOfArea', label: 'Safety of Area', icon: 'shield-alert' },
  ];

  readonly transportationFields: { key: keyof ITransportationSection; label: string; icon: string }[] = [
    { key: 'railConnectivity', label: 'Rail Connectivity', icon: 'train-front' },
    { key: 'busConnectivityAvailable', label: 'Bus Connectivity', icon: 'bus' },
    { key: 'autoTotoAvailability', label: 'Auto / Toto Availability', icon: 'route' },
    { key: 'roadAccessibility', label: 'Road Accessibility', icon: 'route' },
    { key: 'accessibilityByMotorCycle', label: 'Motorcycle Accessibility Throughout the Year', icon: 'route' },
  ];
}
