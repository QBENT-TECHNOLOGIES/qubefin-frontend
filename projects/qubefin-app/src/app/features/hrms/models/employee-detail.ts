// export interface IEmployeeInfo {
//   id: string; // Representing Guid
//   salutation?: string;
//   firstName: string;
//   middleName?: string;
//   lastName: string;
//   fullName : string;
//   code: string;
//   fatherName?: string;
//   motherName?: string;
//   dateOfBirth: Date; // Used string for 'YYYY-MM-DD' ISO format (DateOnly equivalent)
//   joiningDate?: Date; // Used string for 'YYYY-MM-DD' ISO format (DateOnly equivalent)
//   gender: string;
//   religion: string;
//   caste?: string;
//   nationality: string;
//   bloodGroup: string;
//   disablityType?: string;
//   maritalStatus?: string;
//   mobileNo: string;
//   personalEmail?: string;
// }

// export class EmployeeInfo{
//   salutation?: string = "";
//   firstName: string = "";
//   middleName?: string = "";
//   lastName: string = "";
//   fullName : string = "";
//   code: string = "";
//   fatherName?: string = "";
//   motherName?: string = "";
//   dateOfBirth: Date = new Date();
//   joiningDate: Date = new Date();
//   gender: string = "";
//   religion: string = "";
//   caste?: string = "";
//   nationality: string = "";
//   bloodGroup: string = "";
//   disablityType?: string = "";
//   maritalStatus?: string = "";
//   mobileNo: string = "";
//   personalEmail?: string = "";

//   // constructor(data?: IEmployeeInfo) {
//   //   this.id = data && data.id || "00000000-0000-0000-0000-000000000000";
//   //   this.salutation = data && data.salutation || null;
//   //   this.firstName = data && data.firstName || "";
//   //   this.middleName = data && data.middleName || null;
//   //   this.lastName = data && data.lastName || "";
//   //   this.fullName = data && data.fullName || "";
//   //   this.code = data && data.code || "";
//   //   this.fatherName = data && data.fatherName || null;
//   //   this.motherName = data && data.motherName || null;
//   //   this.dateOfBirth = data && data.dateOfBirth || new Date;
//   //   this.gender = data && data.gender || "";
//   //   this.religion = data && data.religion || "";
//   //   this.caste = data && data.caste || null;
//   //   this.nationality = data && data.nationality || "";
//   //   this.bloodGroup =data &&  data.bloodGroup || "";
//   //   this.disablityType = data && data.disablityType || null;
//   //   this.maritalStatus = data && data.maritalStatus || null;
//   //   this.mobileNo = data && data.mobileNo || "";
//   //   this.personalEmail = data && data.personalEmail || null;
//   // }
// }

const defaultDate = (): Date => new Date();

// --- Designation ---
export interface IEmployeeDesignation {
  id: string; // Guid maps to required string
  designationId: Date; // Guid maps to required string
  effectiveFrom: Date; // DateTime maps to ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
  effectiveTo?: Date; // DateTime? maps to nullable string
}
export class EmployeeDesignation {
  id: string = '';
  designationId: Date = defaultDate();
  effectiveFrom: Date = defaultDate();
  effectiveTo?: Date;

  constructor(init?: Partial<EmployeeDesignation>) {
    Object.assign(this, init);
  }
}

// --- Qualification ---

export interface IEmployeeQualification {
  id: string; // Guid maps to required string
  academicStream: string; // Required non-nullable string
  specialization: string; // Nullable string
  yearOfPassing: number; // int maps to required number
  universityOrBoard: string; // Nullable string
  schoolOrCollege: string; // Nullable string
  gradeOrMarks: string; // Nullable string
  docFileName: string; // Nullable string
  docFileNo: string; // Nullable string
  employeeId: string; // Guid maps to required string
  sequence: number; // int maps to required number
}
export class EmployeeQualification {
  id: string = '';
  academicStream: string = '';
  specialization: string = '';
  yearOfPassing: number = defaultDate().getFullYear();
  universityOrBoard: string = '';
  schoolOrCollege: string = '';
  gradeOrMarks: string = '';
  docFileName: string = '';
  docFileNo: string = '';
  employeeId: string = '';
  sequence: number = 0;

