export interface AdministrativeUnitTreeNode {
    id: string;
    administrativeUnitTypeId: string;
    administrativeUnitTypeIcon: string;
    administrativeUnitTypeName: string;
    name: string;
    parentId: string;
    isActive: boolean;
    children?: AdministrativeUnitTreeNode[];
}

export interface AdministrativeUnitBasic {
    id: string;
    name: string;
    category: string;
}