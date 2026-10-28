import type { EntitlementKind } from '@/features/service-packages/utils/entitlementRules';

// Shared in-memory mock backend for device service entitlements (spec §3,
// §5, §6, §11). Empty for now — Task 4 seeds fixtures and wires the auto-
// attach-on-sync / bulk-assign / manual-add flows that populate these.

// TEMPORARY: this snapshot shape is a placeholder for Task 2's scaffolding
// only. Task 4 defines the real `EntitlementPackageSnapshotDto` in
// `src/features/devices/schemas/entitlementSchemas.ts` (per §11's
// `package_snapshot`) and this store will import that type instead.
export interface EntitlementPackageSnapshotDto {
  package_id: string;
  code: string;
  name: string;
}

export interface EntitlementRecord {
  id: string;
  device_id: string;
  model_code: string;
  package_snapshot: EntitlementPackageSnapshotDto; // Task 3/4
  kind: EntitlementKind;
  quota: number | null;
  used: number;
  activated_at: string | null; // device activation date; null while in stock
  starts_override_at: string | null; // "Thêm gói" §7.2: term starts from add date
  revoked: boolean;
  source: {
    kind: 'auto_attach' | 'bulk_assign' | 'manual_add';
    reference: string;
    at: string;
  };
}

export interface ServiceTicketRecord {
  ticket_id: string;
  ticket_code: string;
  device_id: string;
  entitlement_id: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string | null;
}

// `const` arrays mutated via push/splice/index assignment, never reassigned,
// per the convention in servicePackageStore.ts / inventoryStore.ts.
export const entitlementRecords: EntitlementRecord[] = [];
export const entitlementEvents: unknown[] = []; // EntitlementEventRecord — Task 4
export const serviceTickets: ServiceTicketRecord[] = [];
