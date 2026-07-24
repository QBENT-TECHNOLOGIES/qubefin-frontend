export interface BranchSurveyDetail {
  id: string;
  surveyId: string;
  surveyDate: Date;
  proposedOperationalArea?: string;
  administrativeUnitId: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  geoTag?: string;
  nearestLandmark?: string;
  administrativeStatus?: string;
  distanceFromExistingWeGrowBranch?: number;
  distanceFromDistrictHeadquarters?: number;
  roadCondition?: string;
  publicTransportAvailability?: string;
  railwayConnectivity?: string;
  busConnectivity?: string;
  mobileNetworkCoverage?: string;
  internetAvailability?: string;
  electricitySupply?: string;
  drinkingWaterAvailability?: string;
  safetyOfArea?: string;
  estimatedPopulation?: number;
  numberOfHouseholds?: number;
  averageFamilySize?: number;
  femalePopulationPercent?: number;
  literacyRate?: number;
  workingPopulation?: number;
  minorityPopulationPercent?: number;
  scheduledCastePercent?: number;
  scheduledTribePercent?: number;
  migrationTrend?: string;
  agriculturePercent?: number;
  agriculturalLabour?: number;
  dairyLivestock?: number;
  smallBusiness?: number;
  pettyTrade?: number;
  cottageSmallIndustries?: number;
  transportActivities?: number;
  serviceHolders?: number;
  dailyWageEarners?: number;
  otherIncomeGeneratingActivities?: string;
  mainCrop?: string;
  peakBusinessSeason?: string;
  leanSeason?: string;
  overallEconomicCondition?: string;
  eligibleHouseholds?: number;
  potentialWomenBorrowers?: number;
  jLGPotential?: number;
  individualBusinessLoansExpected?: number;
  portfolioYear1?: number;
  portfolioYear2?: number;
  portfolioYear3?: number;
  railConnectivity?: string;
  busConnectivityAvailable?: string;
  autoTotoAvailability?: string;
  roadAccessibility?: string;
  accessibilityByMotorCycle?: string;
  numberOfBanks?: number;
  numberOfRegionalRuralBanks?: number;
  numberOfCooperativeBanks?: number;
  bankingCorrespondents?: number;
  aTMs?: number;
  digitalPaymentAcceptance?: string;
  nameOfInstitution?: string;
  approxClients?: number;
  approxPortfolio?: number;
  pARPercent?: number;
  estimatedEligibleHouseholds?: number;
  estimatedWomenBorrowers?: number;
  estimatedNumberOfJLGsCentres?: number;
  estimatedLoanPortfolioPotential?: number;
  expectedMonthlyDisbursement?: number;
  estimatedCollectionEfficiency?: number;
  floodRisk?: string;
  cycloneRisk?: string;
  landslideRisk?: string;
  droughtRisk?: string;
  politicalDisturbanceRisk?: string;
  communalIssuesRisk?: string;
  migrationRisk?: string;
  businessRisk?: string;
  multipleLendingRisk?: string;
  collectionRisk?: string;
  fraudRisk?: string;
  competitionRisk?: string;
  areaVisitedPhysically?: string;
  gPSVerified?: string;
  localReferencesVerified?: string;
  existingCustomersContacted?: string;
  competitorVerificationCompleted?: string;
  photographsAttached?: string;
  recommendation?: string;
  isSurveyorSubmit: boolean;
  isCommiteeSubmit: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isBranchCreate: boolean;
  isSubmitButtonVisible: boolean;
}

export interface BranchSurveyGeographicInformationRequest {
  surveyDate: string | Date;
  proposedOperationalArea?: string;
  administrativeUnitId: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  geoTag?: string;
  nearestLandmark?: string;
  administrativeStatus?: string;
  distanceFromExistingWeGrowBranch?: number;
  distanceFromDistrictHeadquarters?: number;
}

export interface BranchSurveyAccessibilityAssessmentRequest {
  roadCondition?: string;
  publicTransportAvailability?: string;
  railwayConnectivity?: string;
  busConnectivity?: string;
  mobileNetworkCoverage?: string;
  internetAvailability?: string;
  electricitySupply?: string;
  drinkingWaterAvailability?: string;
  safetyOfArea?: string;
}

