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
