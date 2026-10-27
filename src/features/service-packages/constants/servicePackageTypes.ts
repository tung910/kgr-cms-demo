export const SERVICE_PACKAGE_TYPES = [
  { value: 'LD-STD', labelKey: 'types.LD-STD', group: 'installation' },
  { value: 'LD-PRO', labelKey: 'types.LD-PRO', group: 'installation' },
  { value: 'TH-OLD', labelKey: 'types.TH-OLD', group: 'installation' },
  { value: 'BH-EXT', labelKey: 'types.BH-EXT', group: 'warranty' },
  { value: 'BH-ADP', labelKey: 'types.BH-ADP', group: 'warranty' },
  { value: 'BH-CMP', labelKey: 'types.BH-CMP', group: 'warranty' },
  { value: 'BT-FIL', labelKey: 'types.BT-FIL', group: 'maintenance' },
  { value: 'BT-CLN', labelKey: 'types.BT-CLN', group: 'maintenance' },
  { value: 'BT-COR', labelKey: 'types.BT-COR', group: 'maintenance' },
  { value: 'CS-VIP', labelKey: 'types.CS-VIP', group: 'care' },
  { value: 'CS-WQ', labelKey: 'types.CS-WQ', group: 'care' },
  { value: 'CS-APP', labelKey: 'types.CS-APP', group: 'care' },
  { value: 'TG-ALL', labelKey: 'types.TG-ALL', group: 'bundle' },
  { value: 'TG-SUB', labelKey: 'types.TG-SUB', group: 'bundle' },
] as const;

export type ServiceTypeCode = (typeof SERVICE_PACKAGE_TYPES)[number]['value'];

export function getServiceBillingTypes(
  type: ServiceTypeCode
): readonly ('one_time' | 'recurring' | 'subscription')[] {
  switch (type) {
    case 'TG-SUB':
      return ['subscription'];
    case 'BH-ADP':
    case 'BT-COR':
      return ['one_time', 'recurring'];
    case 'BT-FIL':
    case 'BT-CLN':
    case 'CS-VIP':
    case 'CS-WQ':
    case 'CS-APP':
    case 'TG-ALL':
      return ['recurring'];
    default:
      return ['one_time'];
  }
}

export const PRICING_MODES = [
  { value: 'fixed', labelKey: 'create.pricing.fixed' },
  { value: 'free_or_included', labelKey: 'create.pricing.free_or_included' },
  { value: 'quotation', labelKey: 'create.pricing.quotation' },
] as const;

export const MODEL_SCOPES = [
  { value: 'all', labelKey: 'create.models.all' },
  { value: 'selected', labelKey: 'create.models.selected' },
] as const;

export const DELIVERY_OPTIONS = [
  { value: 'self', labelKey: 'create.delivery.self' },
  { value: 'technician', labelKey: 'create.delivery.technician' },
  { value: 'shipment', labelKey: 'create.delivery.shipment' },
] as const;
