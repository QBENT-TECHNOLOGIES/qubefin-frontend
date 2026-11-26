export interface IGroupSearchByText {
  id: string;
  groupCode: string | null;
  name: string;
}

export interface IMemberPersonalInfo {
  branchCode: number | null;
  branchName: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  creditOfficerName: string;
  employeeCode: string;
  admissionDate: Date | string | null;
  code: string;
  salutation: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  guardianName: string;
  motherName: string;
  spouseName: string;
  dateOfBirth: Date | string | null;
  age: number | null;
  gender: string;
  religion: string;
  caste: string;
  nationality: string;
  maritalStatus: string;
  educationalQualification: string;
  mobileNo: string;
  alternateMobileNo: string;
}

export class MemberPersonalInfo implements IMemberPersonalInfo {
  branchCode: number | null = null;
  branchName: string = '';
  groupId: string = '';
  groupCode: string = '';
  groupName: string = '';
  creditOfficerName: string = '';
  employeeCode: string = '';
  admissionDate: Date | string | null = new Date();
  code: string = '';
  salutation: string = '';
  firstName: string = '';
  middleName: string = '';
  lastName: string = '';
  fullName: string = '';
  guardianName: string = '';
  motherName: string = '';
  spouseName: string = '';
  dateOfBirth: Date | string | null = null;
  age: number | null = null;
  gender: string = '';
  religion: string = '';
  caste: string = '';
  nationality: string = '';
  maritalStatus: string = '';
  educationalQualification: string = '';
  mobileNo: string = '';
  alternateMobileNo: string = '';

  constructor(init?: Partial<IMemberPersonalInfo>) {
    if (init) {
      Object.assign(this, {
        ...init,
        branchCode: init.branchCode ?? null,
        branchName: init.branchName ?? '',
        groupId: init.groupId ?? '',
        groupCode: init.groupCode ?? '',
        groupName: init.groupName ?? '',
        creditOfficerName: init.creditOfficerName ?? '',
        employeeCode: init.employeeCode ?? '',
        admissionDate: init.admissionDate ? new Date(init.admissionDate) : new Date(),
        code: init.code ?? '',
        salutation: init.salutation ?? (init as any).salutaion ?? '',
        firstName: init.firstName ?? '',
        middleName: init.middleName ?? '',
        lastName: init.lastName ?? '',
        fullName: init.fullName ?? '',
        guardianName: init.guardianName ?? '',
        motherName: init.motherName ?? '',
        spouseName: init.spouseName ?? '',
        dateOfBirth: init.dateOfBirth ? new Date(init.dateOfBirth) : null,
        age: init.age ?? null,
        gender: init.gender ?? '',
        religion: init.religion ?? '',
        caste: init.caste ?? '',
        nationality: init.nationality ?? '',
        maritalStatus: init.maritalStatus ?? '',
        educationalQualification:
          init.educationalQualification ?? (init as any).qualification ?? '',
        mobileNo: init.mobileNo ?? '',
        alternateMobileNo: init.alternateMobileNo ?? '',
      });
    }
  }
}

export interface IMemberPersonalRequest {
  branchCode: number;
  groupId: string | null;
  salutaion: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  guardianName: string | null;
  motherName: string | null;
  spouseName: string | null;
  dateOfBirth: string;
  gender: string | null;
  religion: string | null;
  caste: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  educationalQualification: string | null;
  mobileNo: string;
  alternateMobileNo?: string | null;
}
export interface IMembersBySearchResult {
  id: string;
  branchCode: number;
  code?: string | null;
  fullName: string;
  guardianName?: string | null;
  dateOfBirth: string | Date;
  gender?: string | null;
  mobileNo: string;
  createdOn: string | Date;
}

export class Utility {
  sysKey: string = '';
  sysVal?: string = '';
}

export class KycDocument {
  id: string = '';
  name: string = '';
  isMandatory: boolean = false;
  isIdentityProof: boolean = false;
  isAddressProof: boolean = false;
  isDateValidate: boolean = false;
  sequence: number = 0;
}
