import { IAuditInfo } from '../../global/models/survey-committee-item';

// ১. Interface: এটি শুধুমাত্র ডেটার স্ট্রাকচার বা টাইপ ডিফাইন করার জন্য
export interface ISalaryModel {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  categoryName?: string;
  isTaxable: boolean;
  isPfapplicable: boolean;
  isEsiapplicable: boolean;
  isCtccomponent: boolean;
  isActive: boolean;
  displayOrder: number;
  createdOn?: Date;
  createdBy?: string;
  lastModifiedOn?: Date;
  lastModifiedBy?: string;
  auditInfo?: IAuditInfo | null;
}
export class SalaryModel implements ISalaryModel {
  id: string = '';
  name: string = '';
  code: string = '';
  categoryId: string = '';

  isTaxable: boolean = false;
  isPfapplicable: boolean = false;
  isEsiapplicable: boolean = false;
  isCtccomponent: boolean = false;
  isActive: boolean = true;
  displayOrder: number = 0;
  createdOn?: Date;
  createdBy?: string;
  lastModifiedOn?: Date;
  lastModifiedBy?: string;
  constructor(init?: Partial<ISalaryModel>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
export class SalaryCategories {
  public id: string = '';
  public name: string = '';
}
