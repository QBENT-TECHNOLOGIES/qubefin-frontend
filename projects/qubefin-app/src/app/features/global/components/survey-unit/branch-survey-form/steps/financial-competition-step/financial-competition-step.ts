import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  BRANCH_SURVEY_OPTIONS,
  ICompetitorRow,
  IFinancialInclusionSection,
  MAX_COMPETITORS,
} from '../../../../../models/branch-survey';

type FinancialNumberKey = Exclude<keyof IFinancialInclusionSection, 'digitalPaymentAcceptance'>;

// Step 6 - Section G: Financial Inclusion Status and Section H: Microfinance Competition Analysis
@Component({
  selector: 'qfin-financial-competition-step',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './financial-competition-step.html',
})
export class FinancialCompetitionStep {
  readonly financialInclusion = input.required<FieldTree<IFinancialInclusionSection>>();
  readonly competitors = input.required<FieldTree<ICompetitorRow[]>>();

  readonly yesNoOptions = BRANCH_SURVEY_OPTIONS.yesNo;
  readonly maxCompetitors = MAX_COMPETITORS;

  readonly numberFields: { key: FinancialNumberKey; label: string; icon: string }[] = [
    { key: 'numberOfBanks', label: 'Number of Banks', icon: 'landmark' },
    { key: 'numberOfRegionalRuralBanks', label: 'Number of Regional Rural Banks', icon: 'landmark' },
    { key: 'numberOfCooperativeBanks', label: 'Number of Cooperative Banks', icon: 'landmark' },
    { key: 'bankingCorrespondents', label: 'Banking Correspondents', icon: 'users' },
    { key: 'atms', label: 'ATMs', icon: 'banknote' },
  ];

  protected addCompetitor() {
    if (this.competitors()().value().length >= this.maxCompetitors) {
      return;
    }

    this.competitors()().value.update((rows) => [
      ...rows,
      { nameOfInstitution: '', approxClients: null, approxPortfolio: null, parPercent: null },
    ]);
  }

  protected removeCompetitor(index: number) {
    this.competitors()().value.update((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }
}
