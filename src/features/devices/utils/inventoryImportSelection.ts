import type { InventoryImportPackageOption } from '../schemas/inventoryImportSchemas';

export function resolveInventoryPackages(
  rowId: string,
  commonPackageIds: string[],
  overrides: Record<string, string[]>
): string[] {
  return overrides[rowId] ?? commonPackageIds;
}

export function inventoryImportBenefits(
  packageIds: string[],
  options: InventoryImportPackageOption[]
) {
  return [
    ...new Map(
      packageIds
        .flatMap(
          (id) => options.find((option) => option.id === id)?.benefits ?? []
        )
        .map((benefit) => [benefit.id, benefit])
    ).values(),
  ];
}
