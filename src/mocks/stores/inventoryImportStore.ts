import {
  servicePackageDraftInputSchema,
  type ServicePackageDto,
} from '@/features/service-packages/schemas/servicePackageSchemas';
import {
  computeEntitlementQuota,
  getEntitlementKind,
} from '@/features/service-packages/utils/entitlementRules';
import {
  inventoryImportConfirmDtoSchema,
  type InventoryImportPreviewDto,
  type InventoryImportResultDto,
  type InventoryImportSource,
  type InventoryImportRow,
} from '@/features/devices/schemas/inventoryImportSchemas';
import type { InventoryDeviceDto } from '@/features/devices/schemas/inventorySchemas';
import { recordAudit } from '@/features/system/mocks/systemHandlers';
import { deviceFixtures } from '@/mocks/fixtures/devices';
import { modelFixtures } from '@/mocks/fixtures/models';
import { randomId } from '@/shared/lib/id';
import { inventoryStore, previewNewUnits } from './inventoryStore';
import { packageStore } from './servicePackageStore';
import { attachPackage } from './entitlementStore';

interface ImportPreview {
  actorId: string;
  preview: InventoryImportPreviewDto;
  devices: Map<string, InventoryDeviceDto>;
  confirmed: boolean;
}
const previews = new Map<string, ImportPreview>();
export class InventoryImportError extends Error {
  constructor(
    public readonly code:
      | 'invalid_input'
      | 'invalid_model'
      | 'preview_unavailable'
      | 'package_changed'
  ) {
    super(code);
  }
}

function grantablePackage(pkg: ServicePackageDto): boolean {
  return (
    pkg.status === 'active' &&
    servicePackageDraftInputSchema.safeParse(pkg).success
  );
}

// Direct selections take precedence over the same package selected via a bundle.
export function expandInventoryPackages(
  ids: readonly string[]
): ServicePackageDto[] {
  const selected = ids.map((id) => {
    const pkg = packageStore.find((item) => item.id === id);
    if (!pkg || !grantablePackage(pkg))
      throw new InventoryImportError('package_changed');
    return pkg;
  });
  const grants = new Map<string, ServicePackageDto>();
  for (const pkg of selected.filter((item) => item.group !== 'bundle'))
    grants.set(pkg.id, pkg);
  for (const pkg of selected
    .filter((item) => item.group === 'bundle')
    .sort((a, b) => a.id.localeCompare(b.id))) {
    if (
      pkg.configuration?.type !== 'TG-ALL' &&
      pkg.configuration?.type !== 'TG-SUB'
    )
      throw new InventoryImportError('package_changed');
    for (const part of pkg.configuration.packages) {
      const child = packageStore.find((item) => item.id === part.id);
      if (!child || child.group === 'bundle' || !grantablePackage(child))
        throw new InventoryImportError('package_changed');
      const kind = child.service_type_code
        ? getEntitlementKind(child.service_type_code)
        : null;
      if (!child.configuration || kind === null)
        throw new InventoryImportError('package_changed');
      const quota = computeEntitlementQuota(
        child.configuration,
        part.months,
        child.quota_mode ?? 'default',
        child.custom_quota ?? null
      );
      if (!grants.has(child.id))
        grants.set(child.id, {
          ...child,
          term_months: part.months,
          quota_mode: kind === 'time_only' ? 'default' : 'custom',
          custom_quota: quota === null ? null : quota * part.quantity,
        });
    }
  }
  for (const pkg of grants.values()) {
    const kind = pkg.service_type_code
      ? getEntitlementKind(pkg.service_type_code)
      : null;
    if (!pkg.configuration || kind === null)
      throw new InventoryImportError('package_changed');
    const quota = computeEntitlementQuota(
      pkg.configuration,
      pkg.term_months,
      pkg.quota_mode ?? 'default',
      pkg.custom_quota ?? null
    );
    if (kind === 'counted' && (quota === null || quota <= 0))
      throw new InventoryImportError('package_changed');
  }
  return [...grants.values()];
}

export function inventoryImportPackageOptions() {
  return packageStore.flatMap((pkg) => {
    try {
      const grants = expandInventoryPackages([pkg.id]);
      return [
        {
          id: pkg.id,
          code: pkg.code,
          name: pkg.name,
          benefits: grants.map((grant) => ({
            id: grant.id,
            code: grant.code,
            name: grant.name,
            quota: grant.configuration
              ? computeEntitlementQuota(
                  grant.configuration,
                  grant.term_months,
                  grant.quota_mode ?? 'default',
                  grant.custom_quota ?? null
                )
              : null,
            term_months: grant.term_months,
          })),
        },
      ];
    } catch (error) {
      if (error instanceof InventoryImportError) return [];
      throw error;
    }
  });
}

