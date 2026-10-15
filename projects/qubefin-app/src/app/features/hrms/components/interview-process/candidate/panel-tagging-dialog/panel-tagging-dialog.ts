import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { PanelTaggingService } from '../../../../services/panel-tagging.service';
import {
  IPanelCandidate,
  IPanelGroup,
  IPanelistOption,
  IPanelSlot,
} from '../../../../models/panel-tagging';
import { toApiDate, toDisplayTime, toLocalDate } from '../../interview-time';
import { PanelistPicker } from '../panelist-picker/panelist-picker';

export interface IPanelTaggingDialogData {
  /** Opened from a candidate row: only that candidate's date is loaded and the candidate is pre-selected. */
  candidateId?: string;
  candidateName?: string;
  interviewDate?: string | null;
}

/** What the right-hand pane shows: one panel, or the untagged candidates of a date + venue. */
interface ISelection {
  slotKey: string;
  panelKey: string | null;
}

type PaneMode = 'view' | 'editMembers' | 'newPanel';

const DEFAULT_RANGE_DAYS = 30;

/** Panel Tagging (HR): every upcoming interview panel - candidates sharing a date, venue and panelists - with
 * tagging, moving, untagging and member changes. Closes with `true` when anything was saved. */
@Component({
  selector: 'qfin-panel-tagging-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatTooltipModule,
    LucideDynamicIcon,
    PanelistPicker,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './panel-tagging-dialog.html',
  styles: `
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      color: var(--pill-fg);
      background: color-mix(in srgb, var(--pill-fg) 10%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pill-fg) 22%, transparent);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: currentColor;
      flex-shrink: 0;
    }
    .pill-slate { --pill-fg: #64748b; }
    .pill-blue { --pill-fg: #2563eb; }
    .pill-amber { --pill-fg: #d97706; }
    .pill-violet { --pill-fg: #7c3aed; }
    .pill-emerald { --pill-fg: #059669; }
    .pill-rose { --pill-fg: #e11d48; }
  `,
})
export class PanelTaggingDialog {
  private readonly dialogRef = inject(MatDialogRef<PanelTaggingDialog>);
  private readonly panelService = inject(InterviewPanelService);
  protected readonly tagging = inject(PanelTaggingService);
  private readonly alertService = inject(AlertService);
  protected readonly data = inject<IPanelTaggingDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected readonly isCandidateMode = !!this.data.candidateId;
  protected readonly today = new Date(new Date().setHours(0, 0, 0, 0));

  // --- Filters ---
  protected readonly dateFrom = signal<Date | ''>(
    this.isCandidateMode ? toLocalDate(this.data.interviewDate) : this.today,
  );
  protected readonly dateTo = signal<Date | ''>(
    this.isCandidateMode
      ? toLocalDate(this.data.interviewDate)
      : new Date(this.today.getTime() + DEFAULT_RANGE_DAYS * 86_400_000),
  );
  protected readonly venueFilter = signal<string>('');

