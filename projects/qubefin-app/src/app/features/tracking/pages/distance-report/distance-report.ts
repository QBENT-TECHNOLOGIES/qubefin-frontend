import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { FieldOfficer, isAdminRole } from '../../models/field-officer';
import { DailyDistance, DailyDistanceReportRequest, DailyDistanceReportResponse, DailyDistanceRow, MileageCheck, OfficerReport, OfficerReportRow } from '../../models/distance-report';
import { DistanceReportService } from '../../services/distance-report.service';
import { gpsServiceError } from '../../services/gps-history.service';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { toDateKey } from '../../utils/geo-utils';
import { roleLabel } from '../../utils/tracking-labels';
import { DateKeyRange, TrkDateRangeField } from '../../components/shared/date-field/trk-date-range-field';

/** What was asked for: the hierarchy-wise report (no ids), or only some employees. */
interface ReportQuery {
  body: DailyDistanceReportRequest;
  employeeIds: string[];
}

const DEFAULTS = { maxAccuracyMeters: 100, maxSegmentMeters: 5000, minSegmentMeters: 5 };
/** Longest period one report may cover. */
const MAX_DAYS = 92;
const ALL = 'all';
/** A mileage vs GPS difference within this % is shown as fine. */
const DIFF_OK_PCT = 10;

export type QuickRange = 'today' | 'yesterday' | 'last3' | 'thisWeek' | 'thisMonth' | 'lastMonth';
const QUICK_RANGES: { key: QuickRange; label: string; hint: string }[] = [
  { key: 'today', label: 'Today', hint: 'Today' },
  { key: 'yesterday', label: 'Yesterday', hint: 'Yesterday' },
  { key: 'last3', label: 'Last 3 days', hint: 'Today and the 2 days before' },
  { key: 'thisWeek', label: 'This week', hint: 'Monday to today' },
  { key: 'thisMonth', label: 'This month', hint: '1st of this month to today' },
  { key: 'lastMonth', label: 'Last month', hint: 'The whole of last month' },
];

/**
 * A choice in the Branch dropdown. Divisions and areas are offered too, because Divisional and Area Managers belong to
 * their division / area, not to a branch. An option covers the staff of its branches plus the managers of its own unit
 * (and, for a division, of its areas).
 */
interface UnitOption {
  key: string;
  kind: 'Division' | 'Area' | 'Branch';
  label: string;
  hint: string;
  branchIds: Set<string>;
  unitNames: Set<string>;
}

/**
 * Tracking Report: km travelled per employee and per day, from the GPS service's daily distance report
 * (`POST /api/v1/reports`, or `/api/v1/reports/by-employees` when employees are picked). Used for petrol and travel
 * allowances. Flow: period (quick picks or a range of up to 3 months) → branch (or area / division) → employees
 * (optional) → Generate. Nothing loads until Generate; search, post / unit filters, sorting and paging work on the result.
 */
@Component({
  selector: 'qfin-distance-report',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    LucideDynamicIcon,
    TrkDateRangeField,
  ],
  templateUrl: './distance-report.html',
})
export class DistanceReport {
  private readonly reports = inject(DistanceReportService);
  readonly lookup = inject(TrackingLookupStore);
  readonly roleLabel = roleLabel;
  readonly enabled = this.reports.enabled;
  readonly today = toDateKey();

  // --- Draft filters (applied with "Generate") ------------------------------------------------
  readonly quickRanges = QUICK_RANGES;
  readonly fromDate = signal(quickRange('today').from);
  readonly toDate = signal(quickRange('today').to);
  readonly units = signal<string[]>([]);
  readonly employeeIds = signal<string[]>([]);
  readonly employeeSearch = signal('');
  readonly showAdvanced = signal(false);
  readonly includeMockLocations = signal(false);
  readonly maxAccuracyMeters = signal(DEFAULTS.maxAccuracyMeters);
  readonly maxSegmentMeters = signal(DEFAULTS.maxSegmentMeters);
  readonly minSegmentMeters = signal(DEFAULTS.minSegmentMeters);

