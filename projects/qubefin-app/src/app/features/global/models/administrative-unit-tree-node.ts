export interface AdministrativeUnitTreeNode {
    id: string;
    administrativeUnitTypeId: string;
    name: string;
    parentId: string;
    children?: AdministrativeUnitTreeNode[];
}