  constructor(init?: Partial<IEmployeeQualification>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeQualification]]),
      ),
    );
  }
}
// --- Employment ---

export interface IEmployeeEmployment {
  id: string; // Guid maps to required string
  employerName: string; // Required non-nullable string
  designation: string; // Required non-nullable string
  fromDate: Date; // DateOnly maps to string (YYYY-MM-DD)
  toDate: Date; // DateOnly maps to string (YYYY-MM-DD)
  lastDrawnSalary: number; // decimal maps to required number
  jobTitle: string; // Nullable string
  nocFileName: string; // Nullable string
  nocFileNo: string; // Nullable string
  expCertFileName: string; // Nullable string
  expCertFileNo: string; // Nullable string
  employeeId: string; // Guid maps to required string
  sequence: number; // int maps to required number
}

export class EmployeeEmployment {
  id: string = '';
  employerName: string = '';
  designation: string = '';
  fromDate: Date = defaultDate();
  toDate: Date = defaultDate();
  lastDrawnSalary: number = 0;
  jobTitle: string = '';
  nocFileName: string = '';
  nocFileNo: string = '';
  expCertFileName: string = '';
  expCertFileNo: string = '';
  employeeId: string = '';
  sequence: number = 0;

  constructor(init?: Partial<IEmployeeEmployment>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeEmployment]]),
      ),
    );
  }
}

// --- Documents ---

export interface IEmployeeDocument {
  id: string; // Guid maps to required string
  documentCategory: string; // Required non-nullable string
  documentName: string; // Required non-nullable string
  documentNo: string; // Nullable string
  validFrom: Date | null; // DateOnly? maps to string (YYYY-MM-DD)
  validTill: Date | null; // DateOnly? maps to string (YYYY-MM-DD)
  fileName: string; // Nullable string
  fileNo: string; // DateTime? maps to ISO timestamp string
  employeeId: string; // DateTime? maps to ISO timestamp string
  fileUrl: string;
}

export class EmployeeDocument {
  id: string = '00000000-0000-0000-0000-000000000000';
  documentCategory: string = '';
  documentName: string = '';
  documentNo: string = '';
  validFrom: Date | null = null;
  validTill: Date | null = null;

  fileName: string = '';
  fileNo: string = '';
  employeeId: string = '';
  fileUrl: string = '';

  constructor(init?: Partial<IEmployeeDocument>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeDocument]]),
      ),
    );
  }
}
// --- Reference ---

export interface IEmployeeReference {
  id: string; // Guid maps to required string
  employeeId: string; // Guid maps to required string
  personName: string; // Required non-nullable string
  mobile: string; // Nullable string
  email: string; // DateOnly? maps to string (YYYY-MM-DD)
  address: string; // DateOnly? maps to string (YYYY-MM-DD)
  occupation: string; // Nullable string
  howDoYouKnow: string; // Nullable string
}

export class EmployeeReference {
  id: string = '00000000-0000-0000-0000-000000000000';
  employeeId: string = '00000000-0000-0000-0000-000000000000';
  personName: string = '';
  mobile: string = '';
  email: string = '';
  address: string = '';
  occupation: string = '';
  howDoYouKnow: string = '';

  constructor(init?: Partial<IEmployeeReference>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeReference]]),
      ),
    );
  }
}

// --- PersonalInfo ---
// Helper function to provide a fallback date
export interface IEmployeePersonalInfo {
  code: string;
  salutation: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  fatherName: string | null;
  husbandName: string;
  motherName: string | null;
  dateOfBirth: Date | string | null;
  gender: string;
  religion: string;
  caste: string;
  nationality: string;
  bloodGroup: string;
  disablityType: string;
  maritalStatus: string;
}