  /** The quick pick the current period matches, if any. */
  readonly activeQuick = computed(() => QUICK_RANGES.find((q) => { const r = quickRange(q.key); return r.from === this.fromDate() && r.to === this.toDate(); })?.key ?? null);

  // --- Branch (with areas and divisions) ---------------------------------------------------------
  private readonly role = computed(() => this.lookup.viewer()?.role ?? null);
  /** Branch Managers, ABMs and Credit Officers only report on their own branch. */
  readonly unitLocked = computed(() => {
    const r = this.role();
    return r === 'Branch Manager' || r === 'Assistant Branch Manager' || r === 'Credit Officer';
  });
  readonly unitGroups = computed(() => {
    const role = this.role();
    const admin = isAdminRole(role);
    const branches = [...this.lookup.branches()].sort((a, b) => a.name.localeCompare(b.name));
    const own = new Set(this.lookup.viewer()?.organizationUnitIds ?? []);
    const branchOpts: UnitOption[] = branches
      .filter((b) => !this.unitLocked() || own.has(b.id))
      .map((b) => ({ key: `B:${b.id}`, kind: 'Branch', label: b.name, hint: b.areaName, branchIds: new Set([b.id]), unitNames: new Set<string>() }));
    const groups: { label: string; options: UnitOption[] }[] = [];
    if (admin || role === 'Divisional Manager') {
      const divisions = uniqueSorted(branches.map((b) => b.divisionName));
      groups.push({
        label: 'Divisions',
        options: divisions.map((d) => {
          const inDiv = branches.filter((b) => b.divisionName === d);
          return { key: `D:${d}`, kind: 'Division', label: d, hint: `${inDiv.length} branches`, branchIds: new Set(inDiv.map((b) => b.id)), unitNames: new Set([d, ...inDiv.map((b) => b.areaName)]) };
        }),
      });
    }
    if (admin || role === 'Divisional Manager' || role === 'Area Manager') {
      const areas = uniqueSorted(branches.map((b) => b.areaName));
      groups.push({
        label: 'Areas',
        options: areas.map((a) => {
          const inArea = branches.filter((b) => b.areaName === a);
          return { key: `A:${a}`, kind: 'Area', label: a, hint: `${inArea.length} branches`, branchIds: new Set(inArea.map((b) => b.id)), unitNames: new Set([a]) };
        }),
      });
    }
    groups.push({ label: 'Branches', options: branchOpts });
    return groups.filter((g) => g.options.length);
  });
  private readonly unitByKey = computed(() => new Map(this.unitGroups().flatMap((g) => g.options).map((o) => [o.key, o])));
  readonly unitLabel = computed(() => {
    const keys = this.units();
    if (keys.includes(ALL)) return 'All branches';
    const first = this.unitByKey().get(keys[0])?.label ?? '';
    return keys.length > 1 ? `${first} (+${keys.length - 1} more)` : first;
  });

  /** Everyone the chosen branches / areas / divisions cover (all officers for "All branches"). */
  readonly unitOfficers = computed<FieldOfficer[]>(() => {
    const keys = this.units();
    const officers = this.lookup.officers();
    if (!keys.length) return [];
    if (keys.includes(ALL)) return officers;
    const opts = keys.map((k) => this.unitByKey().get(k)).filter((o): o is UnitOption => !!o);
    return officers.filter((o) => opts.some((u) => u.branchIds.has(o.organizationUnitId) || u.unitNames.has(o.unitName)));
  });
  private readonly unitOfficerIds = computed(() => new Set(this.unitOfficers().map((o) => o.id)));

  /** Employee options (from the chosen branches), grouped by role and narrowed by the search box. */
  readonly employeeGroups = computed(() => {
    const q = this.employeeSearch().trim().toLowerCase();
    const picked = new Set(this.employeeIds());
    return groupByRole(this.unitOfficers().filter((o) => picked.has(o.id) || !q || `${o.name} ${o.employeeCode} ${o.unitName}`.toLowerCase().includes(q)));
  });
  readonly pickedNames = computed(() => {
    const byId = this.lookup.officerById();
    return this.employeeIds().map((id) => byId.get(id)?.name ?? id);
  });

