import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  IBusinessPotentialSection,
  IMarketPotentialSection,
} from '../../../../../models/branch-survey';

// Step 5 - Section E: Market Potential Assessment and Section I: Business Potential Assessment
@Component({
  selector: 'qfin-market-business-step',
  imports: [FormField, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  templateUrl: './market-business-step.html',
})
export class MarketBusinessStep {
  readonly marketPotential = input.required<FieldTree<IMarketPotentialSection>>();
  readonly businessPotential = input.required<FieldTree<IBusinessPotentialSection>>();

  // Amounts in rupees use the rupee icon. unit = text shown after the number.
  readonly marketFields: { key: keyof IMarketPotentialSection; label: string; icon: string }[] = [
    { key: 'eligibleHouseholds', label: 'Eligible Households', icon: 'map-pin-house' },
    { key: 'potentialWomenBorrowers', label: 'Potential Women Borrowers', icon: 'users' },
    { key: 'jlgPotential', label: 'JLG Potential', icon: 'users' },
    { key: 'individualBusinessLoansExpected', label: 'Individual Business Loans', icon: 'hand-coins' },
    { key: 'portfolioYear1', label: 'Expected Portfolio - Year 1', icon: 'indian-rupee' },
    { key: 'portfolioYear2', label: 'Expected Portfolio - Year 2', icon: 'indian-rupee' },
    { key: 'portfolioYear3', label: 'Expected Portfolio - Year 3', icon: 'indian-rupee' },
  ];

  readonly businessFields: {
    key: keyof IBusinessPotentialSection;
    label: string;
    icon: string;
    unit?: string;
  }[] = [
    { key: 'estimatedEligibleHouseholds', label: 'Estimated Eligible Households', icon: 'map-pin-house' },
    { key: 'estimatedWomenBorrowers', label: 'Estimated Women Borrowers', icon: 'users' },
    { key: 'estimatedNumberOfJlgCentres', label: 'Estimated Number of JLG Centres', icon: 'users' },
    { key: 'estimatedLoanPortfolioPotential', label: 'Estimated Loan Portfolio Potential', icon: 'indian-rupee' },
    { key: 'expectedMonthlyDisbursement', label: 'Expected Monthly Disbursement', icon: 'indian-rupee' },
    { key: 'estimatedCollectionEfficiency', label: 'Estimated Collection Efficiency', icon: 'percent', unit: '%' },
  ];
}