export class EmployeePersonalInfo implements IEmployeePersonalInfo {
  code: string = '';
  salutation: string = '';
  firstName: string = '';
  middleName: string = '';
  lastName: string = '';
  fullName: string = '';
  fatherName: string = '';
  motherName: string = '';
  husbandName: string = '';
  dateOfBirth: Date | string | null = null; // Replaced custom defaultDate() with standard fallback
  gender: string = '';
  religion: string = '';
  caste: string = '';
  nationality: string = '';
  bloodGroup: string = '';
  disablityType: string = '';
  maritalStatus: string = '';

  constructor(init?: Partial<IEmployeePersonalInfo>) {
    if (init) {
      Object.assign(this, {
        ...init,
        // Required fields fallback mapping
        code: init.code ?? '',
        salutation: init.salutation ?? '',
        firstName: init.firstName ?? '',
        lastName: init.lastName ?? '',
        dateOfBirth: init.dateOfBirth ? new Date(init.dateOfBirth) : new Date(),
        gender: init.gender ?? '',
        maritalStatus: init.maritalStatus ?? '',

        // Optional fields fallback mapping
        middleName: init.middleName ?? '',
        fullName: init.fullName ?? '',
        fatherName: init.fatherName ?? '',
        motherName: init.motherName ?? '',
        husbandName: init.husbandName ?? '',
        religion: init.religion ?? '',
        caste: init.caste ?? '',
        nationality: init.nationality ?? '',
        bloodGroup: init.bloodGroup ?? '',
        disabltyType: init.disablityType ?? '',
      });
    }
  }
}

// --- OfficialInfo ---

export interface IEmployeeOfficialInfo {
  companyId?: string; // Guid? maps to string
  organizationUnitId: string; // Guid? maps to string
  departmentId: string; // Guid? maps to string
  employementType: string; // string? maps to optional string
  dateOfJoining: Date | null; // DateOnly? maps to ISO date string (YYYY-MM-DD)
  dateOfConfirmation: Date | null; // DateOnly? maps to ISO date string (YYYY-MM-DD)
  separationDate: Date | null; // DateOnly? maps to ISO date string (YYYY-MM-DD)
  referedBy: string; // Guid? maps to string
  howYouKnow: string;
  officialEmail: string;
  isActive: boolean; // bool maps to required boolean
  organizationUnitTypeId: string; // Guid? maps to string
  companyName: string;
  designationId: string;
  salaryGrade: string;
  grossSalary: number;
  isDesignationEditable: boolean;
}
export class EmployeeOfficialInfo {
  companyId: string = '';
  organizationUnitId: string = '';
  departmentId: string = '';
  employementType: string = '';
  dateOfJoining: Date | null = null;
  dateOfConfirmation: Date | null = null;
  separationDate: Date | null = null;
  referedBy: string = '';
  howYouKnow: string = '';
  officialEmail: string = '';
  isActive: boolean = true;
  organizationUnitTypeId: string = '';
  companyName: string = '';
  designationId: string = '';
  salaryGrade: string = '';
  grossSalary: number = 0;
  isDesignationEditable: boolean = true;
  constructor(init?: Partial<IEmployeeOfficialInfo>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeOfficialInfo]]),
      ),
    );
  }
}

// --- Contact ---

// export interface IEmergencyContact {
//   relation: string | null;
//   name: string | null;
//   mobile: string | null;
// }

// export class EmergencyContact {
//   relation: string  = '';
//   name: string  = '';
//   mobile: string  = '';

//   constructor(init?: Partial<IEmergencyContact>) {
//     if (!init) return;

//     Object.assign(
//       this,
//       Object.fromEntries(
//         Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmergencyContact]]),
//       ),
//     );
//   }
// }

