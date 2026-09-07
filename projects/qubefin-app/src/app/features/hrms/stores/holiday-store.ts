import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IHolidayDetail, IHolidayList } from '../models/holiday-detail';
import { httpResource } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class HolidayStore {
  private readonly basePath = `${ApiPaths.HRMS}/holidays`;

  readonly yearQuery = signal<number>(new Date().getFullYear());
  private readonly holidayId = signal<string | undefined>(undefined);
  private readonly holidayDateQuery = signal<string | undefined>(undefined);
  private readonly detailYear = signal<number | undefined>(undefined);
  readonly holidaysResource = httpResource<IHolidayList[]>(() => {
    return `${this.basePath}/search/${this.yearQuery()}`;
  });

  readonly holidays = computed(() => this.holidaysResource.value() ?? []);

  readonly loading = computed(() => this.holidaysResource.isLoading());
  readonly error = computed(() => this.holidaysResource.error());

  // readonly holidayResource = httpResource<IHolidayDetail>(() => {
  //   const id = this.holidayId();
  //   return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  // });

  readonly holidayResource = httpResource<IHolidayDetail>(() => {
    const date = this.holidayDateQuery();

    if (!date) return undefined;

    const encodedDate = encodeURIComponent(date);
    return `${this.basePath}/get?holidayDate=${encodedDate}`;
  });

  readonly holiday = computed(() => {
    const item = this.holidayResource.value();
    return item ? item : undefined;
  });

  readonly holidayLoading = computed(() => this.holidayResource.isLoading());
  readonly holidayError = computed(() => this.holidayResource.error());

  setYearQuery(year: number) {
    this.yearQuery.set(year);
  }

  refreshList() {
    this.holidaysResource.reload();
  }

  refreshDetail() {
    this.holidayResource.reload();
  }

  setHolidayId(id: string | undefined) {
    if (this.holidayId() !== id) {
      this.holidayId.set(id);
    }
  }
  setHolidayYear(year: number | undefined) {
    if (this.detailYear() !== year) {
      this.detailYear.set(year);
    }
  }
  setHolidayDate(date: string | undefined) {
    if (this.holidayDateQuery() !== date) {
      this.holidayDateQuery.set(date);
    }
  }
}
