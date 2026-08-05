export interface Permission {
    id: string;
    permissionToken: string;
    description: string;
    icon: string;
    backgroundClass: string;
    iconClass: string;
    displayPosition: number;
}

export interface PermissionField {
    id: string;
    permissionToken: string;
    description: string;
    icon: string;
    backgroundClass: string;
    iconClass: string;
    displayPosition: number;
    checked?: boolean;
}