  // --- Data ---
  protected readonly slots = signal<IPanelSlot[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  private changed = false;

  // --- Selection / pane state ---
  protected readonly selection = signal<ISelection | null>(null);
  protected readonly mode = signal<PaneMode>('view');
  protected readonly checkedTagged = signal<Set<string>>(new Set());
  protected readonly checkedEligible = signal<Set<string>>(new Set());
  protected readonly pickerSelection = signal<IPanelistOption[]>([]);
  protected readonly moveTargetKey = signal<string>('');
  protected readonly tagTargetKey = signal<string>('');

  protected readonly venues = computed(() => {
    const unique = new Map<string, string>();
    this.slots().forEach((s) => unique.set(s.venueOrganizationUnitId, s.venueName));
    return [...unique].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly visibleSlots = computed(() => {
    const venue = this.venueFilter();
    return venue ? this.slots().filter((s) => s.venueOrganizationUnitId === venue) : this.slots();
  });

  /** Slots grouped under their date heading for the left list. */
  protected readonly slotsByDate = computed(() => {
    const groups = new Map<string, IPanelSlot[]>();
    this.visibleSlots().forEach((s) => groups.set(s.interviewDate, [...(groups.get(s.interviewDate) ?? []), s]));
    return [...groups].map(([date, slots]) => ({ date, slots }));
  });

  protected readonly totals = computed(() => {
    const slots = this.visibleSlots();
    return {
      panels: slots.reduce((n, s) => n + s.panels.length, 0),
      untagged: slots.reduce((n, s) => n + s.untaggedCandidates.length, 0),
    };
  });

  protected readonly selectedSlot = computed(() => {
    const key = this.selection()?.slotKey;
    return key ? (this.slots().find((s) => this.slotKey(s) === key) ?? null) : null;
  });

  protected readonly selectedPanel = computed(() => {
    const panelKey = this.selection()?.panelKey;
    return panelKey ? (this.selectedSlot()?.panels.find((p) => p.panelKey === panelKey) ?? null) : null;
  });

  /** Candidates that can be added to the selected panel: untagged ones and those on another panel of the slot. */
  protected readonly eligibleForPanel = computed(() => {
    const slot = this.selectedSlot();
    const panel = this.selectedPanel();
    if (!slot || !panel) return [];
    const fromOtherPanels = slot.panels
      .filter((p) => p.panelKey !== panel.panelKey)
      .flatMap((p) => p.candidates.filter((c) => !c.isLocked).map((c) => ({ ...c, currentPanel: this.panelLabel(p) })));
    return [...slot.untaggedCandidates.map((c) => ({ ...c, currentPanel: null as string | null })), ...fromOtherPanels];
  });

  /** Other panels of the same date and venue - the only valid targets for a move. */
  protected readonly siblingPanels = computed(() => {
    const slot = this.selectedSlot();
    const key = this.selection()?.panelKey;
    return slot ? slot.panels.filter((p) => p.panelKey !== key) : [];
  });

  constructor() {
    inject(DateAdapter<Date>).setLocale('en-GB');
    this.load();
  }

  // --- Loading ---

  protected load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.panelService
      .getPanelBoard({
        dateFrom: toApiDate(this.dateFrom() || null),
        dateTo: toApiDate(this.dateTo() || null),
        venueOrganizationUnitId: null,
        companyId: null,
      })
      .subscribe({
        next: (slots) => {
          this.slots.set(slots ?? []);
          this.loading.set(false);
          this.restoreSelection();
        },
        error: (error) => {
          this.loading.set(false);
          this.loadError.set(
            error?.status === 403
              ? 'Only HR can manage panel tagging.'
              : (error?.error?.message ?? error?.error?.detail ?? 'Unable to load interview panels.'),
          );
        },
      });
  }

  /** Keeps the current selection after a reload; on first load in candidate mode selects that candidate. */
  private restoreSelection() {
    const current = this.selection();
    if (current && this.selectedSlot()) {
      if (current.panelKey && !this.selectedPanel()) {
        this.select(current.slotKey, null);
      }
      return;
    }

    if (this.isCandidateMode && !current) {
      const id = this.data.candidateId!;
      for (const slot of this.slots()) {
        const panel = slot.panels.find((p) => p.candidates.some((c) => c.candidateId === id));
        if (panel) {
          this.select(this.slotKey(slot), panel.panelKey);
          this.checkedTagged.set(new Set([id]));
          return;
        }
        if (slot.untaggedCandidates.some((c) => c.candidateId === id)) {
          this.select(this.slotKey(slot), null);
          this.checkedEligible.set(new Set([id]));
          return;
        }
      }
      return;
    }

    this.selection.set(null);
  }

  protected onDateChange() {
    if (this.dateFrom() && this.dateTo() && this.dateTo() < this.dateFrom()) {
      this.dateTo.set(this.dateFrom());
    }
    this.selection.set(null);
    this.load();
  }

  // --- Selection ---

  protected slotKey(slot: IPanelSlot): string {
    return `${slot.interviewDate}|${slot.venueOrganizationUnitId}`;
  }

  protected select(slotKey: string, panelKey: string | null) {
    this.selection.set({ slotKey, panelKey });
    this.mode.set('view');
    this.checkedTagged.set(new Set());
    this.checkedEligible.set(new Set());
    this.moveTargetKey.set('');
    this.tagTargetKey.set('');
  }

  protected isSelected(slot: IPanelSlot, panelKey: string | null): boolean {
    const s = this.selection();
    return !!s && s.slotKey === this.slotKey(slot) && s.panelKey === panelKey;
  }

  protected toggle(set: 'tagged' | 'eligible', id: string, checked: boolean) {
    const target = set === 'tagged' ? this.checkedTagged : this.checkedEligible;
    target.update((current) => {
      const next = new Set(current);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  protected toggleAll(set: 'tagged' | 'eligible', candidates: IPanelCandidate[], checked: boolean) {
    const target = set === 'tagged' ? this.checkedTagged : this.checkedEligible;
    target.set(new Set(checked ? candidates.filter((c) => !c.isLocked).map((c) => c.candidateId) : []));
  }

  protected allChecked(set: 'tagged' | 'eligible', candidates: IPanelCandidate[]): boolean {
    const selectable = candidates.filter((c) => !c.isLocked);
    const checked = set === 'tagged' ? this.checkedTagged() : this.checkedEligible();
    return selectable.length > 0 && selectable.every((c) => checked.has(c.candidateId));
  }

  // --- Pane modes ---

  protected startEditMembers() {
    const panel = this.selectedPanel();
    if (!panel) return;
    this.pickerSelection.set(
      panel.members.map((m) => ({ id: m.employeeId, name: m.employeeName, code: m.employeeCode, currentDesignation: m.designation })),
    );
    this.mode.set('editMembers');
  }

  protected startNewPanel() {
    this.pickerSelection.set([]);
    this.mode.set('newPanel');
  }

  protected cancelMode() {
    this.mode.set('view');
  }

  // --- Actions ---

  /** Tags the checked eligible candidates to the selected panel. */
  protected tagToSelectedPanel() {
    const panel = this.selectedPanel();
    const ids = [...this.checkedEligible()];
    if (!panel || !ids.length) return;
    this.assign(ids, panel.members.map((m) => m.employeeId), `${ids.length} candidate(s) tagged to ${this.panelLabel(panel)}.`);
  }

  /** Untagged view: tags the checked candidates to an existing panel of the same date and venue. */
  protected tagToExistingPanel() {
    const target = this.selectedSlot()?.panels.find((p) => p.panelKey === this.tagTargetKey());
    const ids = [...this.checkedEligible()];
    if (!target || !ids.length) return;
    this.assign(ids, target.members.map((m) => m.employeeId), null, target.panelKey);
  }

  /** Moves the checked tagged candidates to another panel of the same date and venue. */
  protected moveChecked() {
    const target = this.siblingPanels().find((p) => p.panelKey === this.moveTargetKey());
    const ids = [...this.checkedTagged()];
    if (!target || !ids.length) return;
    this.alertService
      .confirm(
        'Move candidates?',
        `${ids.length} candidate(s) will be moved to ${this.panelLabel(target)}. Panelists not on the new panel are removed, and the new panelists are mailed.`,
        'Yes, move',
        'Cancel',
      )
      .then((result) => {
        if (result.isConfirmed) {
          this.assign(ids, target.members.map((m) => m.employeeId), null, target.panelKey);
        }
      });
  }

  protected untagChecked() {
    const ids = [...this.checkedTagged()];
    if (!ids.length) return;
    this.alertService
      .confirm('Untag candidates?', `${ids.length} candidate(s) will be removed from this panel.`, 'Yes, untag', 'Cancel')
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        this.panelService.untagCandidates(ids).subscribe({
          next: (message) => this.afterSave(message, null),
          error: (error) => this.onSaveError(error),
        });
      });
  }

  /** Saves the picker: new members for every candidate of the panel, or a new panel for the checked candidates. */
  protected savePicker() {
    const employeeIds = this.pickerSelection().map((e) => e.id);
    if (!employeeIds.length) {
      this.alertService.warning('Panelists required', 'Select at least one panelist.');
      return;
    }

    if (this.mode() === 'newPanel') {
      const ids = [...this.checkedEligible()];
      if (!ids.length) {
        this.alertService.warning('Candidates required', 'Select at least one candidate for the new panel.');
        return;
      }
      this.assign(ids, employeeIds, null, this.keyOf(employeeIds));
      return;
    }

    const panel = this.selectedPanel();
    if (!panel) return;
    const unlocked = panel.candidates.filter((c) => !c.isLocked).map((c) => c.candidateId);
    const lockedCount = panel.candidates.length - unlocked.length;
    if (!unlocked.length) {
      this.alertService.warning('Panel is locked', 'Every candidate on this panel has already started the interview.');
      return;
    }

    const send = () => this.assign(unlocked, employeeIds, null, this.keyOf(employeeIds));
    if (!lockedCount) {
      send();
      return;
    }
    this.alertService
      .confirm(
        'Some candidates keep the old panel',
        `${lockedCount} candidate(s) have already started the interview and will keep the current panelists. The change applies to the other ${unlocked.length}.`,
        'Continue',
        'Cancel',
      )
      .then((result) => result.isConfirmed && send());
  }

  private assign(candidateIds: string[], employeeIds: string[], successMessage: string | null, selectPanelKey?: string) {
    this.saving.set(true);
    this.tagging.assign(candidateIds, employeeIds).subscribe({
      next: (message) => this.afterSave(successMessage ?? message, selectPanelKey ?? null),
      error: (error) => this.onSaveError(error),
    });
  }

  private afterSave(message: string | unknown, selectPanelKey: string | null) {
    this.saving.set(false);
    this.changed = true;
    this.alertService.toast('success', typeof message === 'string' ? message : 'Saved successfully.', 3000);
    const slotKey = this.selection()?.slotKey;
    if (slotKey) {
      this.select(slotKey, selectPanelKey ?? this.selection()?.panelKey ?? null);
    }
    this.load();
  }

  private onSaveError(error: any) {
    this.saving.set(false);
    this.alertService.error('Failed', this.tagging.errorMessage(error, 'The panel could not be saved.'));
  }

  protected close() {
    this.dialogRef.close(this.changed);
  }

  // --- Display helpers ---

  private keyOf(employeeIds: string[]): string {
    return this.tagging.keyOf(employeeIds);
  }

  protected panelLabel(panel: IPanelGroup): string {
    return this.tagging.panelLabel(panel.members);
  }

  protected panelStatus(panel: IPanelGroup, slot: IPanelSlot): { label: string; cls: string } {
    return this.tagging.panelStatus(panel, slot.isPast);
  }

  protected candidateProgress(c: IPanelCandidate): { label: string; cls: string } {
    return this.tagging.candidateProgress(c);
  }

  protected displayTime(value: string | null): string {
    return toDisplayTime(value) || '-';
  }

  protected initials(name: string | null | undefined): string {
    return this.tagging.initials(name);
  }
}
