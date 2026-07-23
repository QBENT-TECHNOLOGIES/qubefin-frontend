const fs = require('fs');
let content = fs.readFileSync('branch-survey-unit.html', 'utf8');

const steps = [
  { label: 'Geographic Information', key: 'GeographicInformation' },
  { label: 'Accessibility Assessment', key: 'AccessibilityAssessment' },
  { label: 'Demographic Profile', key: 'DemographicProfile' },
  { label: 'Economic Profile', key: 'EconomicProfile' },
  { label: 'Market Potential Assessment', key: 'MarketPotential' },
  { label: 'Transportation Facilities', key: 'TransportationFacilities' },
  { label: 'Financial Inclusion Status', key: 'FinancialInclusion' },
  { label: 'Microfinance Competition Analysis', key: 'CompetitionAnalysis' },
  { label: 'Business Potential Assessment', key: 'BusinessPotential' },
  { label: 'Risk Assessment', key: 'RiskAssessment' },
  { label: 'Compliance Verification', key: 'ComplianceVerification' },
];

for (const step of steps) {
  const regex = new RegExp('<mat-step label="' + step.label + '">[\\s\\S]*?<button matStepperNext type="button"', 'g');
  content = content.replace(regex, (match) => {
    return match.replace('<button matStepperNext type="button"', '<button type="button" (click)="saveStep(\'' + step.key + '\', stepper)"');
  });
}

// Replace the final Submit button
content = content.replace(
  /<button type="button" \(click\)="onSubmit\(\)"/,
  '<button type="button" (click)="saveStep(\'Recommendation\', null)"'
);

fs.writeFileSync('branch-survey-unit.html', content);
