// Registered in-app deeplink targets (spec 7.1.c). A campaign CTA may only
// point at a screen the OneKangaroo app has registered — the CMS offers this
// fixed catalogue in a Select, never a free-text field — and every target uses
// the onekangaroo:// scheme. In production the app publishes this list; here it
// is a mock catalogue kept in sync with the seed campaigns. `labelKey` lives in
// the `campaigns` namespace.
export const APP_DEEPLINK_SCHEME = 'onekangaroo://';

export const APP_DEEPLINK_TARGETS = [
  { value: 'onekangaroo://home', labelKey: 'deeplinkTargets.home' },
  {
    value: 'onekangaroo://core/replace',
    labelKey: 'deeplinkTargets.coreReplace',
  },
  {
    value: 'onekangaroo://warranty/renew',
    labelKey: 'deeplinkTargets.warrantyRenew',
  },
  { value: 'onekangaroo://loyalty', labelKey: 'deeplinkTargets.loyalty' },
  { value: 'onekangaroo://shop/cores', labelKey: 'deeplinkTargets.shopCores' },
  {
    value: 'onekangaroo://promo/midautumn',
    labelKey: 'deeplinkTargets.promoMidAutumn',
  },
] as const;

export type AppDeeplinkTarget = (typeof APP_DEEPLINK_TARGETS)[number]['value'];

// Flat list of allowed values for schema validation (enum membership).
export const APP_DEEPLINK_VALUES: readonly string[] = APP_DEEPLINK_TARGETS.map(
  (target) => target.value
);

// Targets that open a screen scoped to one specific device (spec 7.3): the core
// replacement and warranty renewal screens must address the exact machine the
// campaign matched, so the deeplink carries that device's id. The other targets
// (home, loyalty, shop, promo) are account-level and stay as-is.
export const DEVICE_SCOPED_DEEPLINK_VALUES: ReadonlySet<string> = new Set([
  'onekangaroo://core/replace',
  'onekangaroo://warranty/renew',
  // "Mua lõi" in automatic mode: opens the core due on the matched device.
  'onekangaroo://shop/cores',
]);

// A package page (`service-packages/<id>`) is device-scoped too: entitlements
// attach to a machine, so the page must open for the matched device.
const PACKAGE_DEEPLINK_PREFIX = 'onekangaroo://service-packages/';

export function isDeviceScopedDeeplink(
  deeplink: string | null | undefined
): boolean {
  return (
    !!deeplink &&
    (DEVICE_SCOPED_DEEPLINK_VALUES.has(deeplink) ||
      deeplink.startsWith(PACKAGE_DEEPLINK_PREFIX))
  );
}

// Binds a device-scoped deeplink to a concrete device (`?device=<id>`); returns
// account-level targets (and null) unchanged. The same rule applies wherever a
// per-customer send is materialized so the notification opens the right machine.
export function resolveDeviceDeeplink(
  deeplink: string | null,
  deviceId: string
): string | null {
  if (!isDeviceScopedDeeplink(deeplink)) return deeplink;
  return `${deeplink}?device=${encodeURIComponent(deviceId)}`;
}