  readonly advancedChanged = computed(
    () =>
      this.includeMockLocations() ||
      this.maxAccuracyMeters() !== DEFAULTS.maxAccuracyMeters ||
      this.maxSegmentMeters() !== DEFAULTS.maxSegmentMeters ||
      this.minSegmentMeters() !== DEFAULTS.minSegmentMeters,
  );
  readonly rangeError = computed(() => {
    const from = this.fromDate();
    const to = this.toDate();
    if (!from || !to) return 'Choose the report period.';
    if (to < from) return 'The end date must be on or after the start date.';
    if (daysBetween(from, to) + 1 > MAX_DAYS) return 'Choose a period of up to 3 months.';
    return null;
  });
  /** Why Generate is disabled, if it is. */
  readonly generateBlocker = computed(() => {
    if (this.rangeError()) return this.rangeError();
    if (!this.units().length) return 'Choose a branch.';
    if (!this.units().includes(ALL) && !this.unitOfficers().length) return this.lookup.loading() ? 'Loading employees…' : 'No employees in the selected branch.';
    return null;
  });

  /** The filters as they are now, to tell whether the report on screen still matches them. */
  private readonly draftKey = computed(() =>
    JSON.stringify([this.fromDate(), this.toDate(), this.units(), this.employeeIds(), this.includeMockLocations(), this.maxAccuracyMeters(), this.maxSegmentMeters(), this.minSegmentMeters()]),
  );
  private readonly appliedKey = signal<string | null>(null);
  readonly stale = computed(() => this.appliedKey() !== null && this.appliedKey() !== this.draftKey());

  // --- Report ----------------------------------------------------------------------------------
  /** The last applied query; the report loads whenever it changes. */
  readonly query = signal<ReportQuery | null>(null);
  private readonly reportResource = rxResource<DailyDistanceReportResponse, ReportQuery | undefined>({
    params: () => this.query() ?? undefined,
    stream: ({ params }) =>
      params.employeeIds.length
        ? this.reports.dailyDistanceByEmployees({ ...params.body, employeeIds: params.employeeIds })
        : this.reports.dailyDistance(params.body),
  });
  readonly report = computed(() => (this.reportResource.hasValue() ? this.reportResource.value() : undefined));
  readonly loading = computed(() => this.reportResource.isLoading());
  readonly errorText = computed(() => (this.reportResource.error() ? gpsServiceError(this.reportResource.error()) : null));

  readonly rows = computed<OfficerReportRow[]>(() => (this.report()?.employees ?? []).map(toRow));

  // --- Result filters (on the web) -------------------------------------------------------------
  readonly search = signal('');
  readonly post = signal<string | null>(null);
  readonly unit = signal<string | null>(null);
  readonly withDataOnly = signal(false);

  readonly postOptions = computed(() => uniqueSorted(this.rows().map((r) => r.post)));
  readonly unitOptions = computed(() => uniqueSorted(this.rows().map((r) => r.unitName)));

  readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const post = this.post();
    const unit = this.unit();
    const dataOnly = this.withDataOnly();
    return this.rows().filter(
      (r) =>
        (!q || `${r.employeeName} ${r.employeeCode} ${r.designation}`.toLowerCase().includes(q)) &&
        (!post || r.post === post) &&
        (!unit || r.unitName === unit) &&
        (!dataOnly || r.daysWithData > 0),
    );
  });

  readonly totals = computed(() => {
    const rows = this.filteredRows();
    const withData = rows.filter((r) => r.daysWithData > 0);
    const km = rows.reduce((s, r) => s + r.totalKm, 0);
    const days = rows.reduce((s, r) => s + r.daysWithData, 0);
    const checked = rows.filter((r) => r.mileage);
    return {
      employees: rows.length,
      withData: withData.length,
      km,
      days,
      avgKmPerDay: days ? km / days : 0,
      mileageDays: rows.reduce((s, r) => s + r.mileageDays, 0),
      mileageEmployees: checked.length,
      mileage: sumChecks(checked.map((r) => r.mileage!)),
      top: withData.reduce<OfficerReportRow | null>((best, r) => (!best || r.totalKm > best.totalKm ? r : best), null),
    };
  });

  /** Colour of a difference: within ±10 % is fine, above it is flagged. */
  diffClass(c: MileageCheck | null): string {
    if (!c || c.differencePct === null) return 'text-slate-500';
    const pct = Math.abs(c.differencePct);
    if (pct <= DIFF_OK_PCT) return 'text-emerald-600';
    return c.differenceKm > 0 ? 'text-red-600' : 'text-amber-600';
  }

  signed(n: number): string {
    return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;
  }

  signedPct(n: number | null): string {
    return n === null ? '' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
  }

  // --- Table -----------------------------------------------------------------------------------
  readonly columns = ['expand', 'employee', 'post', 'unit', 'daysWithData', 'totalKm', 'avgKmPerDay', 'mileageKm', 'differenceKm', 'activeMinutes'];
  readonly dayColumns = ['date', 'km', 'startMileage', 'endMileage', 'mileageKm', 'difference', 'firstPoint', 'lastPoint', 'active', 'points', 'route'];
  readonly dataSource = new MatTableDataSource<OfficerReportRow>([]);
  readonly expandedId = signal<string | null>(null);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  constructor() {
    this.dataSource.sortingDataAccessor = (r, col) => {
      switch (col) {
        case 'employee':
          return r.employeeName.toLowerCase();
        case 'post':
          return r.post?.toLowerCase() ?? '';
        case 'unit':
          return r.unitName?.toLowerCase() ?? '';
        default:
          return (r as unknown as Record<string, number>)[col] ?? 0;
      }
    };
    // The table sits inside @if blocks, so sort and paginator appear once the report is shown.
    effect(() => {
      const sort = this.sort();
      const paginator = this.paginator();
      if (sort && this.dataSource.sort !== sort) this.dataSource.sort = sort;
      if (paginator && this.dataSource.paginator !== paginator) this.dataSource.paginator = paginator;
    });
    effect(() => {
      this.dataSource.data = this.filteredRows();
      this.dataSource.paginator?.firstPage();
    });
    // A Branch Manager / ABM / CO gets their own branch, fixed.
    effect(() => {
      const opts = this.unitGroups().flatMap((g) => g.options);
      if (this.unitLocked() && opts.length && !this.units().length) this.units.set(opts.map((o) => o.key));
    });
    // Drop picked employees that the new branch choice no longer covers.
    effect(() => {
      const ids = this.unitOfficerIds();
      const picked = untracked(() => this.employeeIds());
      if (picked.some((id) => !ids.has(id))) this.employeeIds.set(picked.filter((id) => ids.has(id)));
    });
  }

  setRange(r: DateKeyRange) {
    this.fromDate.set(r.from);
    this.toDate.set(r.to);
  }

  pickQuick(key: QuickRange) {
    this.setRange(quickRange(key));
  }

  /** "All branches" and specific choices exclude each other. */
  setUnits(next: string[]) {
    const prev = this.units();
    if (next.includes(ALL) && !prev.includes(ALL)) next = [ALL];
    else if (next.includes(ALL) && next.length > 1) next = next.filter((k) => k !== ALL);
    this.units.set(next);
  }

  clearEmployees() {
    this.employeeIds.set([]);
  }

  resetAdvanced() {
    this.includeMockLocations.set(false);
    this.maxAccuracyMeters.set(DEFAULTS.maxAccuracyMeters);
    this.maxSegmentMeters.set(DEFAULTS.maxSegmentMeters);
    this.minSegmentMeters.set(DEFAULTS.minSegmentMeters);
  }

  /**
   * Picked employees → by-employees with them. No one picked: "All branches" → the hierarchy-wise report (everyone in
   * scope); a branch / area / division → by-employees with everyone it covers.
   */
  generate() {
    if (this.generateBlocker() || !this.enabled) return;
    const covered = this.unitOfficerIds();
    const picked = this.employeeIds().filter((id) => covered.has(id));
    const employeeIds = picked.length ? picked : this.units().includes(ALL) ? [] : [...covered];
    // A branch choice never falls back to the whole-scope report (e.g. if the employee list has not loaded yet).
    if (!employeeIds.length && !this.units().includes(ALL)) return;
    this.expandedId.set(null);
    this.appliedKey.set(this.draftKey());
    this.query.set({
      employeeIds,
      body: {
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        includeMockLocations: this.includeMockLocations(),
        maxAccuracyMeters: positive(this.maxAccuracyMeters(), DEFAULTS.maxAccuracyMeters),
        maxSegmentMeters: positive(this.maxSegmentMeters(), DEFAULTS.maxSegmentMeters),
        minSegmentMeters: Math.max(0, +this.minSegmentMeters() || 0),
      },
    });
  }

  reload() {
    this.reportResource.reload();
  }

  toggle(r: OfficerReportRow) {
    if (!r.daysWithData) return;
    this.expandedId.set(this.expandedId() === r.employeeId ? null : r.employeeId);
  }

  /** Both rows (employee + its day-wise detail) are rendered for every employee; the detail is hidden until expanded. */
  readonly always = () => true;

  hours(mins: number): string {
    const m = Math.round(mins || 0);
    const h = Math.floor(m / 60);
    return h ? `${h} h ${m % 60} m` : `${m} m`;
  }

  // --- Export (CSV opens in Excel) -------------------------------------------------------------
  exportSummary() {
    const rep = this.report();
    if (!rep) return;
    const header = ['Employee code', 'Employee name', 'Designation', 'Post', 'Unit', 'Days with GPS data', 'Tracking distance (km)', 'Average km per day', 'Days with mileage readings', 'Tracking km on those days', 'Mileage distance (km)', 'Difference (km, mileage − tracking)', 'Difference (%)', 'Active time (min)', 'GPS points'];
    const lines = this.sortedRows().map((r) => [
      r.employeeCode,
      r.employeeName,
      r.designation,
      r.post,
      r.unitName,
      r.daysWithData,
      r.totalKm.toFixed(2),
      r.avgKmPerDay.toFixed(2),
      r.mileageDays,
      r.mileage ? r.mileage.trackingKm.toFixed(2) : '',
      r.mileage ? r.mileage.mileageKm.toFixed(2) : '',
      r.mileage ? r.mileage.differenceKm.toFixed(2) : '',
      r.mileage?.differencePct != null ? r.mileage.differencePct.toFixed(1) : '',
      r.activeMinutes,
      r.pointCount,
    ]);
    downloadCsv(`tracking-report-summary_${rep.fromDate}_${rep.toDate}.csv`, [header, ...lines]);
  }

  exportDaywise() {
    const rep = this.report();
    if (!rep) return;
    const header = ['Employee code', 'Employee name', 'Designation', 'Post', 'Unit', 'Date', 'Tracking distance (km)', 'Start mileage', 'End mileage', 'Mileage distance (km)', 'Difference (km, mileage − tracking)', 'Difference (%)', 'First GPS point', 'Last GPS point', 'Active time (min)', 'GPS points'];
    const lines: (string | number)[][] = [];
    for (const r of this.sortedRows()) {
      for (const d of r.days) {
        lines.push([
          r.employeeCode,
          r.employeeName,
          r.designation,
          r.post,
          r.unitName,
          d.date,
          (d.totalDistanceKm ?? 0).toFixed(2),
          d.startMileage ?? '',
          d.endMileage ?? '',
          d.mileage ? d.mileage.mileageKm.toFixed(2) : '',
          d.mileage ? d.mileage.differenceKm.toFixed(2) : '',
          d.mileage?.differencePct != null ? d.mileage.differencePct.toFixed(1) : '',
          localTime(d.firstPointTime),
          localTime(d.lastPointTime),
          d.activeMinutes ?? 0,
          d.pointCount ?? 0,
        ]);
      }
    }
    downloadCsv(`tracking-report-daywise_${rep.fromDate}_${rep.toDate}.csv`, [header, ...lines]);
  }

  /** The filtered rows in the table's current sort order. */
  private sortedRows(): OfficerReportRow[] {
    const sort = this.sort();
    const rows = [...this.filteredRows()];
    return sort ? this.dataSource.sortData(rows, sort) : rows;
  }
}