export interface IEmployeeContactInfo {
  mobileNo: string; // maps to non-nullable string
  personalEmail: string; // maps to nullable string
  primaryEmergencyRelation: string; // nested instance object
  primaryEmergencyName: string; // nested instance object
  primaryEmergencyMobile: string; // maps to nullable string
  secondaryEmergencyRelation: string; // nested instance object
  secondaryEmergencyName: string; // nested instance object
  secondaryEmergencyMobile: string; // nested instance object
}
export class EmployeeContactInfo {
  mobileNo = ''; // maps to non-nullable string
  personalEmail = ''; // maps to nullable string
  primaryEmergencyRelation = ''; // nested instance object
  primaryEmergencyName = ''; // nested instance object
  primaryEmergencyMobile = ''; // maps to nullable string
  secondaryEmergencyRelation = ''; // nested instance object
  secondaryEmergencyName = ''; // nested instance object
  secondaryEmergencyMobile = '';

  constructor(init?: Partial<IEmployeeContactInfo>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeeContactInfo]]),
      ),
    );
  }
}
// --- AddressInfo ---

export interface IEmployeeAddressInfo {
  houseNo: string;
  roadName: string;
  landMark: string;
  administrativeUnitId: string; // Guid? maps to nullable string
  policeStationId: string; // Guid? maps to nullable string
  postOfficeId: string; // Guid? maps to nullable string
  pinCode: string;
  ownerShipOfHouse: string;
  durationOfStayInMonths: number; // int? maps to nullable number
}
export class EmployeeAddressInfo {
  houseNo = '';
  roadName = '';
  landMark = '';
  administrativeUnitId = '';
  policeStationId = '';
  postOfficeId = '';
  pinCode = '';
  ownerShipOfHouse = '';
  durationOfStayInMonths = 0;

  constructor(init?: Partial<IEmployeeAddressInfo>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof EmployeeAddressInfo]]),
      ),
    );
  }
}

// --- PayrollInfo ---

export interface IEmployeePayrollInfo {
  bankId: string; // Guid? maps to nullable string
  bankAccountNo: number; // long? maps to nullable number
  bankHolderName: string;
  bankBranch: string;
  bankAccountType: string;
  hasEsiEligible: boolean; // bool maps to required boolean
  esiIpNumber: string;
  universalAccountNumber: string;
  isPayrollActive: boolean; // bool maps to required boolean
  pfAccountNo: string;
  ifscCode: string;
}
export class EmployeePayrollInfo {
  bankId: string = '';
  bankAccountNo: number = 0;
  bankHolderName: string = '';
  bankBranch: string = '';
  bankAccountType: string = '';
  hasEsiEligible: boolean = false;
  esiIpNumber: string = '';
  universalAccountNumber: string = '';
  isPayrollActive: boolean = true;
  pfAccountNo: string = '';
  ifscCode: string = '';

  constructor(init?: Partial<IEmployeePayrollInfo>) {
    if (!init) return;

    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(init).map(([k, v]) => [k, v ?? this[k as keyof IEmployeePayrollInfo]]),
      ),
    );
  }
}
// --- Organization ---

export interface IEmployeeOrganization {
  organizationUnitId?: string | null; // Guid? maps to nullable string
  organizationUnitName?: string | null;
  attendanceInTime?: string | null; // TimeOnly? maps to string "HH:mm:ss"
  attendanceOutTime?: string | null; // TimeOnly? maps to string "HH:mm:ss"
}
export class EmployeeOrganization {
  organizationUnitId?: string | null = '';
  organizationUnitName?: string | null = '';
  attendanceInTime?: string | null = '09:00:00';
  attendanceOutTime?: string | null = '18:00:00';

  constructor(init?: Partial<EmployeeOrganization>) {
    Object.assign(this, init);
  }
}

// --- Main Aggregate Root Interface ---

export interface IEmployee {
  id: string; // Guid maps to string
  code: string;
  createdBy?: string | null;
  createdDate?: Date; // DateTime maps to ISO string
  lastModifiedOn?: Date;
  lastModifiedBy?: string | null;

