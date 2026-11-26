// The Branch Location Survey form, grouped like the paper form (sections A to M).
// Text boxes hold '' when empty (the screen needs a string); dropdowns and numbers hold null.

// A. Geographic Information
export interface IGeographicSection {
  administrativeUnitId: string;
  proposedOperationalArea: string;
  policeStation: string | null;
  pinCode: string;
  latitude: number | null;
  longitude: number | null;
  geoTag: string;
  nearestLandmark: string;
  administrativeStatus: string | null;
  distanceFromExistingWeGrowBranch: number | null; // km
  distanceFromDistrictHeadquarters: number | null; // km
}

// B. Accessibility Assessment
export interface IAccessibilitySection {
  roadCondition: string | null;
  publicTransportAvailability: string | null;
  railwayConnectivity: string | null;
  busConnectivity: string | null;
  mobileNetworkCoverage: string | null;
  internetAvailability: string | null;
  electricitySupply: string | null;
  drinkingWaterAvailability: string | null;
  safetyOfArea: string | null;
}

// C. Demographic Profile
export interface IDemographicSection {
  estimatedPopulation: number | null;
  numberOfHouseholds: number | null;
  averageFamilySize: number | null;
  femalePopulationPercent: number | null;
  literacyRate: number | null;
  workingPopulation: number | null; // count
  minorityPopulationPercent: number | null;
  scheduledCastePercent: number | null;
  scheduledTribePercent: number | null;
  migrationTrend: string | null;
}

// D. Economic Profile (the activity fields are percentages)
export interface IEconomicSection {
  agriculturePercent: number | null;
  agriculturalLabour: number | null;
  dairyLivestock: number | null;
  smallBusiness: number | null;
  pettyTrade: number | null;
  cottageSmallIndustries: number | null;
  transportActivities: number | null;
  serviceHolders: number | null;
  dailyWageEarners: number | null;
  otherIncomeGeneratingActivities: string;
  mainCrop: string;
  peakBusinessSeason: string;
  leanSeason: string;
  overallEconomicCondition: string | null;
}

// E. Market Potential Assessment
export interface IMarketPotentialSection {
  eligibleHouseholds: number | null;
  potentialWomenBorrowers: number | null;
  jlgPotential: number | null;
  individualBusinessLoansExpected: number | null;
  portfolioYear1: number | null;
  portfolioYear2: number | null;
  portfolioYear3: number | null;
}

// F. Transportation Facilities (Yes / No)
export interface ITransportationSection {
  railConnectivity: string | null;
  busConnectivityAvailable: string | null;
  autoTotoAvailability: string | null;
  roadAccessibility: string | null;
  accessibilityByMotorCycle: string | null;
}

// G. Financial Inclusion Status
export interface IFinancialInclusionSection {
  numberOfBanks: number | null;
  numberOfRegionalRuralBanks: number | null;
  numberOfCooperativeBanks: number | null;
  bankingCorrespondents: number | null;
  atms: number | null;
  digitalPaymentAcceptance: string | null;
}

// H. Microfinance Competition Analysis (one row per institution)
export interface ICompetitorRow {
  nameOfInstitution: string;
  approxClients: number | null;
  approxPortfolio: number | null;
  parPercent: number | null;
}

// I. Business Potential Assessment
export interface IBusinessPotentialSection {
  estimatedEligibleHouseholds: number | null;
  estimatedWomenBorrowers: number | null;
  estimatedNumberOfJlgCentres: number | null;
  estimatedLoanPortfolioPotential: number | null;
  expectedMonthlyDisbursement: number | null;
  estimatedCollectionEfficiency: number | null;
}

// J. Risk Assessment
export interface IRiskSection {
  floodRisk: string | null;
  cycloneRisk: string | null;
  landslideRisk: string | null;
  droughtRisk: string | null;
  politicalDisturbanceRisk: string | null;
  communalIssuesRisk: string | null;
  migrationRisk: string | null;
  multipleLendingRisk: string | null;
  collectionRisk: string | null;
  fraudRisk: string | null;
  competitionRisk: string | null;
}

// K. Compliance Verification (Yes / No)
export interface IComplianceSection {
  areaVisitedPhysically: string | null;
  gpsVerified: string | null;
  localReferencesVerified: string | null;
  existingCustomersContacted: string | null;
  competitorVerificationCompleted: string | null;
  photographsAttached: string | null;
}

// The form as the screen edits it (the survey date is a Date for the date picker).
export interface IBranchSurveyForm {
  surveyDate: Date | null;
  geographic: IGeographicSection;
  accessibility: IAccessibilitySection;
  demographic: IDemographicSection;
  economic: IEconomicSection;
  marketPotential: IMarketPotentialSection;
  transportation: ITransportationSection;
  financialInclusion: IFinancialInclusionSection;
  competitors: ICompetitorRow[];
  businessPotential: IBusinessPotentialSection;
  risk: IRiskSection;
  compliance: IComplianceSection;
  recommendation: string | null;
  surveyorComments: string;
}

