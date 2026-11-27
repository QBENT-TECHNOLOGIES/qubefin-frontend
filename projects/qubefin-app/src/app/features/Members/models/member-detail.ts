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
export interface IMemberAddressInfo {
  id: string;
  memberId: string;
  parmanentHouseNo: string;
  parmanentStreetName: string;
  parmanentCity: string;
  parmanentAdministrativeUnitId: string;
  parmanentPoliceStationId: string;
  parmanentPostOffice: string;
  parmanentPinCode: string;
  parmanentNearestLandmark: string;
  parmanentResidenceYear: number | null;
  presentPermanentAddressSame: boolean;
  presentHouseNo: string;
  presentStreetName: string;
  presentCity: string;
  presentAdministrativeUnitId: string;
  presentPoliceStationId: string;
  presentPostOffice: string;
  presentPinCode: string;
  presentNearestLandmark: string;
  presentResidenceYear: number | null;
  isDefault: boolean;
  sequence: number;
}

export class MemberAddressInfo implements IMemberAddressInfo {
  id: string = '';
  memberId: string = '';
  parmanentHouseNo: string = '';
  parmanentStreetName: string = '';
  parmanentCity: string = '';
  parmanentAdministrativeUnitId: string = '';
  parmanentPoliceStationId: string = '';
  parmanentPostOffice: string = '';
  parmanentPinCode: string = '';
  parmanentNearestLandmark: string = '';
  parmanentResidenceYear: number | null = null;
  presentPermanentAddressSame: boolean = false;
  presentHouseNo: string = '';
  presentStreetName: string = '';
  presentCity: string = '';
  presentAdministrativeUnitId: string = '';
  presentPoliceStationId: string = '';
  presentPostOffice: string = '';
  presentPinCode: string = '';
  presentNearestLandmark: string = '';
  presentResidenceYear: number | null = null;
  isDefault: boolean = false;
  sequence: number = 0;

  constructor(init?: Partial<IMemberAddressInfo>) {
    if (init) {
      Object.assign(this, {
        ...init,
        id: init.id ?? '',
        memberId: init.memberId ?? '',
        parmanentHouseNo: init.parmanentHouseNo ?? '',
        parmanentStreetName: init.parmanentStreetName ?? '',
        parmanentCity: init.parmanentCity ?? '',
        parmanentAdministrativeUnitId: init.parmanentAdministrativeUnitId ?? '',
        parmanentPoliceStationId: init.parmanentPoliceStationId ?? '',
        parmanentPostOffice: init.parmanentPostOffice ?? '',
        parmanentPinCode: init.parmanentPinCode ?? '',
        parmanentNearestLandmark: init.parmanentNearestLandmark ?? '',
        parmanentResidenceYear: init.parmanentResidenceYear ?? null,
        presentPermanentAddressSame: init.presentPermanentAddressSame ?? false,
        presentHouseNo: init.presentHouseNo ?? '',
        presentStreetName: init.presentStreetName ?? '',
        presentCity: init.presentCity ?? '',
        presentAdministrativeUnitId: init.presentAdministrativeUnitId ?? '',
        presentPoliceStationId: init.presentPoliceStationId ?? '',
        presentPostOffice: init.presentPostOffice ?? '',
        presentPinCode: init.presentPinCode ?? '',
        presentNearestLandmark: init.presentNearestLandmark ?? '',
        presentResidenceYear: init.presentResidenceYear ?? null,
        isDefault: init.isDefault ?? false,
        sequence: init.sequence ?? 0,
      });
    }
  }
}

export interface IMemberAddressRequest {
  id: string | null;
  parmanentHouseNo: string;
  parmanentStreetName: string;
  parmanentCity: string;
  parmanentAdministrativeUnitId: string;
  parmanentPoliceStationId: string;
  parmanentPostOffice: string;
  parmanentPinCode: string;
  parmanentNearestLandmark: string;
  parmanentResidenceYear: number;
  presentPermanentAddressSame: boolean;
  presentHouseNo: string;
  presentStreetName: string;
  presentCity: string;
  presentAdministrativeUnitId: string;
  presentPoliceStationId: string;
  presentPostOffice: string;
  presentPinCode: string;
  presentNearestLandmark: string;
  presentResidenceYear: number;
  isDefault: boolean;
}
export interface IMemberDocument {
  id: string;
  memberId: string;
  kycDocumentId: string;
  kycDocumentName: string;
  documentNo: string;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  fontSideFileName: string;
  fontSideFileSequence: string;
  fontSideFileUrl: string;
  backSideFileName: string;
  backSideFileSequence: string;
  backSideFileUrl: string;
  isVerify: boolean;
  remarks: string;
}

export class MemberDocument implements IMemberDocument {
  id: string = '';
  memberId: string = '';
  kycDocumentId: string = '';
  kycDocumentName: string = '';
  documentNo: string = '';
  issueDate: Date | string | null = null;
  expiryDate: Date | string | null = null;
  fontSideFileName: string = '';
  fontSideFileSequence: string = '';
  fontSideFileUrl: string = '';
  backSideFileName: string = '';
  backSideFileSequence: string = '';
  backSideFileUrl: string = '';
  isVerify: boolean = false;
  remarks: string = '';

  constructor(init?: Partial<IMemberDocument>) {
    if (init) {
      Object.assign(this, {
        ...init,
        id: init.id ?? '',
        memberId: init.memberId ?? '',
        kycDocumentId: init.kycDocumentId ?? '',
        kycDocumentName: init.kycDocumentName ?? '',
        documentNo: init.documentNo ?? '',
        issueDate: init.issueDate ? new Date(init.issueDate) : null,
        expiryDate: init.expiryDate ? new Date(init.expiryDate) : null,
        fontSideFileName: init.fontSideFileName ?? '',
        fontSideFileSequence: init.fontSideFileSequence ?? '',
        fontSideFileUrl: init.fontSideFileUrl ?? '',
        backSideFileName: init.backSideFileName ?? '',
        backSideFileSequence: init.backSideFileSequence ?? '',
        backSideFileUrl: init.backSideFileUrl ?? '',
        isVerify: init.isVerify ?? false,
        remarks: init.remarks ?? '',
      });
    }
  }
}
