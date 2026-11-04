export interface IEmployeeHierarchyMember {
  id: string;
  name: string;
  organizationUnit?: string;
  designation?: string;
}

// Several members when a unit has no Incharge and more than one head (shared team head).
// No members and vacantUnit set when a unit has nobody to head it.
export interface IEmployeeHierarchyNode {
  members: IEmployeeHierarchyMember[];
  children: IEmployeeHierarchyNode[];
  vacantUnit?: string;
}

export interface IEmployeeHierarchy {
  employeeId: string;
  root: IEmployeeHierarchyNode;
}
