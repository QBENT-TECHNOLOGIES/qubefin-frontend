import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class HolidayService {
  httpClient = inject(HttpClient);
  createHoliday(holiday: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/holidays`, holiday);
  }
  updateHoliday(holidayId: string, holiday: any) {
    return this.httpClient.put(`${ApiPaths.HRMS}/holidays/${holidayId}`, holiday);
  }
}