// What the server returns (the survey date arrives as text).
export interface IBranchSurveyResponse {
  surveyId: string;
  status: string;
  canEditForm: boolean;
  isSaved: boolean;
  lastSavedOn: string | null;
  form: Omit<IBranchSurveyForm, 'surveyDate'> & { surveyDate: string };
}

// The choices allowed in the dropdown fields.
export const BRANCH_SURVEY_OPTIONS = {
  rating: ['Excellent', 'Good', 'Average', 'Poor'],
  administrativeStatus: ['Rural', 'Semi Urban', 'Urban'],
  economicCondition: ['Good', 'Average', 'Poor'],
  naturalRisk: ['High', 'Medium', 'Low'],
  riskLevel: ['Low', 'Medium', 'High'],
  migrationTrend: ['Low', 'Moderate', 'High'],
  yesNo: ['Yes', 'No'],
  recommendation: ['Highly Recommended', 'Recommended', 'Not Recommended'],
};

// The nine income activity shares (Economic step) can add up to 100 at most.
export const ACTIVITY_TOTAL_MESSAGE = 'The nine activity shares can add up to at most 100.';

export function sumOfActivityShares(economic: IEconomicSection): number {
  return (
    (economic.agriculturePercent ?? 0) +
    (economic.agriculturalLabour ?? 0) +
    (economic.dairyLivestock ?? 0) +
    (economic.smallBusiness ?? 0) +
    (economic.pettyTrade ?? 0) +
    (economic.cottageSmallIndustries ?? 0) +
    (economic.transportActivities ?? 0) +
    (economic.serviceHolders ?? 0) +
    (economic.dailyWageEarners ?? 0)
  );
}

// At most 10 competitors can be added.
export const MAX_COMPETITORS = 10;

export function createEmptyBranchSurveyForm(): IBranchSurveyForm {
  return {
    surveyDate: new Date(),
    geographic: {
      administrativeUnitId: '',
      proposedOperationalArea: '',
      policeStation: null,
      pinCode: '',
      latitude: null,
      longitude: null,
      geoTag: '',
      nearestLandmark: '',
      administrativeStatus: null,
      distanceFromExistingWeGrowBranch: null,
      distanceFromDistrictHeadquarters: null,
    },
    accessibility: {
      roadCondition: null,
      publicTransportAvailability: null,
      railwayConnectivity: null,
      busConnectivity: null,
      mobileNetworkCoverage: null,
      internetAvailability: null,
      electricitySupply: null,
      drinkingWaterAvailability: null,
      safetyOfArea: null,
    },
    demographic: {
      estimatedPopulation: null,
      numberOfHouseholds: null,
      averageFamilySize: null,
      femalePopulationPercent: null,
      literacyRate: null,
      workingPopulation: null,
      minorityPopulationPercent: null,
      scheduledCastePercent: null,
      scheduledTribePercent: null,
      migrationTrend: null,
    },
    economic: {
      agriculturePercent: null,
      agriculturalLabour: null,
      dairyLivestock: null,
      smallBusiness: null,
      pettyTrade: null,
      cottageSmallIndustries: null,
      transportActivities: null,
      serviceHolders: null,
      dailyWageEarners: null,
      otherIncomeGeneratingActivities: '',
      mainCrop: '',
      peakBusinessSeason: '',
      leanSeason: '',
      overallEconomicCondition: null,
    },
    marketPotential: {
      eligibleHouseholds: null,
      potentialWomenBorrowers: null,
      jlgPotential: null,
      individualBusinessLoansExpected: null,
      portfolioYear1: null,
      portfolioYear2: null,
      portfolioYear3: null,
    },
    transportation: {
      railConnectivity: null,
      busConnectivityAvailable: null,
      autoTotoAvailability: null,
      roadAccessibility: null,
      accessibilityByMotorCycle: null,
    },
    financialInclusion: {
      numberOfBanks: null,
      numberOfRegionalRuralBanks: null,
      numberOfCooperativeBanks: null,
      bankingCorrespondents: null,
      atms: null,
      digitalPaymentAcceptance: null,
    },
    competitors: [],
    businessPotential: {
      estimatedEligibleHouseholds: null,
      estimatedWomenBorrowers: null,
      estimatedNumberOfJlgCentres: null,
      estimatedLoanPortfolioPotential: null,
      expectedMonthlyDisbursement: null,
      estimatedCollectionEfficiency: null,
    },
    risk: {
      floodRisk: null,
      cycloneRisk: null,
      landslideRisk: null,
      droughtRisk: null,
      politicalDisturbanceRisk: null,
      communalIssuesRisk: null,
      migrationRisk: null,
      multipleLendingRisk: null,
      collectionRisk: null,
      fraudRisk: null,
      competitionRisk: null,
    },
    compliance: {
      areaVisitedPhysically: null,
      gpsVerified: null,
      localReferencesVerified: null,
      existingCustomersContacted: null,
      competitorVerificationCompleted: null,
      photographsAttached: null,
    },
    recommendation: null,
    surveyorComments: '',
  };
}
