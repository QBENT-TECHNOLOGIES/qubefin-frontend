import { TrackingViewer, ViewerRole } from '../models/field-officer';

/**
 * Maps real tracking-api responses onto the frontend models (`models/*.ts`) where the backend's shape differs from
 * the contract. Each adapter also accepts the contract shape, so the in-browser mock keeps working unchanged.
 */

/** Role names the backend sends (display names) → `ViewerRole`. Compared lower-case with spaces / punctuation removed. */
const ROLE_BY_NAME: Record<string, ViewerRole> = {
  admin: 'Admin',
  administrator: 'Admin',
  superadmin: 'Admin',
  applicationadministrator: 'Admin',
  applicationadmin: 'Admin',
  dm: 'DM',
  divisionmanager: 'DM',
  am: 'AM',
  areamanager: 'AM',
  bm: 'BM',
  branchmanager: 'BM',
  abm: 'ABM',
  additionalbranchmanager: 'ABM',
  assistantbranchmanager: 'ABM',
  co: 'CO',
  creditofficer: 'CO',
};

/**
 * "Area Manager" / "AM" / "area_manager" → 'AM'. An unknown role fails closed: it is treated as a Credit Officer
 * (lowest rank, no web actions) and logged, so a new role name from the backend shows up quickly instead of granting rights.
 */
export function toViewerRole(raw: unknown): ViewerRole {
  const key = String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const role = ROLE_BY_NAME[key];
  if (!role) console.warn(`[tracking] Unknown role "${raw}" from tracking-api; treating it as Credit Officer.`);
  return role ?? 'CO';
}

/** GET tracking-api/me. Backend sends `organisationUnitIds` (= `branchIds`) and the role as a display name. */
export function toTrackingViewer(raw: unknown): TrackingViewer {
  const r = (raw ?? {}) as Record<string, any>;
  return {
    employeeId: r['employeeId'] || null,
    name: cleanName(r['name']),
    role: toViewerRole(r['role']),
    unitName: String(r['unitName'] ?? ''),
    branchIds: [...(r['branchIds'] ?? r['organisationUnitIds'] ?? [])],
    canCreateJobs: !!r['canCreateJobs'],
  };
}

/** Trims and collapses repeated spaces ("Bapan  Roy" → "Bapan Roy"). */
export function cleanName(raw: unknown): string {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}
