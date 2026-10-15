import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDragPreview, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { InterviewPanelService } from '../../services/interview-panel-service';
import { PanelTaggingService } from '../../services/panel-tagging.service';
import { IPanelCandidate, IPanelistOption, IPanelMember, IPanelSlot } from '../../models/panel-tagging';
import { toApiDate, toDisplayTime, toLocalDate } from '../../components/interview-process/interview-time';
import { PanelistPicker } from '../../components/interview-process/candidate/panelist-picker/panelist-picker';

const UNTAGGED = 'untagged';

/** One board column: the "Not tagged" column, a panel, or a new panel that has no candidates yet. */
interface IBoardColumn {
  key: string;
  members: IPanelMember[];
  candidates: IPanelCandidate[];
  isDraft: boolean;
}

interface IDayTile {
  date: string;
  day: Date;
  candidates: number;
  untagged: number;
}

interface ISidePane {
  mode: 'new' | 'edit';
  columnKey?: string;
}

/** Panel Tagging board (HR): pick a day of the week and a venue, then drag candidates between the "Not tagged"
 * column and the panels of that date and venue. */
@Component({
  selector: 'qfin-panel-tagging-component',
  imports: [
    CommonModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    CdkDragPlaceholder,
    MatMenuModule,
    MatTooltipModule,
    LucideDynamicIcon,
    PanelistPicker,
  ],
  templateUrl: './panel-tagging-component.html',
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
    .board-column.cdk-drop-list-receiving .drop-hint { display: flex; }
    .drop-hint { display: none; }
    .cdk-drag-animating { transition: transform 200ms cubic-bezier(0, 0, 0.2, 1); }
    .board-column.cdk-drop-list-dragging .candidate-card:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `,
})
export class PanelTaggingComponent {
  private readonly router = inject(Router);
  private readonly panelService = inject(InterviewPanelService);
  private readonly alertService = inject(AlertService);
  protected readonly tagging = inject(PanelTaggingService);
  protected readonly UNTAGGED = UNTAGGED;

  private readonly todayDate = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly today = toApiDate(this.todayDate)!;

  // --- Week / day / venue ---
  protected readonly weekStart = signal<Date>(this.mondayOf(this.todayDate));
  protected readonly selectedDate = signal<string>(this.today);
  protected readonly selectedVenueId = signal<string>('');

  // --- Data ---
  protected readonly slots = signal<IPanelSlot[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);

  // --- Board state ---
  /** Candidates picked with Ctrl / Shift + click; dragged or moved together. */
  protected readonly selectedCards = signal<Set<string>>(new Set());
  /** New panels per slot that have no candidates yet - they only exist here until a candidate is dropped in. */
  private readonly draftPanels = signal<Record<string, IPanelMember[][]>>({});
  protected readonly sidePane = signal<ISidePane | null>(null);
  protected readonly pickerSelection = signal<IPanelistOption[]>([]);

  protected readonly days = computed<IDayTile[]>(() => {
    const start = this.weekStart();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const date = toApiDate(day)!;
      const slots = this.slots().filter((s) => s.interviewDate === date);
      const untagged = slots.reduce((n, s) => n + s.untaggedCandidates.length, 0);
      const tagged = slots.reduce((n, s) => n + s.panels.reduce((m, p) => m + p.candidates.length, 0), 0);
      return { date, day, candidates: tagged + untagged, untagged };
    });
  });

  protected readonly weekLabel = computed(() => {
    const days = this.days();
    return { from: days[0].day, to: days[6].day };
  });

  protected readonly daySlots = computed(() => this.slots().filter((s) => s.interviewDate === this.selectedDate()));

  protected readonly slot = computed(
    () => this.daySlots().find((s) => s.venueOrganizationUnitId === this.selectedVenueId()) ?? this.daySlots()[0] ?? null,
  );

  protected readonly isReadOnly = computed(() => !!this.slot()?.isPast || this.selectedDate() < this.today);

  protected readonly columns = computed<IBoardColumn[]>(() => {
    const slot = this.slot();
    if (!slot) return [];
    const panels: IBoardColumn[] = slot.panels.map((p) => ({
      key: p.panelKey,
      members: p.members,
      candidates: p.candidates,
      isDraft: false,
    }));
    const existing = new Set(panels.map((p) => p.key));
    const drafts: IBoardColumn[] = (this.draftPanels()[this.slotKey(slot)] ?? [])
      .map((members) => ({ key: this.tagging.keyOf(members.map((m) => m.employeeId)), members, candidates: [], isDraft: true }))
      .filter((d) => !existing.has(d.key));
    return [
      { key: UNTAGGED, members: [], candidates: slot.untaggedCandidates, isDraft: false },
      ...panels,
      ...drafts,
    ];
  });

  constructor() {
    this.load();
    // A day without interviews of the chosen venue falls back to that day's first venue.
    effect(() => {
      const slot = this.slot();
      if (slot && slot.venueOrganizationUnitId !== this.selectedVenueId()) {
        this.selectedVenueId.set(slot.venueOrganizationUnitId);
      }
    });
  }

  // --- Loading ---

  protected load() {
    const start = this.weekStart();
    this.loading.set(true);
    this.loadError.set(null);
    this.panelService
      .getPanelBoard({
        dateFrom: toApiDate(start),
        dateTo: toApiDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
        venueOrganizationUnitId: null,
        companyId: null,
      })
      .subscribe({
        next: (slots) => {
          this.slots.set(slots ?? []);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.slots.set([]);
          this.loadError.set(
            error?.status === 403
              ? 'Only HR can manage panel tagging.'
              : this.tagging.errorMessage(error, 'Unable to load interview panels.'),
          );
        },
      });
  }

  protected shiftWeek(weeks: number) {
    const start = this.weekStart();
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeks * 7);
    this.weekStart.set(next);
    this.selectDay(toApiDate(next)!);
    this.load();
  }

  protected thisWeek() {
    this.weekStart.set(this.mondayOf(this.todayDate));
    this.selectDay(this.today);
    this.load();
  }

  protected clearSelection() {
    this.selectedCards.set(new Set());
  }

  protected selectDay(date: string) {
    this.selectedDate.set(date);
    this.selectedCards.set(new Set());
    this.sidePane.set(null);
  }

  protected selectVenue(venueId: string) {
    this.selectedVenueId.set(venueId);
    this.selectedCards.set(new Set());
    this.sidePane.set(null);
  }

  // --- Card selection ---

  protected onCardClick(event: MouseEvent, candidate: IPanelCandidate) {
    if (candidate.isLocked || this.isReadOnly()) return;
    const id = candidate.candidateId;
    const multi = event.ctrlKey || event.metaKey || event.shiftKey;
    this.selectedCards.update((current) => {
      if (multi) {
        const next = new Set(current);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }
      // A plain click selects just this card; clicking the only selected card clears the selection.
      return current.size === 1 && current.has(id) ? new Set() : new Set([id]);
    });
  }

  /** The cards an action applies to: the selection when the card is part of it, otherwise just the card. */
  protected targetsFor(candidate: IPanelCandidate): string[] {
    const selected = this.selectedCards();
    return selected.has(candidate.candidateId) ? [...selected] : [candidate.candidateId];
  }

  // --- Drag and drop ---

  protected canEnter = (drag: CdkDrag<IPanelCandidate>): boolean => !drag.data.isLocked && !this.isReadOnly();

  protected onDrop(event: CdkDragDrop<string, string, IPanelCandidate>) {
    if (event.previousContainer === event.container) return;
    this.moveTo(this.targetsFor(event.item.data), event.container.data);
  }

  /** Moves candidates to a column: untags for "Not tagged", otherwise takes that panel's panelists. */
  protected moveTo(candidateIds: string[], columnKey: string) {
    const column = this.columns().find((c) => c.key === columnKey);
    if (!column || !candidateIds.length || this.saving()) return;

    // Candidates already in the target column need no change.
    const ids = candidateIds.filter((id) => !column.candidates.some((c) => c.candidateId === id));
    if (!ids.length) return;

    if (columnKey === UNTAGGED) {
      this.alertService
        .confirm('Untag candidates?', `${ids.length} candidate(s) will be removed from their panel.`, 'Yes, untag', 'Cancel')
        .then((result) => result.isConfirmed && this.run(this.tagging.untag(ids)));
      return;
    }

    this.run(this.tagging.assign(ids, column.members.map((m) => m.employeeId)));
  }

  protected untagColumn(column: IBoardColumn) {
    const ids = column.candidates.filter((c) => !c.isLocked).map((c) => c.candidateId);
    if (!ids.length) {
      this.alertService.warning('Nothing to untag', 'Every candidate on this panel has already started the interview.');
      return;
    }
    this.moveTo(ids, UNTAGGED);
  }

  protected removeDraft(column: IBoardColumn) {
    const slot = this.slot();
    if (!slot) return;
    const key = this.slotKey(slot);
    this.draftPanels.update((drafts) => ({
      ...drafts,
      [key]: (drafts[key] ?? []).filter((m) => this.tagging.keyOf(m.map((x) => x.employeeId)) !== column.key),
    }));
  }

  // --- Side pane: new panel / change members ---

  protected openNewPanel() {
    this.pickerSelection.set([]);
    this.sidePane.set({ mode: 'new' });
  }

  protected openEditMembers(column: IBoardColumn) {
    this.pickerSelection.set(
      column.members.map((m) => ({ id: m.employeeId, name: m.employeeName, code: m.employeeCode, currentDesignation: m.designation })),
    );
    this.sidePane.set({ mode: 'edit', columnKey: column.key });
  }

  protected saveSidePane() {
    const pane = this.sidePane();
    const slot = this.slot();
    const members: IPanelMember[] = this.pickerSelection().map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      employeeCode: e.code ?? '',
      designation: e.currentDesignation ?? null,
    }));
    if (!pane || !slot) return;
    if (!members.length) {
      this.alertService.warning('Panelists required', 'Select at least one panelist.');
      return;
    }

    const newKey = this.tagging.keyOf(members.map((m) => m.employeeId));
    const clash = this.columns().find((c) => c.key === newKey && c.key !== pane.columnKey);
    if (clash) {
      this.alertService.warning('Panel already exists', 'A panel with exactly these panelists is already on the board.');
      return;
    }

    const column = pane.columnKey ? this.columns().find((c) => c.key === pane.columnKey) : undefined;
    if (pane.mode === 'new' || column?.isDraft) {
      if (column) this.removeDraft(column);
      const key = this.slotKey(slot);
      this.draftPanels.update((drafts) => ({ ...drafts, [key]: [...(drafts[key] ?? []), members] }));
      this.sidePane.set(null);
      return;
    }

    if (!column) return;
    const unlocked = column.candidates.filter((c) => !c.isLocked).map((c) => c.candidateId);
    const lockedCount = column.candidates.length - unlocked.length;
    if (!unlocked.length) {
      this.alertService.warning('Panel is locked', 'Every candidate on this panel has already started the interview.');
      return;
    }
    const send = () => this.run(this.tagging.assign(unlocked, members.map((m) => m.employeeId)));
    if (!lockedCount) {
      send();
      return;
    }
    this.alertService
      .confirm(
        'Some candidates keep the old panel',
        `${lockedCount} candidate(s) have already started the interview and keep their current panelists. The change applies to the other ${unlocked.length}.`,
        'Continue',
        'Cancel',
      )
      .then((result) => result.isConfirmed && send());
  }

  // --- Saving ---

  private run(request: ReturnType<PanelTaggingService['untag']>) {
    this.saving.set(true);
    request.subscribe({
      next: (message) => {
        this.saving.set(false);
        this.selectedCards.set(new Set());
        this.sidePane.set(null);
        this.alertService.toast('success', typeof message === 'string' ? message : 'Saved.', 3000);
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.alertService.error('Failed', this.tagging.errorMessage(error, 'The panel could not be saved.'));
      },
    });
  }

  // --- Navigation / display ---

  protected backToCandidates() {
    this.router.navigate(['/secure/hrms/candidate']);
  }

  protected slotKey(slot: IPanelSlot): string {
    return `${slot.interviewDate}|${slot.venueOrganizationUnitId}`;
  }

  protected venueCount(slot: IPanelSlot): number {
    return slot.untaggedCandidates.length + slot.panels.reduce((n, p) => n + p.candidates.length, 0);
  }

  protected otherColumns(column: IBoardColumn): IBoardColumn[] {
    return this.columns().filter((c) => c.key !== column.key);
  }

  protected columnStatus(column: IBoardColumn): { label: string; cls: string } {
    return this.tagging.panelStatus({ panelKey: column.key, members: column.members, candidates: column.candidates }, this.isReadOnly());
  }

  protected columnLabel(column: IBoardColumn): string {
    return column.key === UNTAGGED ? 'Not tagged' : this.tagging.panelLabel(column.members);
  }

  protected displayTime(value: string | null): string {
    return toDisplayTime(value) || '-';
  }

  protected toDate(value: string): Date | '' {
    return toLocalDate(value);
  }

  private mondayOf(date: Date): Date {
    const offset = (date.getDay() + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  }
}
