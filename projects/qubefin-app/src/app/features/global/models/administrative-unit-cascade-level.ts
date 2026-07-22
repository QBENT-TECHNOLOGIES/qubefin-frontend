import { AdministrativeUnitTreeNode } from './administrative-unit-tree-node';

export interface AdministrativeUnitCascadeLevel {
  level: number;
  label: string;
  icon: string;
  options: AdministrativeUnitTreeNode[];
  selectedId: string | null;
}
