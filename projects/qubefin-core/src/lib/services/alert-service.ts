import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private swal = Swal.mixin({
    heightAuto: false,
    allowOutsideClick: false,
    allowEscapeKey: true,
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-3xl',
      confirmButton: 'btn btn-primary',
      cancelButton: 'btn btn-secondary',
    },
  });

  success(title?: string | null, text?: string) {
    return this.swal.fire({
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
                <h2 class="swal-title">${title ?? 'Success!'}</h2>
                ${text ? `<p class="swal-text">${text}</p>` : ''}
                <svg viewBox="0 0 1440 320" class="btm-svg">
                    <path fill="#2fae59" fill-opacity="0.1" d="M0,96L34.3,122.7C68.6,149,137,203,206,240C274.3,277,343,299,411,298.7C480,299,549,277,617,272C685.7,267,754,277,823,272C891.4,267,960,245,1029,213.3C1097.1,181,1166,139,1234,117.3C1302.9,96,1371,96,1406,96L1440,96L1440,320L1405.7,320C1371.4,320,1303,320,1234,320C1165.7,320,1097,320,1029,320C960,320,891,320,823,320C754.3,320,686,320,617,320C548.6,320,480,320,411,320C342.9,320,274,320,206,320C137.1,320,69,320,34,320L0,320Z"></path>
                </svg>
            `,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'Ok',
      cancelButtonText: 'Close',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'swal-popup swal-popup-success',
        confirmButton: 'swal-btn swal-btn-success',
        cancelButton: 'swal-btn swal-btn-outline',
        actions: 'swal-actions',
      },
    });
  }

  error(title?: string | null, text?: string) {
    return this.swal.fire({
      html: `
                <div class="error-shape es1"></div>
                <div class="error-shape es2"></div>
                <div class="error-shape es3"></div>
                <div class="error-shape-solid es4"></div>
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
                <h2 class="swal-title">${title ?? 'Failed'}</h2>
                ${text ? `<p class="swal-text">${text}</p>` : ''}
                <svg viewBox="0 0 1440 320" class="btm-svg">
                <path fill="#e34d4d" fill-opacity="0.1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,272C672,277,768,267,864,245.3C960,224,1056,192,1152,154.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            `,
      showConfirmButton: true,
      showCancelButton: false,
      //   confirmButtonText: 'Try Again',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'swal-popup swal-popup-error',
        confirmButton: 'swal-btn swal-btn-error',
        cancelButton: 'swal-btn swal-btn-outline',
        actions: 'swal-actions',
      },
    });
  }

  warning(title?: string | null, text?: string) {
    return this.swal.fire({
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
                <h2 class="swal-title">${title ?? 'Warning!'}</h2>
                ${text ? `<p class="swal-text">${text}</p>` : ''}
                <svg viewBox="0 0 1440 320" class="btm-svg">
                <path fill="#f59e0b" fill-opacity="0.1" d="M0,96L30,112C60,128,120,160,180,149.3C240,139,300,85,360,101.3C420,117,480,203,540,229.3C600,256,660,224,720,224C780,224,840,256,900,277.3C960,299,1020,309,1080,293.3C1140,277,1200,235,1260,186.7C1320,139,1380,85,1410,58.7L1440,32L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"></path>
                </svg>
            `,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'Review Now',
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
  }

  info(title?: string | null, text?: string) {
    return this.swal.fire({
      html: `
                <svg class="dot-pattern-tl">
                ${Array.from({ length: 12 })
                  .map((_, row) =>
                    Array.from({ length: 10 })
                      .map((_, col) => {
                        const distance = Math.sqrt(row * row + col * col);
                        const maxDistance = Math.sqrt(6 * 6 + 8 * 8);
                        const opacity = Math.max(0.08, 1 - distance / maxDistance).toFixed(2);
                        return `<circle cx="${col * 12 + 10}" cy="${row * 12 + 10}" r="2" fill="#93c5fd" opacity="${opacity}" />`;
                      })
                      .join(''),
                  )
                  .join('')}
                </svg>
                <div class="alert-icon-wrapper info">
                <div class="circle-outer info-outer">
                    <div class="circle-inner info-inner">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="none"/>
                        <rect x="11" y="10" width="2" height="7" rx="1" fill="white"/>
                        <circle cx="12" cy="7" r="1.3" fill="white"/>
                    </svg>
                    </div>
                </div>
                </div>
                <h2 class="swal-title">${title ?? 'Information'}</h2>
                ${text ? `<p class="swal-text">${text}</p>` : ''}
                <svg viewBox="0 0 1440 320" class="btm-svg">
                <path fill="#3b82f6" fill-opacity="0.1" d="M0,192L24,160C48,128,96,64,144,58.7C192,53,240,107,288,112C336,117,384,75,432,58.7C480,43,528,53,576,69.3C624,85,672,107,720,128C768,149,816,171,864,176C912,181,960,171,1008,181.3C1056,192,1104,224,1152,250.7C1200,277,1248,299,1296,277.3C1344,256,1392,192,1416,160L1440,128L1440,320L1416,320C1392,320,1344,320,1296,320C1248,320,1200,320,1152,320C1104,320,1056,320,1008,320C960,320,912,320,864,320C816,320,768,320,720,320C672,320,624,320,576,320C528,320,480,320,432,320C384,320,336,320,288,320C240,320,192,320,144,320C96,320,48,320,24,320L0,320Z"></path>
                </svg>
            `,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'Got it',
      buttonsStyling: false,
      customClass: {
        popup: 'swal-popup swal-popup-info',
        confirmButton: 'swal-btn swal-btn-info swal-btn-wide',
        actions: 'swal-actions',
      },
    });
  }

  question(title: string, text?: string) {
    return this.swal.fire({
      icon: 'question',
      title,
      text,
      confirmButtonText: 'OK',
    });
  }

  confirm(
    title?: string | null,
    text?: string,
    confirmText = 'Yes',
    cancelText = 'Cancel',
  ): Promise<SweetAlertResult<any>> {
    return this.swal.fire({
      html: `
            <svg class="dot-pattern-tl">
            ${Array.from({ length: 12 })
              .map((_, row) =>
                Array.from({ length: 10 })
                  .map((_, col) => {
                    const distance = Math.sqrt(row * row + col * col);
                    const maxDistance = Math.sqrt(6 * 6 + 8 * 8);
                    const opacity = Math.max(0.08, 1 - distance / maxDistance).toFixed(2);
                    return `<circle cx="${col * 12 + 10}" cy="${row * 12 + 10}" r="2" fill="#fcd34d" opacity="${opacity}" />`;
                  })
                  .join(''),
              )
              .join('')}
            </svg>
            <div class="alert-icon-wrapper confirm">
            <div class="circle-outer confirm-outer">
                <div class="circle-inner confirm-inner">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="none"/>
                    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                    <circle cx="12" cy="16.5" r="1.1" fill="white"/>
                </svg>
                </div>
            </div>
            </div>
            <h2 class="swal-title">${title ?? 'Confirmation!'}</h2>
            ${text ? `<p class="swal-text">${text}</p>` : ''}
            <svg viewBox="0 0 1440 320" class="btm-svg">
            <path fill="#f59e0b" fill-opacity="0.1" d="M0,192L24,160C48,128,96,64,144,58.7C192,53,240,107,288,112C336,117,384,75,432,58.7C480,43,528,53,576,69.3C624,85,672,107,720,128C768,149,816,171,864,176C912,181,960,171,1008,181.3C1056,192,1104,224,1152,250.7C1200,277,1248,299,1296,277.3C1344,256,1392,192,1416,160L1440,128L1440,320L1416,320C1392,320,1344,320,1296,320C1248,320,1200,320,1152,320C1104,320,1056,320,1008,320C960,320,912,320,864,320C816,320,768,320,720,320C672,320,624,320,576,320C528,320,480,320,432,320C384,320,336,320,288,320C240,320,192,320,144,320C96,320,48,320,24,320L0,320Z"></path>
            </svg>
        `,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      buttonsStyling: false,
      customClass: {
        popup: 'swal-popup swal-popup-confirm',
        confirmButton: 'swal-btn swal-btn-confirm',
        cancelButton: 'swal-btn swal-btn-cancel',
        actions: 'swal-actions',
      },
    });
  }

  delete(text = 'This action cannot be undone.'): Promise<SweetAlertResult<any>> {
    return this.swal.fire({
      icon: 'warning',
      title: 'Delete Record?',
      text,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
  }

  toast(icon: SweetAlertIcon, title: string, timer = 3000) {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-xl',
      },
    });
  }
}
