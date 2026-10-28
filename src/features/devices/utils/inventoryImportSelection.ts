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
  const selected = options.filter((option) => packageIds.includes(option.id));
  const direct = selected.filter(
    (option) =>
      option.benefits.length === 1 && option.benefits[0]?.id === option.id
  );
  const bundles = selected
    .filter((option) => !direct.includes(option))
    .sort((a, b) => a.id.localeCompare(b.id));
  const benefits = new Map<
    string,
    InventoryImportPackageOption['benefits'][number]
  >();
  for (const option of [...direct, ...bundles]) {
    for (const benefit of option.benefits)
      if (!benefits.has(benefit.id)) benefits.set(benefit.id, benefit);
  }
  return [...benefits.values()];
}
