import { Permission, PermissionField } from './permission';

export interface MenuRolePermissionAssignment {
  roleId: string;
  menuPermissionIds: string[];
}

export interface RoleMenuAssignmentResponse {
  roleId: string;
  roleName: string;
  menuPermissionIds: string[];
  isSelected: boolean;
}

export interface UserMenuAssignmentResponse {
  userId: string;
  employeeId: string | null;
  userName: string;
  menuPermissionIds: string[];
  isSelected?: boolean;
}

export interface SaveRoleMenuRequest {
  menuId: string;
  roles: MenuRolePermissionAssignment[];
  users: Array<{
    userId: string;
    menuPermissionIds: string[];
  }>;
}

export interface Menu {
  id: string;
  name: string;
  icon: string;
  target: string | null;
  parentId: string | null;
  parentName: string | null;
  displayPosition: number;
  isActive: boolean;
  createdBy: string;
  createdOn: Date;
  lastModifiedBy?: string;
  lastModifiedOn?: Date;
  hierarchy: MenuHierarchyItem[];
  permissions: PermissionField[];
  roles?: RoleMenuAssignmentResponse[];
  users?: UserMenuAssignmentResponse[];
}

export interface MenuTreeNode {
  id: string;
  name: string;
  icon: string;
  target: string | null;
  parentId: string | null;
  displayPosition: number;
  isActive: boolean;
  children?: MenuTreeNode[];
}

export interface MenuHierarchyItem {
  id: string;
  name: string;
  icon: string;
  target: string;
  level: number;
}

export interface MenuField {
  id: string;
  name: string;
  icon: string;
  target: string;
  parentId: string | null;
  displayPosition: number;
  isActive: boolean;
  permissions: PermissionField[];
}

export interface ParentMenu {
  id: string;
  name: string;
  icon: string;
}
