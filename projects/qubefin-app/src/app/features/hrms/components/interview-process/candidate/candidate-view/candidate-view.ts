import { Component, effect, inject, model, output } from '@angular/core';
import { CandidateStore } from '../../../../stores/candidate-store';
import { EMPTY_UUID } from 'qubefin-core';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
@Component({
  selector: 'qfin-candidate-view',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './candidate-view.html',
  styles: ``,
})
export class CandidateView {
  readonly datePipe = inject(DatePipe);
  readonly candidateStore = inject(CandidateStore);
  readonly candidateId = model<string>(EMPTY_UUID);
  // readonly showEdit = output<void>();
  readonly candidate = this.candidateStore.candidate;
  readonly loading = this.candidateStore.candidateLoading;
  readonly error = this.candidateStore.candidateError;
  constructor() {
    effect(() => {
      this.candidateStore.setCandidateId(this.candidateId());
    });
  }

  // onEdit() {
  //   this.showEdit.emit();
  // }
}
