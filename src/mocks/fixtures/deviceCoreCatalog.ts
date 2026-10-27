// Mock-only data behind the device screens (filter-cores, attention core,
// core alerts) and the campaign "Mua lõi" button: sellable core SKUs with
// their warning thresholds, and which SKU sits in each position of a model.
// The portal no longer configures these since 9.3 moved to per-batch
// lifespan (docs/prototypes/core-lifespan-config.html); a real backend would
// derive them from product data and the 9.3 core type standards.

export interface DeviceCoreSku {
  sku: string;
  name: string;
  lifespan_months: number;
  warning_level1_percent: number;
  warning_level2_percent: number;
}

export interface DeviceCorePosition {
  position: string;
  name: string;
  default_sku: string;
}

export interface DeviceCoreLayout {
  model_id: string;
  positions: DeviceCorePosition[];
}

function sku(code: string, name: string, months: number): DeviceCoreSku {
  return {
    sku: code,
    name,
    lifespan_months: months,
    warning_level1_percent: 70,
    warning_level2_percent: 90,
  };
}

export const deviceCoreSkus: readonly DeviceCoreSku[] = [
  sku('CORE-PP', 'PP Cotton', 6),
  sku('CORE-PP-ALUM', 'PP xử lý phèn', 4),
  sku('CORE-CARBON', 'Carbon Block', 9),
  sku('CORE-RO', 'RO Membrane', 24),
  sku('CORE-POST', 'Post Carbon', 12),
  sku('CORE-MINERAL', 'Mineral', 12),
  sku('CORE-HYDROGEN', 'Hydrogen', 12),
];

function position(
  index: number,
  name: string,
  defaultSku: string
): DeviceCorePosition {
  return { position: String(index + 1), name, default_sku: defaultSku };
}

const fiveCoreLayout = [
  position(0, 'Lõi 1 · PP', 'CORE-PP'),
  position(1, 'Lõi 2 · Carbon', 'CORE-CARBON'),
  position(2, 'Lõi 3 · RO', 'CORE-RO'),
  position(3, 'Lõi 4 · Post Carbon', 'CORE-POST'),
  position(4, 'Lõi 5 · Mineral', 'CORE-MINERAL'),
];

export const deviceCoreLayouts: readonly DeviceCoreLayout[] = [
  { model_id: 'model-a100', positions: fiveCoreLayout },
  { model_id: 'model-b200', positions: fiveCoreLayout.slice(0, 3) },
  { model_id: 'model-n110', positions: fiveCoreLayout.slice(0, 4) },
  { model_id: 'model-n120', positions: fiveCoreLayout },
  {
    model_id: 'model-c300',
    positions: [
      ...fiveCoreLayout,
      position(5, 'Lõi 6 · Hydrogen', 'CORE-HYDROGEN'),
      position(6, 'Lõi 7 · Mineral', 'CORE-MINERAL'),
    ],
  },
];
