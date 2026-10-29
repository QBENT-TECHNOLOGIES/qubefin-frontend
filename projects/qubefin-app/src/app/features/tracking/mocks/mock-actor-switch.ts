import { Component, computed, inject, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ENV_CONFIG } from 'qubefin-core';
import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { ROLE_LABEL } from '../utils/tracking-labels';
import { MOCK_ACTOR_KEY } from './mock-actor-key';

function readActor(): string {
  try {
    return sessionStorage.getItem(MOCK_ACTOR_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * MOCK ONLY. Lets you act as any employee so the role rules (who can assign, transfer, update) can be tried.
 * Renders nothing unless `useTrackingMocks` is on. The real backend takes the user from the access token,
 * so delete this component (and its tag on the Jobs page) together with the mocks folder.
 */
@Component({
  selector: 'qfin-trk-mock-actor',
  imports: [MatFormFieldModule, MatSelectModule, MatTooltipModule],
  template: `
    @if (enabled) {
      <div class="w-72" matTooltip="Mock data only: act as another user to try the role rules">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-label>Mock · acting as</mat-label>
          <mat-select [value]="actorId()" (valueChange)="select($event)">
            <mat-option value="">Head Office Admin · Administrator</mat-option>
            @for (g of groups(); track g.role) {
              <mat-optgroup [label]="ROLE_LABEL[g.role] + 's'">
                @for (o of g.officers; track o.id) {
                  <mat-option [value]="o.id">{{ o.name }} · {{ o.unitName }}</mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
        </mat-form-field>
      </div>
    }
  `,
})
export class MockActorSwitch {
  readonly enabled = !!inject(ENV_CONFIG, { optional: true })?.useTrackingMocks;
  readonly changed = output<string>();
  readonly ROLE_LABEL = ROLE_LABEL;

  readonly actorId = signal(readActor());
  private readonly officers = signal<FieldOfficer[]>([]);

  readonly groups = computed(() =>
    (['DM', 'AM', 'BM', 'ABM', 'CO'] as OfficerRole[])
      .map((role) => ({ role, officers: this.officers().filter((o) => o.role === role) }))
      .filter((g) => g.officers.length),
  );

  constructor() {
    // Lazy, like the rest of the mock: the seed data never lands in the Jobs chunk.
    if (this.enabled) import('./tracking-mock-db').then((m) => this.officers.set(m.mockDb().officers));
  }

  select(id: string) {
    try {
      if (id) sessionStorage.setItem(MOCK_ACTOR_KEY, id);
      else sessionStorage.removeItem(MOCK_ACTOR_KEY);
    } catch {
      /* storage blocked: the mock stays on the admin */
    }
    this.actorId.set(id);
    this.changed.emit(id);
  }
}