function toRow(e: OfficerReport): OfficerReportRow {
  const days: DailyDistanceRow[] = [...(e.days ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, mileage: mileageCheck(d) }));
  const totalKm = days.reduce((s, d) => s + (d.totalDistanceKm ?? 0), 0);
  const checks = days.map((d) => d.mileage).filter((c): c is MileageCheck => !!c);
  const mileage = sumChecks(checks);
  return {
    ...e,
    days,
    daysWithData: days.length,
    totalKm,
    avgKmPerDay: days.length ? totalKm / days.length : 0,
    activeMinutes: days.reduce((s, d) => s + (d.activeMinutes ?? 0), 0),
    pointCount: days.reduce((s, d) => s + (d.pointCount ?? 0), 0),
    mileageDays: checks.length,
    mileage,
    mileageKm: mileage?.mileageKm ?? -Infinity,
    differenceKm: mileage?.differenceKm ?? -Infinity,
  };
}

/** Odometer vs GPS for one day, when both readings are there. */
function mileageCheck(d: DailyDistance): MileageCheck | null {
  if (d.startMileage == null || d.endMileage == null) return null;
  return check(d.endMileage - d.startMileage, d.totalDistanceKm ?? 0);
}

function sumChecks(list: MileageCheck[]): MileageCheck | null {
  if (!list.length) return null;
  return check(
    list.reduce((s, c) => s + c.mileageKm, 0),
    list.reduce((s, c) => s + c.trackingKm, 0),
  );
}

