import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BRANCH_SURVEY_OPTIONS, IEconomicSection } from '../../../../../models/branch-survey';

type EconomicPercentKey =
  | 'agriculturePercent'
  | 'agriculturalLabour'
  | 'dairyLivestock'
  | 'smallBusiness'
  | 'pettyTrade'
  | 'cottageSmallIndustries'
  | 'transportActivities'
  | 'serviceHolders'
  | 'dailyWageEarners';

type EconomicTextKey =
  | 'mainCrop'
  | 'peakBusinessSeason'
  | 'leanSeason'
  | 'otherIncomeGeneratingActivities';

// Step 4 - Section D: Economic Profile
@Component({
  selector: 'qfin-economic-step',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './economic-step.html',
})
export class EconomicStep {
  readonly section = input.required<FieldTree<IEconomicSection>>();

  readonly conditionOptions = BRANCH_SURVEY_OPTIONS.economicCondition;

  // Every income activity is an estimate in percent.
  readonly percentFields: { key: EconomicPercentKey; label: string; icon: string }[] = [
    { key: 'agriculturePercent', label: 'Agriculture', icon: 'wheat' },
    { key: 'agriculturalLabour', label: 'Agricultural Labour', icon: 'users' },
    { key: 'dairyLivestock', label: 'Dairy / Livestock', icon: 'droplet' },
    { key: 'smallBusiness', label: 'Small Business', icon: 'store' },
    { key: 'pettyTrade', label: 'Petty Trade', icon: 'store' },
    { key: 'cottageSmallIndustries', label: 'Cottage / Small Industries', icon: 'factory' },
    { key: 'transportActivities', label: 'Transport Activities', icon: 'bus' },
    { key: 'serviceHolders', label: 'Service Holders', icon: 'building-2' },
    { key: 'dailyWageEarners', label: 'Daily Wage Earners', icon: 'banknote' },
  ];

  readonly textFields: { key: EconomicTextKey; label: string; icon: string }[] = [
    { key: 'mainCrop', label: 'Main Crop', icon: 'wheat' },
    { key: 'peakBusinessSeason', label: 'Peak Business Season', icon: 'calendar-clock' },
    { key: 'leanSeason', label: 'Lean Season', icon: 'calendar-clock' },
    { key: 'otherIncomeGeneratingActivities', label: 'Other Income Generating Activities', icon: 'coins' },
  ];
}
