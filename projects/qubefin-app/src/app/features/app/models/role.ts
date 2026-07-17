export interface Role {
    id: string;
    name: string;
    isActive: boolean;
    createdBy: string;
    createdOn: Date;
    lastModifiedBy?: string;
    lastModifiedOn?: Date;
}