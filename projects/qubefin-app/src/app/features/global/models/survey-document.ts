// A photograph of a survey.
export interface ISurveyDocument {
  id: string;
  fileName: string;
  documentType: string;
  // A short-lived link (about 30 minutes) to open the photograph.
  url: string;
  createdOn: string | null;
}

// Limits for survey photographs (the server checks the same limits).
export const MAX_SURVEY_PHOTOS = 10;
export const MAX_SURVEY_PHOTO_SIZE_MB = 5;
