import { Component } from '@angular/core';

/** Config-driven rating rows so the templates don't repeat 10 near-identical blocks. Shared by the interviewer's
 * assessment and the HR Assessment. */
export interface IRatingFieldConfig {
  key: string; // base key, e.g. 'appearanceAttitude'
  label: string;
  desc: string;
}

export const RATING_FIELDS: IRatingFieldConfig[] = [
  {
    key: 'appearanceAttitude',
    label: 'Appearance & Attitude',
    desc: 'Grooming, courtesy, appropriate dress',
  },
  { key: 'personality', label: 'Personality', desc: 'Dignity, bearing, rapport, process, manner' },
  { key: 'communication', label: 'Communication', desc: 'Ability to adequately express oneself' },
  { key: 'education', label: 'Education', desc: 'Appropriateness of degree and course work' },
  { key: 'workExperience', label: 'Work Experience', desc: 'Related work experience for the job' },
  {
    key: 'technicalCompetence',
    label: 'Technical Competence',
    desc: 'Appropriateness of technical skills',
  },
  {
    key: 'flexibility',
    label: 'Flexibility',
    desc: 'Responsive to change, tolerance for ambiguity',
  },
  { key: 'ambition', label: 'Ambition', desc: 'In line with anticipated job program' },
  { key: 'potential', label: 'Potential', desc: 'Ability and motivation to grow' },
  { key: 'others', label: 'Others', desc: 'Anything else worth noting' },
];

export const RATING_OPTIONS = [
  { value: 0, label: 'NA', full: 'Not Acceptable' },
  { value: 1, label: 'BA', full: 'Below Average' },
  { value: 2, label: 'A', full: 'Average' },
  { value: 3, label: 'G', full: 'Good' },
  { value: 4, label: 'VG', full: 'Very Good' },
  { value: 5, label: 'O', full: 'Outstanding' },
];

/** Reference strip explaining the rating abbreviations. Informational only. */
@Component({
  selector: 'qfin-rating-legend',
  template: `
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
      <span class="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rating Scale</span>
      @for (opt of options; track opt.value) {
        <span class="text-slate-600 dark:text-slate-300">
          <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ opt.label }}</span>
          = {{ opt.full }}
        </span>
      }
    </div>
  `,
})
export class RatingLegend {
  protected readonly options = RATING_OPTIONS;
}
