import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BRANCH_SURVEY_OPTIONS, IRiskSection } from '../../../../../models/branch-survey';

// Step 7 - Section J: Risk Assessment
@Component({
  selector: 'qfin-risk-step',
  imports: [FormField, MatFormFieldModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './risk-step.html',
})
export class RiskStep {
  readonly section = input.required<FieldTree<IRiskSection>>();

  // Each group has its own scale of choices.
  readonly riskGroups: {
    title: string;
    options: string[];
    fields: { key: keyof IRiskSection; label: string; icon: string }[];
  }[] = [
    {
      title: 'Natural Risks',
      options: BRANCH_SURVEY_OPTIONS.naturalRisk,
      fields: [
        { key: 'floodRisk', label: 'Flood', icon: 'droplet' },
        { key: 'cycloneRisk', label: 'Cyclone', icon: 'cloud-rain' },
        { key: 'landslideRisk', label: 'Landslide', icon: 'triangle-alert' },
        { key: 'droughtRisk', label: 'Drought', icon: 'triangle-alert' },
      ],
    },
    {
      title: 'Social Risks',
      options: BRANCH_SURVEY_OPTIONS.riskLevel,
      fields: [
        { key: 'politicalDisturbanceRisk', label: 'Political Disturbance', icon: 'shield-alert' },
        { key: 'communalIssuesRisk', label: 'Communal Issues', icon: 'users' },
        { key: 'migrationRisk', label: 'Migration', icon: 'route' },
      ],
    },
    {
      title: 'Business Risks',
      options: BRANCH_SURVEY_OPTIONS.riskLevel,
      fields: [
        { key: 'multipleLendingRisk', label: 'Multiple Lending', icon: 'coins' },
        { key: 'collectionRisk', label: 'Collection Risk', icon: 'banknote' },
        { key: 'fraudRisk', label: 'Fraud Risk', icon: 'shield-alert' },
        { key: 'competitionRisk', label: 'Competition Risk', icon: 'scale' },
      ],
    },
  ];
}
