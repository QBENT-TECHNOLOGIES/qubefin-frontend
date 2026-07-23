import { Permission, PermissionField } from "./permission";

export interface Menu {
    id: string;
    name: string;
    icon: string;
    target: string | null;
    parentId: string | null;
    displayPosition: number;
    isActive: boolean;
    createdBy: string;
    createdOn: Date;
    lastModifiedBy?: string;
    lastModifiedOn?: Date;
    hierarchy: MenuHierarchyItem[];
    permissions: PermissionField[];
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
    target: string | null;
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