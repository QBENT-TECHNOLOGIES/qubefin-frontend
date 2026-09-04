import { OrganizationUnit } from '../../global/models/organization-unit';

export interface IHolidayList {
  id: string;
  holidayDate: string;
  description: string;
}
export interface IHolidayDetail {
  id: string;
  holidayDate: string;
  description: string;
  createdBy?: string;
  createdOn?: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
  orgUnits: OrganizationUnit[];
}
export interface IHolidaySearchModel {
  tempSearch: string;
  fromDate: string;
  toDate: string;
}