export interface BranchSurveyDemographicProfileRequest {
  estimatedPopulation?: number;
  numberOfHouseholds?: number;
  averageFamilySize?: number;
  femalePopulationPercent?: number;
  literacyRate?: number;
  workingPopulation?: number;
  minorityPopulationPercent?: number;
  scheduledCastePercent?: number;
  scheduledTribePercent?: number;
  migrationTrend?: string;
}

export interface BranchSurveyEconomicProfileRequest {
  agriculturePercent?: number;
  agriculturalLabour?: number;
  dairyLivestock?: number;
  smallBusiness?: number;
  pettyTrade?: number;
  cottageSmallIndustries?: number;
  transportActivities?: number;
  serviceHolders?: number;
  dailyWageEarners?: number;
  otherIncomeGeneratingActivities?: string;
  mainCrop?: string;
  peakBusinessSeason?: string;
  leanSeason?: string;
  overallEconomicCondition?: string;
}

export interface BranchSurveyMarketPotentialRequest {
  eligibleHouseholds?: number;
  potentialWomenBorrowers?: number;
  jlgpotential?: number;
  individualBusinessLoansExpected?: number;
  portfolioYear1?: number;
  portfolioYear2?: number;
  portfolioYear3?: number;
}

export interface BranchSurveyTransportationFacilitiesRequest {
  railConnectivity?: string;
  busConnectivityAvailable?: string;
  autoTotoAvailability?: string;
  roadAccessibility?: string;
  accessibilityByMotorCycle?: string;
}

export interface BranchSurveyFinancialInclusionStatusRequest {
  numberOfBanks?: number;
  numberOfRegionalRuralBanks?: number;
  numberOfCooperativeBanks?: number;
  bankingCorrespondents?: number;
  atms?: number;
  digitalPaymentAcceptance?: string;
}

export interface BranchSurveyMicrofinanceCompetitionRequest {
  nameOfInstitution?: string;
  approxClients?: number;
  approxPortfolio?: number;
  parpercent?: number;
}

export interface BranchSurveyBusinessPotentialRequest {
  estimatedEligibleHouseholds?: number;
  estimatedWomenBorrowers?: number;
  estimatedNumberOfJlgsCentres?: number;
  estimatedLoanPortfolioPotential?: number;
  expectedMonthlyDisbursement?: number;
  estimatedCollectionEfficiency?: number;
}

export interface BranchSurveyRiskAssessmentRequest {
  floodRisk?: string;
  cycloneRisk?: string;
  landslideRisk?: string;
  droughtRisk?: string;
  politicalDisturbanceRisk?: string;
  communalIssuesRisk?: string;
  migrationRisk?: string;
  businessRisk?: string;
  multipleLendingRisk?: string;
  collectionRisk?: string;
  fraudRisk?: string;
  competitionRisk?: string;
}

export interface BranchSurveyComplianceVerificationRequest {
  areaVisitedPhysically?: string;
  gpsverified?: string;
  localReferencesVerified?: string;
  existingCustomersContacted?: string;
  competitorVerificationCompleted?: string;
  photographsAttached?: string;
}

export interface BranchSurveyRecommendationRequest {
  recommendation?: string;
}

export interface BranchSurveyRequest {
  id: string;
  surveyId: string;
  geographicInformation?: BranchSurveyGeographicInformationRequest | null;
  accessibilityAssessment?: BranchSurveyAccessibilityAssessmentRequest | null;
  demographicProfile?: BranchSurveyDemographicProfileRequest | null;
  economicProfile?: BranchSurveyEconomicProfileRequest | null;
  marketPotential?: BranchSurveyMarketPotentialRequest | null;
  transportationFacilities?: BranchSurveyTransportationFacilitiesRequest | null;
  financialInclusionStatus?: BranchSurveyFinancialInclusionStatusRequest | null;
  microfinanceCompetition?: BranchSurveyMicrofinanceCompetitionRequest | null;
  businessPotential?: BranchSurveyBusinessPotentialRequest | null;
  riskAssessment?: BranchSurveyRiskAssessmentRequest | null;
  complianceVerification?: BranchSurveyComplianceVerificationRequest | null;
  recommendation?: BranchSurveyRecommendationRequest | null;
}
