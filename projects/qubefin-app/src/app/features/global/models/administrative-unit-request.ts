import { AdministrativeUnitHierarchyItem } from "./administrative-unit-hierarchy-item";

export interface AdministrativeUnitRequest {
    id: string;
    name: string;
    administrativeUnitTypeId: string;
    administrativeUnitTypeIcon: string;
    administrativeUnitTypeName: string;
    parentId: string | null;
    parentName?: string;
    isActive: boolean;
    hierarchy: AdministrativeUnitHierarchyItem[];
}