// Whether a product line ships with an IoT module. Non-IoT units never
// connect, so connection status, telemetry and firmware do not apply to
// them; they are tracked through serial, warranty and core-change schedule.
// `labelKey` lives in the `common` namespace.
export const PRODUCT_CONNECTIVITIES = [
  { value: 'iot', labelKey: 'productConnectivity.iot' },
  { value: 'non_iot', labelKey: 'productConnectivity.non_iot' },
] as const;

export type ProductConnectivity =
  (typeof PRODUCT_CONNECTIVITIES)[number]['value'];

export const PRODUCT_CONNECTIVITY_LABEL_KEYS = Object.fromEntries(
  PRODUCT_CONNECTIVITIES.map(({ value, labelKey }) => [value, labelKey])
) as Record<ProductConnectivity, string>;
