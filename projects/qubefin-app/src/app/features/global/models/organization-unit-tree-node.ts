export interface OrganizationUnitTreeNode {
    id: string;
    organizationUnitTypeId: string;
    organizationUnitTypeName: string;
    name: string;
    parentId: string;
    isActive: boolean;
    children?: OrganizationUnitTreeNode[];
}

export interface OrganizationUnitBasic {
    id: string;
    name: string;
}