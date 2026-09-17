import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { IOfferLetterModel, OfferLetterService } from '../../../services/offer-letter.service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'qfin-offer-letter-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, LucideAngularModule],
  templateUrl: './offer-letter-detail.html',
})
export class OfferLetterDetail implements OnInit {
  candidateId = input.required<string>();

  private offerService = inject(OfferLetterService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  offerForm!: FormGroup;

  offerData = signal<IOfferLetterModel>({
    candidateId: '',
    designation: '',
    placeOfPosting: '',
    dateOfJoining: '',
    reportingTime: '',
    monthlyCtc: 0,
    referenceNumber: '',
    offerStatus: 'Pending'
  });

  ngOnInit() {
    this.offerForm = this.fb.group({
      designation: ['', Validators.required],
      placeOfPosting: ['', Validators.required],
      dateOfJoining: ['', Validators.required],
      reportingTime: ['', Validators.required],
      monthlyCtc: [0, [Validators.required, Validators.min(0)]],
      referenceNumber: ['']
    });

    this.loadOfferData();
  }

  loadOfferData() {
    if (this.candidateId() === EMPTY_UUID || !this.candidateId()) return;

    this.offerService.getOfferLetter(this.candidateId()).subscribe({
      next: (res) => {
        if (res) {
          this.offerData.set(res);
          this.offerForm.patchValue(res);
        }
      },
      error: () => {
        // Pending backend, generate fake reference number for UI
        this.offerForm.patchValue({
            referenceNumber: 'OFR-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000)
        });
      }
    });
  }

  onGenerate() {
    if (this.offerForm.invalid) {
        this.offerForm.markAllAsTouched();
        return;
    }

    const payload = { ...this.offerData(), ...this.offerForm.value, candidateId: this.candidateId(), offerStatus: 'Generated' };
    
    // Simulate API call for now (pending backend)
    this.offerService.generateOfferLetter(payload).subscribe({
      next: () => {
        this.offerData.set(payload);
        this.alertService.success('Success', 'Offer Letter Generated');
      },
      error: () => {
        // Mock success if API is down
        this.offerData.set(payload);
        this.alertService.success('Success', 'Offer Letter Generated (Local)');
      }
    });
  }

  onSend() {
    this.offerService.sendOfferLetter(this.candidateId()).subscribe({
      next: () => {
        this.offerData.update(v => ({...v, offerStatus: 'Sent'}));
        this.alertService.success('Success', 'Offer Letter Sent');
      },
      error: () => {
        // Mock success if API is down
        this.offerData.update(v => ({...v, offerStatus: 'Sent'}));
        this.alertService.success('Success', 'Offer Letter Sent (Local)');
      }
    });
  }

  proceedToOnboarding() {
    this.router.navigate(['/employees']);
  }
}