  // Value Objects
  personalInfo: IEmployeePersonalInfo;
  officialInfo: IEmployeeOfficialInfo;
  contactInfo: IEmployeeContactInfo;
  presentAddressInfo: IEmployeeAddressInfo;
  permanentAddressInfo: IEmployeeAddressInfo;
  payrollInfo: IEmployeePayrollInfo;
  organizationInfo: IEmployeeOrganization;

  // Collections (Mapped from IReadOnlyCollection)
  designations: IEmployeeDesignation[];
  qualifications: IEmployeeQualification[];
  employments: IEmployeeEmployment[];
  documents: IEmployeeDocument[];
  references: IEmployeeReference[];
}

export class Employee {
  id: string = '';
  code: string = '';
  createdBy?: string | null = '';
  createdDate?: Date;
  lastModifiedBy?: string | null = '';
  lastModifiedOn?: Date;

  // Complex Embedded Hierarchies
  personalInfo: EmployeePersonalInfo = new EmployeePersonalInfo();
  officialInfo: EmployeeOfficialInfo = new EmployeeOfficialInfo();
  contactInfo: EmployeeContactInfo = new EmployeeContactInfo();
  presentAddressInfo: EmployeeAddressInfo = new EmployeeAddressInfo();
  permanentAddressInfo: EmployeeAddressInfo = new EmployeeAddressInfo();
  payrollInfo: EmployeePayrollInfo = new EmployeePayrollInfo();
  organizationInfo: EmployeeOrganization = new EmployeeOrganization();

  // Relational Collections
  designations: EmployeeDesignation[] = [];
  qualifications: EmployeeQualification[] = [];
  employments: EmployeeEmployment[] = [];
  documents: EmployeeDocument[] = [];
  references: EmployeeReference[] = [];

  constructor(init?: Partial<Employee>) {
    if (init) {
      this.id = init.id ?? '';
      this.code = init.code ?? '';
      this.createdBy = init.createdBy;
      this.createdDate = init.createdDate;
      this.lastModifiedBy = init.lastModifiedBy;
      this.lastModifiedOn = init.lastModifiedOn;

      // Type-safe instance generation for sub-value objects
      this.personalInfo = new EmployeePersonalInfo(init.personalInfo);
      this.officialInfo = new EmployeeOfficialInfo(init.officialInfo);
      this.contactInfo = new EmployeeContactInfo(init.contactInfo);
      this.presentAddressInfo = new EmployeeAddressInfo(init.presentAddressInfo);
      this.permanentAddressInfo = new EmployeeAddressInfo(init.permanentAddressInfo);
      this.payrollInfo = new EmployeePayrollInfo(init.payrollInfo);
      this.organizationInfo = new EmployeeOrganization(init.organizationInfo);

      // Map raw response payloads into formal subclass array wrappers
      this.designations = init.designations?.map((x) => new EmployeeDesignation(x)) ?? [];
      this.qualifications = init.qualifications?.map((x) => new EmployeeQualification(x)) ?? [];
      this.employments = init.employments?.map((x) => new EmployeeEmployment(x)) ?? [];
      this.documents = init.documents?.map((x) => new EmployeeDocument(x)) ?? [];
      this.references = init.references?.map((x) => new EmployeeReference(x)) ?? [];
    }
  }
}

export interface IEmployeesBySearchResult {
  id: string; // Guid maps to required string
  code?: string | null; // string? maps to nullable string
  fullName: string; // Required non-nullable string
  office: string; // Required non-nullable string
  email?: string | null; // string? maps to nullable string
  mobile?: string | null; // string? maps to nullable string
  joiningDate?: Date; // DateOnly? maps to ISO date string (YYYY-MM-DD)
  separationDate?: Date; // DateOnly? maps to ISO date string (YYYY-MM-DD)
  isActive: boolean; // bool maps to required boolean
  companyName?: string | null;
  organizationUnitName?: string | null;
  gender?: string | null;
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
