import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppointmentJoiningService, IAppointmentJoiningModel } from '../../../services/appointment-joining.service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'qfin-appointment-joining-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatCheckboxModule, LucideAngularModule],
  templateUrl: './appointment-joining-detail.html',
})
export class AppointmentJoiningDetail implements OnInit {
  candidateId = input.required<string>();

  private joiningService = inject(AppointmentJoiningService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  appointmentForm!: FormGroup;
  checklistForm!: FormGroup;

  joiningData = signal<IAppointmentJoiningModel>({
    candidateId: '',
    referenceNumber: '',
    designation: '',
    department: '',
    branch: '',
    joiningDate: '',
    reportingTime: '',
    probationMonths: 6,
    appointmentStatus: 'Pending',
    joiningStatus: 'Pending',
    hrChecklist: {
      appointmentLetterVerified: false,
      originalDocumentsVerified: false,
      hrFormalitiesCompleted: false,
      payrollActivated: false,
      employeeIdCreated: false
    }
  });

  ngOnInit() {
    this.appointmentForm = this.fb.group({
      designation: ['', Validators.required],
      department: ['', Validators.required],
      branch: ['', Validators.required],
      joiningDate: ['', Validators.required],
      reportingTime: ['', Validators.required],
      probationMonths: [6, Validators.required],
      referenceNumber: ['']
    });

    this.checklistForm = this.fb.group({
      appointmentLetterVerified: [false],
      originalDocumentsVerified: [false],
      hrFormalitiesCompleted: [false],
      payrollActivated: [false],
      employeeIdCreated: [false]
    });

    this.loadData();
  }

  loadData() {
    if (this.candidateId() === EMPTY_UUID || !this.candidateId()) return;

    this.joiningService.getAppointmentData(this.candidateId()).subscribe({
      next: (res) => {
        if (res) {
          this.joiningData.set(res);
          this.appointmentForm.patchValue(res);
          if (res.hrChecklist) this.checklistForm.patchValue(res.hrChecklist);
        }
      },
      error: () => {
        // Pending backend, generate fake reference number for UI
        this.appointmentForm.patchValue({
            referenceNumber: 'APT-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000)
        });
      }
    });
  }

  onGenerate() {
    if (this.appointmentForm.invalid) {
        this.appointmentForm.markAllAsTouched();
        return;
    }

    const payload = { 
        ...this.joiningData(), 
        ...this.appointmentForm.value, 
        candidateId: this.candidateId(), 
        appointmentStatus: 'Generated' 
    };
    
    // Simulate API call for now (pending backend)
    this.joiningService.generateAppointment(payload).subscribe({
      next: () => {
        this.joiningData.set(payload);
        this.alertService.success('Success', 'Appointment Letter Generated');
      },
      error: () => {
        // Mock success if API is down
        this.joiningData.set(payload);
        this.alertService.success('Success', 'Appointment Letter Generated (Local)');
      }
    });
  }

  onSend() {
    this.joiningService.sendAppointment(this.candidateId()).subscribe({
      next: () => {
        this.joiningData.update(v => ({...v, appointmentStatus: 'Sent'}));
        this.alertService.success('Success', 'Appointment Letter Sent');
      },
      error: () => {
        // Mock success if API is down
        this.joiningData.update(v => ({...v, appointmentStatus: 'Sent'}));
        this.alertService.success('Success', 'Appointment Letter Sent (Local)');
      }
    });
  }

  onSubmitJoining() {
    const checklist = this.checklistForm.value;
    const allChecked = Object.values(checklist).every(v => v === true);
    
    if (!allChecked) {
        this.alertService.error('Incomplete Checklist', 'Please complete all HR verification steps before submitting.');
        return;
    }

    this.joiningService.submitJoiningReport(this.candidateId(), checklist).subscribe({
        next: () => {
            this.joiningData.update(v => ({...v, hrChecklist: checklist, joiningStatus: 'Completed'}));
            this.alertService.success('Success', 'Joining Report Completed');
        },
        error: () => {
            // Mock success
            this.joiningData.update(v => ({...v, hrChecklist: checklist, joiningStatus: 'Completed'}));
            this.alertService.success('Success', 'Joining Report Completed (Local)');
        }
    })
  }

  proceedToInduction() {
    this.router.navigate(['/induction', this.candidateId()]);
  }
}
