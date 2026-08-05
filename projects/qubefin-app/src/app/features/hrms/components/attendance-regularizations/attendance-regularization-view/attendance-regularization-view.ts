import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { MatFormFieldModule } from '@angular/material/form-field';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../services/attendance-service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ApprovalRegularizationStore } from '../../../stores/approval-regularizations-store';
@Component({
  selector: 'qfin-attendance-regularization-view',
  imports: [
    CommonModule,
    DatePipe,
    LucideDynamicIcon,
    MatFormFieldModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './attendance-regularization-view.html',
  styles: ``,
})
export class AttendanceRegularizationView {
  private readonly store = inject(ApprovalRegularizationStore);
  // private readonly approveStore = inject(AttendanceRegularizationsStore);
  private readonly attendanceService = inject(AttendanceService);
  readonly regularizationId = model<string>(EMPTY_UUID);
  readonly save = output<void>();
  readonly showEdit = output<void>();
  readonly detail = this.store.regularization;
  readonly loading = this.store.regularizationUnitLoading;
  readonly error = this.store.regularizationUnitError;
  constructor() {
    effect(() => {
      this.store.setRegularizationId(this.regularizationId());
      this.remarks.set('');
    });
  }
  readonly remarks = signal<string>('');
  // onEdit() {
  //   this.showEdit.emit();
  // }
  onSubmitDecision(decision: string) {
    if (!this.remarks().trim()) {
      // Swal.fire('Warning', 'Remarks are mandatory.', 'warning');
      Swal.fire({
        html: `
              <div class="alert-icon-wrapper warning">
                <div class="circle-outer warning-outer">
                  <div class="circle-inner warning-inner">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L1 21h22L12 2z" fill="white"/>
                      <rect x="11" y="9" width="2" height="6" fill="#f59e0b"/>
                      <circle cx="12" cy="17.5" r="1" fill="#f59e0b"/>
                    </svg>
                  </div>
                </div>
              </div>
              <h2 class="swal-title">Warning!</h2>
              <p class="swal-text">Remarks are mandatory.</p>
              <svg viewBox="0 0 1440 320" class="btm-svg">
              <path fill="#f59e0b" fill-opacity="0.1" d="M0,96L30,112C60,128,120,160,180,149.3C240,139,300,85,360,101.3C420,117,480,203,540,229.3C600,256,660,224,720,224C780,224,840,256,900,277.3C960,299,1020,309,1080,293.3C1140,277,1200,235,1260,186.7C1320,139,1380,85,1410,58.7L1440,32L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"></path>
              </svg>
            `,
        showConfirmButton: true,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: 'swal-popup swal-popup-warning',
          confirmButton: 'swal-btn swal-btn-warning',
          cancelButton: 'swal-btn swal-btn-outline',
          actions: 'swal-actions',
        },
      });
      return;
    }

    const payload = {
      id: this.regularizationId(),
      decision: decision,
      remarks: this.remarks(),
    };

    // Swal.fire({
    //   title: 'Are you sure?',
    //   text: `You are about to submit the decision as: ${decision}`,
    //   icon: 'question',
    //   showCancelButton: true,
    //   confirmButtonColor: '#3085d6',
    //   cancelButtonColor: '#d33',
    //   confirmButtonText: `Yes, ${decision}`,
    // }).then((result) => {
    //   if (result.isConfirmed) {
    this.attendanceService.submitRegularization(payload).subscribe({
      next: (resp: any) => {
        Swal.fire({
          html: `
                   <div class="alert-icon-wrapper success">
                     <div class="confetti c1"></div>
                     <div class="confetti c2"></div>
                     <div class="confetti c3"></div>
                     <div class="confetti c4"></div>
                     <div class="confetti c5"></div>
                     <div class="circle-outer success-outer">
                       <div class="circle-inner success-inner">
                         <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                           <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3"
                             stroke-linecap="round" stroke-linejoin="round"/>
                         </svg>
                       </div>
                     </div>
                   </div>
                   <h2 class="swal-title">Success!</h2>
                   <p class="swal-text">${resp.value.message}</p>
              <svg viewBox="0 0 1440 320" class="btm-svg">
                <path fill="#2fae59" fill-opacity="0.1" d="M0,96L34.3,122.7C68.6,149,137,203,206,240C274.3,277,343,299,411,298.7C480,299,549,277,617,272C685.7,267,754,277,823,272C891.4,267,960,245,1029,213.3C1097.1,181,1166,139,1234,117.3C1302.9,96,1371,96,1406,96L1440,96L1440,320L1405.7,320C1371.4,320,1303,320,1234,320C1165.7,320,1097,320,1029,320C960,320,891,320,823,320C754.3,320,686,320,617,320C548.6,320,480,320,411,320C342.9,320,274,320,206,320C137.1,320,69,320,34,320L0,320Z"></path>
              </svg>
                 `,
          showConfirmButton: true,
          confirmButtonText: 'Ok',
          reverseButtons: true,
          buttonsStyling: false,
          customClass: {
            popup: 'swal-popup swal-popup-success',
            confirmButton: 'swal-btn swal-btn-success',
            actions: 'swal-actions',
          },
        }).then(() => {
          this.save.emit();
          this.store.refreshDetail();
          this.store.refreshList();
        });
      },
      error: (err: any) => {
        Swal.fire({
          html: `
                   <div class="error-shape es1"></div>
                   <div class="error-shape es2"></div>
                   <div class="error-shape es3"></div>
                   <div class="error-shape-solid es4"></div>
                   <div class="alert-badge error-badge">!</div>
                   <div class="alert-icon-wrapper error">
                     <div class="circle-outer error-outer">
                       <div class="circle-inner error-inner">
                         <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                           <path d="M6 6l12 12M18 6L6 18" stroke="white" stroke-width="3"
                             stroke-linecap="round" stroke-linejoin="round"/>
                         </svg>
                       </div>
                     </div>
                   </div>
                   <h2 class="swal-title">Failed!</h2>
                   <p class="swal-text">We couldn't complete your action.<br>Please check the details and try again.</p>
                   <svg viewBox="0 0 1440 320" class="btm-svg">
                   <path fill="#e34d4d" fill-opacity="0.1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,272C672,277,768,267,864,245.3C960,224,1056,192,1152,154.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                   </svg>
                 `,
          showConfirmButton: true,
          reverseButtons: true,
          buttonsStyling: false,
          customClass: {
            popup: 'swal-popup swal-popup-error',
            confirmButton: 'swal-btn swal-btn-error',
            actions: 'swal-actions',
          },
        });
      },
    });
    // }
    // });
  }
}
