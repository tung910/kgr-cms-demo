// Canonical device connection states in display order, shared by every
// screen that lists, filters, or counts them. `labelKey` lives in the
// `common` namespace; translate with `t(labelKey, { ns: 'common' })`.
export const CONNECTION_STATUSES = [
  { value: 'online', labelKey: 'connectionStatus.online' },
  { value: 'warning', labelKey: 'connectionStatus.warning' },
  { value: 'offline', labelKey: 'connectionStatus.offline' },
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number]['value'];

export const CONNECTION_STATUS_LABEL_KEYS = Object.fromEntries(
  CONNECTION_STATUSES.map(({ value, labelKey }) => [value, labelKey])
) as Record<ConnectionStatus, string>;
