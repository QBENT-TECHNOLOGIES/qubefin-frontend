import { OrganizationUnitHierarchyItem } from './organization-unit-hierarchy-item';

export interface OrganizationUnit {
  id: string;
  name: string;
  organizationUnitTypeId: string;
  organizationUnitTypeIcon: string;
  organizationUnitTypeName: string;
  latitude: number | null;
  longitude: number | null;
  attendanceInTime: string;
  attendanceOutTime: string;
  checkRadiusInMeter: number | null;
  parentId: string | null;
  parentName?: string;
  isActive: boolean;
  createdBy?: string;
  createdOn?: Date;
  lastModifiedBy?: string;
  lastModifiedOn?: Date;
  companyName?: string;
  companyId: string;
  districtId: string;
  hierarchy: OrganizationUnitHierarchyItem[];
  designations: Designations[];
}
export interface Designations {
  id: string;
  name: string;
  postId: string;
  postName: string;
  gradeId: string;
  gradeName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}

// An organization unit with the District / State it is located in (null when no District is saved).
export interface OrganizationUnitLocation {
  id: string;
  name: string;
  organizationUnitTypeName: string;
  districtId: string | null;
  districtName: string | null;
  stateId: string | null;
  stateName: string | null;
}
