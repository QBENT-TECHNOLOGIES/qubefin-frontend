import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { IInductionModel, InductionService } from '../../../services/induction.service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'qfin-induction-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule, MatRadioModule, LucideAngularModule],
  templateUrl: './induction-detail.html',
})
export class InductionDetail implements OnInit {
  candidateId = input.required<string>();

  private inductionService = inject(InductionService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  inductionForm!: FormGroup;

  inductionData = signal<IInductionModel>({
    candidateId: '',
    inductionStartDate: '',
    inductionStatus: 'Pending',
    welcomeChecklist: { welcomeToOrg: false, introduceStaff: false, confidentiality: false, equipmentUsage: false },
    roleChecklist: { workDuties: false, performanceProcess: false, orgStructure: false },
    workHoursChecklist: { hoursAndBreaks: false, leaveProcedures: false, travelRequirements: false },
    securityChecklist: { identityCard: false, passwords: false, firstAid: false, workplaceSafety: false },
    policiesChecklist: { termsAndConditions: false, attendance: false, disciplinary: false, codeOfConduct: false },
    exposureChecklist: { fieldVisit: false, branchActivities: false, clientInteraction: false },
    feedback: { informative: '', wellOrganized: '', comfortable: '', rulesExplained: '', overallSatisfied: '' }
  });

  feedbackOptions = ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'];

  ngOnInit() {
    this.inductionForm = this.fb.group({
      welcomeChecklist: this.fb.group({
        welcomeToOrg: [false], introduceStaff: [false], confidentiality: [false], equipmentUsage: [false]
      }),
      roleChecklist: this.fb.group({
        workDuties: [false], performanceProcess: [false], orgStructure: [false]
      }),
      workHoursChecklist: this.fb.group({
        hoursAndBreaks: [false], leaveProcedures: [false], travelRequirements: [false]
      }),
      securityChecklist: this.fb.group({
        identityCard: [false], passwords: [false], firstAid: [false], workplaceSafety: [false]
      }),
      policiesChecklist: this.fb.group({
        termsAndConditions: [false], attendance: [false], disciplinary: [false], codeOfConduct: [false]
      }),
      exposureChecklist: this.fb.group({
        fieldVisit: [false], branchActivities: [false], clientInteraction: [false]
      }),
      feedback: this.fb.group({
        informative: [''], wellOrganized: [''], comfortable: [''], rulesExplained: [''], overallSatisfied: ['']
      })
    });

    this.loadData();
  }

  loadData() {
    if (this.candidateId() === EMPTY_UUID || !this.candidateId()) return;

    this.inductionService.getInductionData(this.candidateId()).subscribe({
      next: (res) => {
        if (res) {
          this.inductionData.set(res);
          this.inductionForm.patchValue(res);
        }
      },
      error: () => {
        // Pending backend, do nothing
      }
    });
  }

  onSubmit() {
    const payload = { ...this.inductionData(), ...this.inductionForm.value, inductionStatus: 'Completed', candidateId: this.candidateId() };
    
    // Simulate API call for now (pending backend)
    this.inductionService.submitInduction(this.candidateId(), payload).subscribe({
      next: () => {
        this.inductionData.set(payload);
        this.alertService.success('Success', 'Induction Completed');
      },
      error: () => {
        // Mock success if API is down
        this.inductionData.set(payload);
        this.alertService.success('Success', 'Induction Completed (Local)');
      }
    });
  }
}
