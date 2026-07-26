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
            cancelButton: 'btn btn-secondary'
        }
    });

    success(title: string, text?: string) {
        return this.swal.fire({
            icon: 'success',
            title,
            text,
            confirmButtonText: 'OK',
        });
    }

    error(title: string, text?: string) {
        return this.swal.fire({
            icon: 'error',
            title,
            text,
            confirmButtonText: 'OK',
        });
    }

    warning(title: string, text?: string) {
        return this.swal.fire({
            icon: 'warning',
            title,
            text,
            confirmButtonText: 'OK',
        });
    }

    info(title: string, text?: string) {
        return this.swal.fire({
            icon: 'info',
            title,
            text,
            confirmButtonText: 'OK',
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
        title: string,
        text?: string,
        confirmText = 'Yes',
        cancelText = 'Cancel'
    ): Promise<SweetAlertResult<any>> {
        return this.swal.fire({
            icon: 'question',
            title,
            text,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
        });
    }

    delete(
        text = 'This action cannot be undone.'
    ): Promise<SweetAlertResult<any>> {
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

    toast(
        icon: SweetAlertIcon,
        title: string,
        timer = 3000
    ) {
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