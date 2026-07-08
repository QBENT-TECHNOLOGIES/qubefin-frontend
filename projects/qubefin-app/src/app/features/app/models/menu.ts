import { MenuHierarchyItem } from "./menu-hierarchy-item";

export interface Menu {
    id: string;
    name: string;
    icon: string;
    target: string | null;
    parentId: string | null;
    displayPosition: number;
    isActive: boolean;
    hierarchy: MenuHierarchyItem[];
}