/*
 * Days-past-due (DPD) ranges, shared by every DPD filter: OD Members, Jobs & Tasks and the task picker.
 * Both bounds inclusive, no overlap: 1–30, 31–60, 61–90, 91 and above ("90+").
 * The `value` is what the API receives (`dpdRange`).
 */

export type DpdRange = 'Days1To30' | 'Days31To60' | 'Days61To90' | 'Over90';

export interface DpdRangeDef {
  value: DpdRange;
  /** Filter option text. */
  label: string;
  /** Compact text for chips and legends. */
  short: string;
  /** Inclusive. */
  min: number;
  /** Inclusive; null = no upper bound. */
  max: number | null;
  color: string;
}

/** Mildest first. */
export const DPD_RANGES: readonly DpdRangeDef[] = [
  { value: 'Days1To30', label: '1 to 30 days', short: '1–30', min: 0, max: 30, color: '#F59E0B' },
  { value: 'Days31To60', label: '31 to 60 days', short: '31–60', min: 31, max: 60, color: '#F97316' },
  { value: 'Days61To90', label: '61 to 90 days', short: '61–90', min: 61, max: 90, color: '#E11D48' },
  { value: 'Over90', label: '90+ days (91 and above)', short: '90+', min: 91, max: null, color: '#7F1D1D' },
];

const BY_VALUE = new Map(DPD_RANGES.map((r) => [r.value, r]));

export function dpdRangeDef(range: DpdRange): DpdRangeDef {
  return BY_VALUE.get(range)!;
}

/** The range a DPD falls in. */
export function dpdRangeOf(dpd: number): DpdRangeDef {
  return DPD_RANGES.find((r) => dpd >= r.min && (r.max === null || dpd <= r.max)) ?? DPD_RANGES[0];
}

/** True when `dpd` is in `range`; a null range matches everything. */
export function inDpdRange(dpd: number | null | undefined, range: DpdRange | null | undefined): boolean {
  if (!range) return true;
  if (dpd == null) return false;
  const r = BY_VALUE.get(range);
  return !!r && dpd >= r.min && (r.max === null || dpd <= r.max);
}
