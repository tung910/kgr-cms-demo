import type {
  InventoryImportPreviewDto,
  InventoryImportPreview,
  InventoryImportResultDto,
  InventoryImportResult,
} from '../schemas/inventoryImportSchemas';

export function mapInventoryImportPreview(
  dto: InventoryImportPreviewDto
): InventoryImportPreview {
  return {
    previewId: dto.preview_id,
    items: dto.items.map((row) => ({
      rowId: row.row_id,
      serial: row.serial,
      model: row.model,
    })),
  };
}
export function mapInventoryImportResult(
  dto: InventoryImportResultDto
): InventoryImportResult {
  return {
    added: dto.added,
    skipped: dto.skipped,
    failed: dto.failed,
    entitlementsAttached: dto.entitlements_attached,
    items: dto.items.map((row) => ({
      rowId: row.row_id,
      serial: row.serial,
      status: row.status,
      code: row.code,
      entitlementsAttached: row.entitlements_attached,
    })),
  };
}
