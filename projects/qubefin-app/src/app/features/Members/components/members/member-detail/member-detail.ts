import {
  afterRenderEffect,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { MemberStore } from '../../../stores/member-store';
import { AddressComponent } from './address-component/address-component';
import { KycComponent } from './kyc-component/kyc-component';
import { PersonalComponent } from './personal-component/personal-component';

@Component({
  selector: 'qfin-member-detail',
  imports: [MatStepperModule, LucideDynamicIcon, AddressComponent, KycComponent, PersonalComponent],
  templateUrl: './member-detail.html',
  styles: ``,
})
export class MemberDetail {
  emptyGuid = EMPTY_UUID;
  memberId = input<string>(EMPTY_UUID);
  onChildSave = output<string>();
  onCancel = output<void>();

  private pendingAdvance = false;
  readonly activeStepIndex = signal(0);
  private readonly memberStore = inject(MemberStore);
  utilityComponents = this.memberStore.utilityComponent;
  kycComponents = this.memberStore.kycComponent;

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  @ViewChild('stepper')
  matStepper!: MatStepper;

  constructor() {
    effect(() => {
      const id = this.memberId();

      if (id === EMPTY_UUID) {
        untracked(() => {
          this.activeStepIndex.set(0);

          if (this.matStepper) {
            this.matStepper.reset();
          }
        });
      }
    });

    afterRenderEffect(() => {
      const id = this.memberId();
      if (id !== EMPTY_UUID && this.pendingAdvance) {
        this.pendingAdvance = false;
        this.activeStepIndex.set(1);
      }
    });
  }

  onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }

  handlePersonal() {
    this.onStepChange(1);
  }

  handleKyc() {
    this.onStepChange(2);
  }

  handleAddress() {
    this.onStepChange(0);
  }

  handleSave(newId?: string) {
    this.onChildSave.emit(newId as string);

    if (newId && newId.length > 20) {
      this.pendingAdvance = true;
    }
  }

  ngAfterViewInit() {
    const header = this.stepper.nativeElement.querySelector(
      '.mat-horizontal-stepper-header-container',
    );

    if (!header) return;

    header.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();

        header.scrollBy({
          left: event.deltaY,
          behavior: 'smooth',
        });
      },
      { passive: false },
    );
  }
}
