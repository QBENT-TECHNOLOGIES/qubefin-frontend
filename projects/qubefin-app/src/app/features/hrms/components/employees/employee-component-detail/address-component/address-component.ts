import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  untracked,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { form, FormField, pattern, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import {
  EmployeeAddressInfo,
  IEmployeeAddressInfo,
  Utility,
} from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { AdministrativeUnitCascade } from '../../../../../global/components/administrative-unit-cascade/administrative-unit-cascade';
import { AdministrativeUnitStore } from '../../../../../global/stores/administrative-unit-store';
import { AdministrativeUnitService } from '../../../../../global/services/administrative-unit-service';
import { IPoliceStationList } from '../../../../../global/models/police-sation';
import { IPostOfficeList } from '../../../../../global/models/post-office';

@Component({
  selector: 'qfin-address-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  templateUrl: './address-component.html',
})
export class AddressComponentDetail {
  empId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  onAddressUpdate = output<void>();
  policeStations = [];

  private readonly administrativeUnitService = inject(AdministrativeUnitService);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  readonly presentPostOffices = signal<IPostOfficeList[]>([]);
  readonly permanentPostOffices = signal<IPostOfficeList[]>([]);
  presentPoliceStations = signal<IPoliceStationList[]>([]);
  permanentPoliceStations = signal<IPoliceStationList[]>([]);
  protected readonly presentAddressModel = signal<IEmployeeAddressInfo>(new EmployeeAddressInfo());
  protected readonly permanentAddressModel = signal<IEmployeeAddressInfo>(
    new EmployeeAddressInfo(),
  );

  protected readonly employeeAddressSchema: Schema<IEmployeeAddressInfo> = schema((path) => {
    required(path.administrativeUnitId, { message: 'Location details are required' });
    required(path.policeStationId, { message: 'Police Station is required' });
    required(path.pinCode, { message: 'Pin Code is required' });
    pattern(path.pinCode, /^\d{6}$/, {
      message: 'Pin code must be exactly 6 digits (Characters are not allowed)',
    });

    required(path.postOfficeId, { message: 'Post Office is required' });
    required(path.ownerShipOfHouse, { message: 'Ownership is required' });
    required(path.durationOfStayInMonths, { message: 'Duration of Stay is required' });
  });

  protected readonly presentAddressForm = form(
    this.presentAddressModel,
    this.employeeAddressSchema,
  );
  protected readonly permanentAddressForm = form(
    this.permanentAddressModel,
    this.employeeAddressSchema,
  );
  readonly sameAsPresentAddress = signal(false);
  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  onSameAddressChange(checked: boolean): void {
    this.sameAsPresentAddress.set(checked);

    if (checked) {
      this.permanentAddressModel.set(
        new EmployeeAddressInfo({
          ...this.presentAddressForm().value(),
        }),
      );
      this.permanentPostOffices.set(this.presentPostOffices());
      // this.permanentAddressForm.disable();
    } else {
      // this.permanentAddressForm.enable();
    }
  }
  constructor() {
    effect(() => {
      if (!this.sameAsPresentAddress()) return;

      this.permanentAddressModel.set(
        new EmployeeAddressInfo({
          ...this.presentAddressModel(),
        }),
      );
    });
  }
  onPinCodeChange(type: 'present' | 'permanent', event: any) {
    const pinCode = event.target.value;

    if (pinCode && pinCode.toString().length === 6) {
      this.administrativeUnitService.getPostOfficeByPincode(pinCode.toString()).subscribe({
        next: (res: any) => {
          if (type === 'present') {
            this.presentPostOffices.set(res);
          } else {
            this.permanentPostOffices.set(res);
          }
        },
      });
    } else {
      if (type === 'present') {
        this.presentPostOffices.set([]);
      } else {
        this.permanentPostOffices.set([]);
      }
    }
  }

  onDistrictChangeForPoliceStation(type: 'present' | 'permanent', districtId: string) {
    if (!districtId || districtId === EMPTY_UUID) {
      if (type === 'present') this.presentPoliceStations.set([]);
      else this.permanentPoliceStations.set([]);
      return;
    }

    this.administrativeUnitService.getPoliceStationByDistrict(districtId).subscribe({
      next: (res: any) => {
        if (type === 'present') {
          this.presentPoliceStations.set(res);
        } else {
          this.permanentPoliceStations.set(res);
        }
      },
    });
  }
  private addressResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);

        return this.employeeService.getAddressData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.presentAddressModel.set(new EmployeeAddressInfo(resp.presentAddressInfo));
            this.permanentAddressModel.set(new EmployeeAddressInfo(resp.permanentAddressInfo));
            this.sameAsPresentAddress.set(resp.sameAsPresentAddress ?? false);
            const presentPin = resp.presentAddressInfo?.pinCode;
            if (presentPin && presentPin.toString().length === 6) {
              this.administrativeUnitService
                .getPostOfficeByPincode(presentPin.toString())
                .subscribe({
                  next: (res: any) => {
                    this.presentPostOffices.set(res);
                    this.presentAddressModel.update((state) => ({
                      ...state,
                      postOfficeId: resp.presentAddressInfo.postOfficeId || state.postOfficeId,
                    }));
                  },
                });
            }
            const permanentPin = resp.permanentAddressInfo?.pinCode;
            if (permanentPin && permanentPin.toString().length === 6) {
              this.administrativeUnitService
                .getPostOfficeByPincode(permanentPin.toString())
                .subscribe({
                  next: (res: any) => {
                    this.permanentPostOffices.set(res);
                    this.permanentAddressModel.update((state) => ({
                      ...state,
                      postOfficeId: resp.permanentAddressInfo.postOfficeId || state.postOfficeId,
                    }));
                  },
                });
            }
          }),
        );
      } else {
        this.presentAddressModel.set(new EmployeeAddressInfo());
        this.permanentAddressModel.set(new EmployeeAddressInfo());
        return of(null);
      }
    },
  });

  updatePresentAddressField<K extends keyof IEmployeeAddressInfo>(
    field: K,
    value: IEmployeeAddressInfo[K],
  ) {
    this.presentAddressModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  updatePermanentAddressField<K extends keyof IEmployeeAddressInfo>(
    field: K,
    value: IEmployeeAddressInfo[K],
  ) {
    this.permanentAddressModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  onSubmit() {
    this.permanentAddressForm().markAsTouched();
    this.presentAddressForm().markAsTouched();
    if (!this.presentAddressForm().valid() || !this.permanentAddressForm().valid()) {
      return;
    }

    const dataToSave: any = {
      presentAddress: this.presentAddressForm().value(),
      permanentAddress: this.permanentAddressForm().value(),
    };

    dataToSave.presentAddress.administrativeUnitId =
      dataToSave.presentAddress.administrativeUnitId == ''
        ? null
        : dataToSave.presentAddress.administrativeUnitId;

    dataToSave.presentAddress.policeStationId =
      dataToSave.presentAddress.policeStationId == ''
        ? null
        : dataToSave.presentAddress.policeStationId;

    dataToSave.presentAddress.postOfficeId =
      dataToSave.presentAddress.postOfficeId == '' ? null : dataToSave.presentAddress.postOfficeId;

    dataToSave.permanentAddress.administrativeUnitId =
      dataToSave.permanentAddress.administrativeUnitId == ''
        ? null
        : dataToSave.permanentAddress.administrativeUnitId;

    dataToSave.permanentAddress.policeStationId =
      dataToSave.permanentAddress.policeStationId == ''
        ? null
        : dataToSave.permanentAddress.policeStationId;

    dataToSave.permanentAddress.postOfficeId =
      dataToSave.permanentAddress.postOfficeId == ''
        ? null
        : dataToSave.permanentAddress.postOfficeId;

    if (this.isEditMode()) {
      this.employeeService.updateAddresslInfo(this.empId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
            this.onAddressUpdate.emit();
          });
        },
        error: (err: any) => {},
      });
    }
  }
}
