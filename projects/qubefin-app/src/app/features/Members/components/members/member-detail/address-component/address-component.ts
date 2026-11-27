import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { applyEach, form, FormField, pattern, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { catchError, of, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { AdministrativeUnitCascade } from '../../../../../global/components/administrative-unit-cascade/administrative-unit-cascade';
import { IPoliceStationList } from '../../../../../global/models/police-sation';
import { IPostOfficeList } from '../../../../../global/models/post-office';
import { AdministrativeUnitService } from '../../../../../global/services/administrative-unit-service';
import {
  IMemberAddressInfo,
  IMemberAddressRequest,
  MemberAddressInfo,
} from '../../../../models/member-detail';
import { MemberService } from '../../../../services/member-services';
import { MemberStore } from '../../../../stores/member-store';

interface MemberAddressFormModel {
  addresses: IMemberAddressInfo[];
}

interface AddressLookupState {
  presentPoliceStations: IPoliceStationList[];
  permanentPoliceStations: IPoliceStationList[];
  presentPostOffices: IPostOfficeList[];
  permanentPostOffices: IPostOfficeList[];
  presentPostOfficeNotFound: boolean;
  permanentPostOfficeNotFound: boolean;
}

@Component({
  selector: 'qfin-address-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  templateUrl: './address-component.html',
})
export class AddressComponent {
  memberId = input<string>(EMPTY_UUID);
  onAddressUpdate = output<void>();

  private readonly administrativeUnitService = inject(AdministrativeUnitService);
  private readonly memberStore = inject(MemberStore);
  private readonly memberService = inject(MemberService);
  private readonly alertService = inject(AlertService);

  readonly iconMap = APP_ICONS_MAP;
  readonly isEditMode = computed(() => !!this.memberId() && this.memberId() !== EMPTY_UUID);

  readonly addressLookups = signal<AddressLookupState[]>([]);

  protected readonly addressModel = signal<MemberAddressFormModel>({
    addresses: [],
  });

  protected readonly addressSchema = schema<MemberAddressFormModel>((path) => {
    required(path.addresses);

    applyEach(path.addresses, (addrPath) => {
      required(addrPath.presentHouseNo, { message: 'House/Plot No is required' });
      required(addrPath.presentStreetName, { message: 'Road/Street Name is required' });
      required(addrPath.presentCity, { message: 'City/Village is required' });
      required(addrPath.presentAdministrativeUnitId, {
        message: 'Location details are required',
      });
      required(addrPath.presentPoliceStationId, { message: 'Police Station is required' });
      required(addrPath.presentPinCode, { message: 'Pin Code is required' });
      pattern(addrPath.presentPinCode, /^\d{6}$/, {
        message: 'Pin Code must be 6 digits',
      });
      required(addrPath.presentPostOffice, { message: 'Post Office is required' });
      required(addrPath.presentNearestLandmark, { message: 'Nearest Landmark is required' });
      required(addrPath.presentResidenceYear, { message: 'Residence Year is required' });

      required(addrPath.parmanentHouseNo, { message: 'House/Plot No is required' });
      required(addrPath.parmanentStreetName, { message: 'Road/Street Name is required' });
      required(addrPath.parmanentCity, { message: 'City/Village is required' });
      required(addrPath.parmanentAdministrativeUnitId, {
        message: 'Location details are required',
      });
      required(addrPath.parmanentPoliceStationId, { message: 'Police Station is required' });
      required(addrPath.parmanentPinCode, { message: 'Pin Code is required' });
      pattern(addrPath.parmanentPinCode, /^\d{6}$/, {
        message: 'Pin Code must be 6 digits',
      });
      required(addrPath.parmanentPostOffice, { message: 'Post Office is required' });
      required(addrPath.parmanentNearestLandmark, { message: 'Nearest Landmark is required' });
      required(addrPath.parmanentResidenceYear, { message: 'Residence Year is required' });
    });
  });

  protected readonly addressForm = form(this.addressModel, this.addressSchema);

  private createEmptyLookup(): AddressLookupState {
    return {
      presentPoliceStations: [],
      permanentPoliceStations: [],
      presentPostOffices: [],
      permanentPostOffices: [],
      presentPostOfficeNotFound: false,
      permanentPostOfficeNotFound: false,
    };
  }

  private createEmptyAddress(isDefault = false): MemberAddressInfo {
    const model = new MemberAddressInfo();
    model.id = EMPTY_UUID;
    model.memberId = this.memberId();
    model.isDefault = isDefault;
    return model;
  }

  constructor() {
    effect(() => {
      if (this.addressModel().addresses.length === 0) {
        this.addressModel.set({
          addresses: [this.createEmptyAddress(true)],
        });
        this.addressLookups.set([this.createEmptyLookup()]);
      }
    });

    effect(() => {
      const addresses = this.addressModel().addresses;
      let needsSync = false;

      const synced = addresses.map((addr) => {
        if (!addr.presentPermanentAddressSame) return addr;

        if (
          addr.parmanentHouseNo !== addr.presentHouseNo ||
          addr.parmanentStreetName !== addr.presentStreetName ||
          addr.parmanentCity !== addr.presentCity ||
          addr.parmanentAdministrativeUnitId !== addr.presentAdministrativeUnitId ||
          addr.parmanentPoliceStationId !== addr.presentPoliceStationId ||
          addr.parmanentPostOffice !== addr.presentPostOffice ||
          addr.parmanentPinCode !== addr.presentPinCode ||
          addr.parmanentNearestLandmark !== addr.presentNearestLandmark ||
          addr.parmanentResidenceYear !== addr.presentResidenceYear
        ) {
          needsSync = true;
          return {
            ...addr,
            parmanentHouseNo: addr.presentHouseNo,
            parmanentStreetName: addr.presentStreetName,
            parmanentCity: addr.presentCity,
            parmanentAdministrativeUnitId: addr.presentAdministrativeUnitId,
            parmanentPoliceStationId: addr.presentPoliceStationId,
            parmanentPostOffice: addr.presentPostOffice,
            parmanentPinCode: addr.presentPinCode,
            parmanentNearestLandmark: addr.presentNearestLandmark,
            parmanentResidenceYear: addr.presentResidenceYear,
          };
        }

        return addr;
      });

      if (needsSync) {
        this.addressModel.set({ addresses: synced });
      }
    });
  }

  private addressResource = rxResource({
    params: () => ({ id: this.memberId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.memberStore.setMemberComponentId(params.id);

        return this.memberService.getAddressData(params.id).pipe(
          tap((resp: any) => {
            const list: IMemberAddressInfo[] = Array.isArray(resp) ? resp : [];

            if (list.length === 0) {
              this.addressModel.set({ addresses: [this.createEmptyAddress(true)] });
              this.addressLookups.set([this.createEmptyLookup()]);
              return;
            }

            const mapped = list.map((item) => new MemberAddressInfo(item));
            if (!mapped.some((a) => a.isDefault)) {
              mapped[0].isDefault = true;
            }

            this.addressModel.set({ addresses: mapped });
            this.addressLookups.set(mapped.map(() => this.createEmptyLookup()));

            mapped.forEach((addr, index) => {
              if (addr.presentPinCode && addr.presentPinCode.length === 6) {
                this.loadPostOffices(index, 'present', addr.presentPinCode, true);
              }
              if (addr.parmanentPinCode && addr.parmanentPinCode.length === 6) {
                this.loadPostOffices(index, 'permanent', addr.parmanentPinCode, true);
              }
            });
          }),
          catchError(() => of(null)),
        );
      } else {
        this.addressModel.set({ addresses: [this.createEmptyAddress(true)] });
        this.addressLookups.set([this.createEmptyLookup()]);
        return of(null);
      }
    },
  });

  getLookup(index: number): AddressLookupState {
    return this.addressLookups()[index] ?? this.createEmptyLookup();
  }

  private updateLookup(index: number, patch: Partial<AddressLookupState>) {
    this.addressLookups.update((list) =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  addAddress() {
    this.addressModel.update((state) => ({
      addresses: [...state.addresses, this.createEmptyAddress(false)],
    }));
    this.addressLookups.update((list) => [...list, this.createEmptyLookup()]);
  }

  removeAddress(index: number) {
    if (this.addressModel().addresses.length <= 1) {
      return;
    }

    this.addressModel.update((state) => {
      const remaining = state.addresses.filter((_, i) => i !== index);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return { addresses: remaining };
    });

    this.addressLookups.update((list) => list.filter((_, i) => i !== index));
  }

  onIsDefaultChange(index: number, checked: boolean) {
    this.addressModel.update((state) => ({
      addresses: state.addresses.map((addr, i) => {
        if (i === index) {
          return { ...addr, isDefault: checked };
        }
        return checked ? { ...addr, isDefault: false } : addr;
      }),
    }));
  }

  onSameAddressChange(index: number, checked: boolean) {
    this.addressModel.update((state) => ({
      addresses: state.addresses.map((addr, i) => {
        if (i !== index) return addr;
        if (!checked) {
          return { ...addr, presentPermanentAddressSame: false };
        }
        return {
          ...addr,
          presentPermanentAddressSame: true,
          parmanentHouseNo: addr.presentHouseNo,
          parmanentStreetName: addr.presentStreetName,
          parmanentCity: addr.presentCity,
          parmanentAdministrativeUnitId: addr.presentAdministrativeUnitId,
          parmanentPoliceStationId: addr.presentPoliceStationId,
          parmanentPostOffice: addr.presentPostOffice,
          parmanentPinCode: addr.presentPinCode,
          parmanentNearestLandmark: addr.presentNearestLandmark,
          parmanentResidenceYear: addr.presentResidenceYear,
        };
      }),
    }));

    if (checked) {
      const current = this.getLookup(index);
      this.updateLookup(index, {
        permanentPoliceStations: [...current.presentPoliceStations],
        permanentPostOffices: [...current.presentPostOffices],
        permanentPostOfficeNotFound: current.presentPostOfficeNotFound,
      });
    }
  }

  updateAddressField<K extends keyof IMemberAddressInfo>(
    index: number,
    field: K,
    value: IMemberAddressInfo[K],
  ) {
    const normalizedValue =
      typeof value === 'string' && value === EMPTY_UUID ? ('' as IMemberAddressInfo[K]) : value;

    this.addressModel.update((state) => ({
      addresses: state.addresses.map((addr, i) =>
        i === index ? { ...addr, [field]: normalizedValue } : addr,
      ),
    }));
  }

  onAdministrativeAreaChangedByUser(index: number, type: 'present' | 'permanent') {
    if (type === 'present') {
      const isSame = this.addressModel().addresses[index]?.presentPermanentAddressSame;
      this.updateLookup(index, {
        presentPoliceStations: [],
        presentPostOffices: [],
        presentPostOfficeNotFound: false,
        ...(isSame
          ? {
              permanentPoliceStations: [],
              permanentPostOffices: [],
              permanentPostOfficeNotFound: false,
            }
          : {}),
      });
      this.addressModel.update((state) => ({
        addresses: state.addresses.map((addr, i) =>
          i === index
            ? {
                ...addr,
                presentPoliceStationId: '',
                presentPinCode: '',
                presentPostOffice: '',
              }
            : addr,
        ),
      }));
    } else {
      this.updateLookup(index, {
        permanentPoliceStations: [],
        permanentPostOffices: [],
        permanentPostOfficeNotFound: false,
      });
      this.addressModel.update((state) => ({
        addresses: state.addresses.map((addr, i) =>
          i === index
            ? {
                ...addr,
                parmanentPoliceStationId: '',
                parmanentPinCode: '',
                parmanentPostOffice: '',
              }
            : addr,
        ),
      }));
    }
  }

  onDistrictChangeForPoliceStation(
    index: number,
    type: 'present' | 'permanent',
    districtId: string,
  ) {
    const isSame = this.addressModel().addresses[index]?.presentPermanentAddressSame;

    if (!districtId || districtId === EMPTY_UUID) {
      if (type === 'present') {
        this.updateLookup(index, {
          presentPoliceStations: [],
          ...(isSame ? { permanentPoliceStations: [] } : {}),
        });
      } else {
        this.updateLookup(index, { permanentPoliceStations: [] });
      }
      return;
    }

    this.administrativeUnitService.getPoliceStationByDistrict(districtId).subscribe({
      next: (res: any) => {
        const stations: IPoliceStationList[] = res ?? [];
        if (type === 'present') {
          const sameNow = this.addressModel().addresses[index]?.presentPermanentAddressSame;
          this.updateLookup(index, {
            presentPoliceStations: stations,
            ...(sameNow ? { permanentPoliceStations: stations } : {}),
          });
        } else {
          this.updateLookup(index, { permanentPoliceStations: stations });
        }
      },
    });
  }

  onPinCodeChange(index: number, type: 'present' | 'permanent', event: Event) {
    const pinCode = (event.target as HTMLInputElement).value?.trim() ?? '';

    if (pinCode.length === 6) {
      this.loadPostOffices(index, type, pinCode, false);
    } else {
      this.setPostOffices(index, type, [], false, false);
    }
  }

  private loadPostOffices(
    index: number,
    type: 'present' | 'permanent',
    pinCode: string,
    preserveExisting: boolean,
  ) {
    this.administrativeUnitService.getPostOfficeByPincode(pinCode).subscribe({
      next: (res: any) => {
        this.setPostOffices(index, type, res ?? [], true, preserveExisting);
      },
    });
  }

  private setPostOffices(
    index: number,
    type: 'present' | 'permanent',
    postOffices: IPostOfficeList[],
    lookupDone: boolean,
    preserveExisting: boolean,
  ) {
    const notFound = lookupDone && postOffices.length === 0;
    const isSame = this.addressModel().addresses[index]?.presentPermanentAddressSame;

    if (type === 'present') {
      this.updateLookup(index, {
        presentPostOffices: postOffices,
        presentPostOfficeNotFound: notFound,
        ...(isSame
          ? {
              permanentPostOffices: postOffices,
              permanentPostOfficeNotFound: notFound,
            }
          : {}),
      });

      if (!preserveExisting) {
        this.addressModel.update((state) => ({
          addresses: state.addresses.map((addr, i) => {
            if (i !== index) return addr;
            const exists = postOffices.some((p) => p.name === addr.presentPostOffice);
            return {
              ...addr,
              presentPostOffice: notFound || exists ? addr.presentPostOffice : '',
            };
          }),
        }));
      }
    } else {
      this.updateLookup(index, {
        permanentPostOffices: postOffices,
        permanentPostOfficeNotFound: notFound,
      });

      if (!preserveExisting) {
        this.addressModel.update((state) => ({
          addresses: state.addresses.map((addr, i) => {
            if (i !== index) return addr;
            const exists = postOffices.some((p) => p.name === addr.parmanentPostOffice);
            return {
              ...addr,
              parmanentPostOffice: notFound || exists ? addr.parmanentPostOffice : '',
            };
          }),
        }));
      }
    }
  }

  onSubmit() {
    this.addressForm().markAsTouched();

    const defaultCount = this.addressModel().addresses.filter((a) => a.isDefault).length;
    if (defaultCount !== 1) {
      this.alertService.warning(null, 'Please mark exactly one address as default.');
      return;
    }

    if (!this.addressForm().valid()) {
      return;
    }

    const payload: IMemberAddressRequest[] = this.addressForm()
      .value()
      .addresses.map((addr) => {
        const isSame = addr.presentPermanentAddressSame;
        return {
          id: addr.id && addr.id !== EMPTY_UUID ? addr.id : null,
          presentPermanentAddressSame: isSame,
          presentHouseNo: addr.presentHouseNo.trim(),
          presentStreetName: addr.presentStreetName.trim(),
          presentCity: addr.presentCity.trim(),
          presentAdministrativeUnitId: addr.presentAdministrativeUnitId,
          presentPoliceStationId: addr.presentPoliceStationId,
          presentPostOffice: addr.presentPostOffice.trim(),
          presentPinCode: addr.presentPinCode.trim(),
          presentNearestLandmark: addr.presentNearestLandmark.trim(),
          presentResidenceYear: Number(addr.presentResidenceYear),
          parmanentHouseNo: (isSame ? addr.presentHouseNo : addr.parmanentHouseNo).trim(),
          parmanentStreetName: (isSame ? addr.presentStreetName : addr.parmanentStreetName).trim(),
          parmanentCity: (isSame ? addr.presentCity : addr.parmanentCity).trim(),
          parmanentAdministrativeUnitId: isSame
            ? addr.presentAdministrativeUnitId
            : addr.parmanentAdministrativeUnitId,
          parmanentPoliceStationId: isSame
            ? addr.presentPoliceStationId
            : addr.parmanentPoliceStationId,
          parmanentPostOffice: (isSame ? addr.presentPostOffice : addr.parmanentPostOffice).trim(),
          parmanentPinCode: (isSame ? addr.presentPinCode : addr.parmanentPinCode).trim(),
          parmanentNearestLandmark: (isSame
            ? addr.presentNearestLandmark
            : addr.parmanentNearestLandmark
          ).trim(),
          parmanentResidenceYear: Number(
            isSame ? addr.presentResidenceYear : addr.parmanentResidenceYear,
          ),
          isDefault: addr.isDefault,
        };
      });

    if (this.isEditMode()) {
      this.memberService.updateAddressInfo(this.memberId(), payload).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.memberStore.refreshList();
            this.memberStore.refreshDetail();
            this.onAddressUpdate.emit();
          });
        },
        error: () => {},
      });
    }
  }
}