export function previewInventoryBatch(
  actorId: string,
  input: InventoryImportSource
): InventoryImportPreviewDto {
  const previewId = randomId();
  const devices =
    input.source === 'warehouse'
      ? previewNewUnits()
      : input.rows.map((row) => inventoryDeviceFromRow(row));
  const rows = devices.map((device) => ({
    row_id: randomId(),
    serial: device.device_id,
    model: device.model_name,
  }));
  const preview = { preview_id: previewId, items: rows };
  previews.set(previewId, {
    actorId,
    preview,
    devices: new Map(rows.map((row, index) => [row.row_id, devices[index]!])),
    confirmed: false,
  });
  return preview;
}

function inventoryDeviceFromRow(row: InventoryImportRow): InventoryDeviceDto {
  if (!modelFixtures.some((model) => model.code === row.model))
    throw new InventoryImportError('invalid_model');
  const reference = inventoryStore.find(
    (device) => device.model_name === row.model
  );
  if (!reference) throw new InventoryImportError('invalid_model');
  const now = new Date().toISOString();
  return {
    ...reference,
    device_id: row.serial,
    model_name: row.model,
    batch_code: `IMPORT-${now.slice(0, 10)}`,
    received_at: now,
    manufactured_at: reference.manufactured_at,
    entitlements_summary: [],
  };
}

export function confirmInventoryBatch(
  actor: { id: string; fullName: string },
  body: unknown
): InventoryImportResultDto {
  const parsed = inventoryImportConfirmDtoSchema.safeParse(body);
  if (!parsed.success) throw new InventoryImportError('invalid_input');
  const input = parsed.data;
  const batch = previews.get(input.preview_id);
  if (!batch || batch.actorId !== actor.id || batch.confirmed)
    throw new InventoryImportError('preview_unavailable');
  const ids = new Set(input.assignments.map((row) => row.row_id));
  if (
    ids.size !== input.assignments.length ||
    ids.size !== batch.devices.size ||
    [...ids].some((id) => !batch.devices.has(id))
  )
    throw new InventoryImportError('invalid_input');
  const grants = new Map(
    input.assignments.map((row) => [
      row.row_id,
      expandInventoryPackages(row.package_ids),
    ])
  );
  const now = new Date().toISOString();
  const items: InventoryImportResultDto['items'] = [];
  for (const row of batch.preview.items) {
    if (
      inventoryStore.some((device) => device.device_id === row.serial) ||
      deviceFixtures.some((device) => device.device_id === row.serial)
    ) {
      items.push({
        row_id: row.row_id,
        serial: row.serial,
        status: 'skipped',
        code: 'serial_exists',
        entitlements_attached: 0,
      });
      continue;
    }
    const device = batch.devices.get(row.row_id)!;
    inventoryStore.push({ ...device, received_at: now });
    const assigned = grants.get(row.row_id) ?? [];
    let attached = 0;
    for (const pkg of assigned) {
      const record = attachPackage(
        { deviceId: row.serial, modelCode: row.model, activatedAt: null },
        pkg,
        { kind: 'inventory_import', reference: input.preview_id, at: now },
        { actor: { kind: 'staff', name: actor.fullName } }
      );
      if (record) attached += 1;
    }
    recordAudit(actor, {
      module: 'service_entitlements',
      action: 'inventory_import',
      target: row.serial,
      before: null,
      after: {
        preview_id: input.preview_id,
        serial: row.serial,
        model: row.model,
        package_ids: assigned.map((pkg) => pkg.id),
        entitlements_attached: attached,
      },
      reason: 'inventory_import_confirmed',
    });
    items.push({
      row_id: row.row_id,
      serial: row.serial,
      status: 'added',
      code: 'imported',
      entitlements_attached: attached,
    });
  }
  batch.confirmed = true;
  return {
    items,
    added: items.filter((row) => row.status === 'added').length,
    skipped: items.filter((row) => row.status === 'skipped').length,
    failed: 0,
    entitlements_attached: items.reduce(
      (sum, row) => sum + row.entitlements_attached,
      0
    ),
  };
}
