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
