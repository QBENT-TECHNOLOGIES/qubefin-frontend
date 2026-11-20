import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IInterviewPanelDto } from '../models/interview-panel';

@Injectable({
  providedIn: 'root',
})
export class InterviewPanelStore {
  private readonly candidateId = signal<string | undefined>(undefined);

  readonly panelsResource = httpResource<IInterviewPanelDto[]>(() => {
    const id = this.candidateId();
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.HRMS}/interview-panels/candidate/${id}`;
  });

  readonly panels = computed(() => this.panelsResource.value() ?? []);
  readonly loading = computed(() => this.panelsResource.isLoading());
  readonly error = computed(() => this.panelsResource.error());

  setCandidateId(id: string | undefined) {
    if (this.candidateId() === id) return;
    this.candidateId.set(id);
  }

  refreshPanels() {
    this.panelsResource.reload();
  }
}
