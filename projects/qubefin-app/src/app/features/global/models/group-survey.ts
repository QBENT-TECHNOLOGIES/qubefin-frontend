// The Group Formation Survey form ("Group Location Survey Report"), grouped like the paper form.
// Text boxes hold '' when empty (the screen needs a string); dropdowns and numbers hold null.

// Geographic Information. The proposed area and the three place names come from the assignment and are read-only.
export interface IGroupGeographicSection {
  proposedOperationalArea: string;
  villageLocality: string;
  gramPanchayatMunicipality: string;
  block: string;
  latitude: number | null;
  longitude: number | null;
  nearestLandmark: string;
}

// Demographic Profile + Economic Profile
export interface IGroupProfileSection {
  approximateHouseholds: number | null;
  estimatedPopulation: number | null;
  mainOccupation: string | null;
  mainOccupationOther: string;
}

// Transportation Facilities + Social Environment + Political Environment
export interface IGroupEnvironmentSection {
  roadAccessibility: string | null;
  autoTotoAvailability: string | null;
  communityHarmony: string | null;
  womenEconomicParticipation: string | null;
  socialAcceptanceOfMicrofinance: string | null;
  politicalStability: string | null;
  politicalDisturbance: string | null;
  localInfluenceOnLending: string | null;
  electionRelatedIssues: string | null;
}

// Climate and Disaster Risk + Competition Analysis
export interface IGroupRiskSection {
  floodProne: string | null;
  waterLogging: string | null;
  droughtProne: string | null;
  flashFloodRisk: string | null;
  cycloneRisk: string | null;
  riverErosion: string | null;
  otherNaturalRisks: string | null;
  numberOfMfis: number | null;
  smallFinanceBanks: number | null;
  shgFinancingInstitutions: number | null;
}

// Distance Analysis + Business Potential Assessment
export interface IGroupMarketSection {
  distanceFromBranchKm: number | null;
  distanceFromNearestWeGrowCentreKm: number | null;
  distanceFromNearestCompetingCentreKm: number | null;
  averageTravelTimeMinutes: number | null;
  groupsThatCanBeFormed: number | null;
  estimatedWomenBorrowers: number | null;
}

// Other Observations + Recommendation of the surveying Credit Officers
export interface IGroupObservationSection {
  suitableMeetingPlaces: string | null;
  communityResponseTowardsWeGrow: string | null;
  otherObservations: string;
  surveyorRecommendation: string | null;
  surveyorComments: string;
}

export interface IGroupSurveyForm {
  surveyDate: Date | string;
  geographic: IGroupGeographicSection;
  profile: IGroupProfileSection;
  environment: IGroupEnvironmentSection;
  risk: IGroupRiskSection;
  market: IGroupMarketSection;
  observation: IGroupObservationSection;
}

// One signing block of the declaration: name, designation, PIN (employee code), date and signature image.
export interface ISignOff {
  name: string;
  designation: string | null;
  pin: string | null;
  date: string | null;
  signatureUrl: string | null;
}

// What the server returns for the form.
export interface IGroupSurveyResponse {
  surveyId: string;
  status: string;
  // True only for the Lead Credit Officer while the survey is Assigned or Draft.
  canEditForm: boolean;
  // False when the branch has no location, so the distance from the branch cannot be worked out.
  branchHasLocation: boolean;
  isSaved: boolean;
  lastSavedOn: string | null;
  form: IGroupSurveyForm;
  surveyedBy: ISignOff | null;
  // Filled when the Head of Branch has recommended / the Area Manager has approved.
  recommendedBy: ISignOff | null;
  approvedBy: ISignOff | null;
}

export function createEmptyGroupSurveyForm(): IGroupSurveyForm {
  return {
    surveyDate: new Date(),
    geographic: {
      proposedOperationalArea: '',
      villageLocality: '',
      gramPanchayatMunicipality: '',
      block: '',
      latitude: null,
      longitude: null,
      nearestLandmark: '',
    },
    profile: {
      approximateHouseholds: null,
      estimatedPopulation: null,
      mainOccupation: null,
      mainOccupationOther: '',
    },
    environment: {
      roadAccessibility: null,
      autoTotoAvailability: null,
      communityHarmony: null,
      womenEconomicParticipation: null,
      socialAcceptanceOfMicrofinance: null,
      politicalStability: null,
      politicalDisturbance: null,
      localInfluenceOnLending: null,
      electionRelatedIssues: null,
    },
    risk: {
      floodProne: null,
      waterLogging: null,
      droughtProne: null,
      flashFloodRisk: null,
      cycloneRisk: null,
      riverErosion: null,
      otherNaturalRisks: null,
      numberOfMfis: null,
      smallFinanceBanks: null,
      shgFinancingInstitutions: null,
    },
    market: {
      distanceFromBranchKm: null,
      distanceFromNearestWeGrowCentreKm: null,
      distanceFromNearestCompetingCentreKm: null,
      averageTravelTimeMinutes: null,
      groupsThatCanBeFormed: null,
      estimatedWomenBorrowers: null,
    },
    observation: {
      suitableMeetingPlaces: null,
      communityResponseTowardsWeGrow: null,
      otherObservations: '',
      surveyorRecommendation: null,
      surveyorComments: '',
    },
  };
}

// The choices of the dropdown fields (the server checks the same values).
export const GROUP_SURVEY_OPTIONS = {
  mainOccupation: [
    'Agriculture',
    'Agricultural Labour',
    'Dairy',
    'Livestock',
    'Small Business',
    'Small Industries',
    'Transport',
    'Service',
    'Daily Labour',
    'Other',
  ],
  yesNo: ['Yes', 'No'],
  goodModeratePoor: ['Good', 'Moderate', 'Poor'],
  stableModerateSensitive: ['Stable', 'Moderate', 'Sensitive'],
  recommendation: ['Highly Recommended', 'Recommended', 'Not Recommended'],
};