function check(mileageKm: number, trackingKm: number): MileageCheck {
  const differenceKm = mileageKm - trackingKm;
  return { mileageKm, trackingKm, differenceKm, differencePct: trackingKm > 0 ? (differenceKm / trackingKm) * 100 : null };
}

function quickRange(key: QuickRange): DateKeyRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = (offset: number) => toDateKey(new Date(y, m, now.getDate() + offset));
  switch (key) {
    case 'today':
      return { from: day(0), to: day(0) };
    case 'yesterday':
      return { from: day(-1), to: day(-1) };
    case 'last3':
      return { from: day(-2), to: day(0) };
    case 'thisWeek':
      return { from: day(-((now.getDay() + 6) % 7)), to: day(0) }; // Monday
    case 'thisMonth':
      return { from: toDateKey(new Date(y, m, 1)), to: day(0) };
    case 'lastMonth':
      return { from: toDateKey(new Date(y, m - 1, 1)), to: toDateKey(new Date(y, m, 0)) };
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Tracking roles lowest first, then any other role (alphabetical), for <mat-optgroup>. */
function groupByRole(officers: FieldOfficer[]) {
  const known = ['Credit Officer', 'Assistant Branch Manager', 'Branch Manager', 'Area Manager', 'Divisional Manager'];
  const others = [...new Set(officers.map((o) => o.role as string))].filter((r) => !known.includes(r)).sort();
  return [...known, ...others].map((role) => ({ role, officers: officers.filter((o) => o.role === role) })).filter((g) => g.officers.length);
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

function positive(v: number, fallback: number): number {
  const n = +v;
  return n > 0 ? n : fallback;
}

function localTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    // Text that starts like a formula gets a leading ' so Excel shows it as text.
    let s = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
