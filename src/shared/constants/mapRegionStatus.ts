// Stability of a device-map region (spec §5.3), shared by the map legend, the
// region detail and the ranking table. `labelKey` lives in the `common`
// namespace; translate with `t(labelKey, { ns: 'common' })`.
export const MAP_REGION_STATUSES = [
  { value: 'stable', labelKey: 'mapRegionStatus.stable' },
  { value: 'warning', labelKey: 'mapRegionStatus.warning' },
] as const;

export type MapRegionStatus = (typeof MAP_REGION_STATUSES)[number]['value'];

export const MAP_REGION_STATUS_VALUES = MAP_REGION_STATUSES.map(
  ({ value }) => value
) as [MapRegionStatus, ...MapRegionStatus[]];
