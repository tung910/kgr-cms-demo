import type { ServiceTypeCode } from '../constants/servicePackageTypes';
import type { ServicePackageConfiguration } from '../schemas/servicePackageConfiguration';
import type {
  ServicePackageDetails,
  ServicePackageGroup,
} from '../schemas/servicePackageSchemas';

// Pure rules for device service entitlements (spec §4.1, §5.1). No I/O, no
// React — kept easily unit-testable even though this repo has no test runner
// yet. Shared by the service-package create/edit form and the mock backend so
// both compute the same quota and auto-attach eligibility.

export type EntitlementKind = 'one_time' | 'counted' | 'time_only';

// `null` for the bundle types (TG-ALL, TG-SUB): a bundle is not itself an
// entitlement, it decomposes into entitlements for its component packages.
export function getEntitlementKind(
  type: ServiceTypeCode
): EntitlementKind | null {
  switch (type) {
    case 'LD-STD':
    case 'LD-PRO':
    case 'TH-OLD':
      return 'one_time';
    case 'BT-FIL':
    case 'BT-CLN':
    case 'BT-COR':
    case 'CS-WQ':
      return 'counted';
    case 'BH-EXT':
    case 'BH-ADP':
    case 'BH-CMP':
    case 'CS-VIP':
    case 'CS-APP':
      return 'time_only';
    case 'TG-ALL':
    case 'TG-SUB':
      return null;
  }
}

// §5.1 quota table. `quotaMode = 'custom'` overrides the default formula with
// `customQuota` for `one_time`/`counted` kinds (the caller — the create/edit
// form schema — is responsible for enforcing `customQuota` is a positive
// integer before this runs); `time_only` never accepts a custom quota and
// always returns `null`. The result is computed once at attach time and
// frozen into the entitlement snapshot (Task 4) — changing the package's
// configuration later never recomputes an existing entitlement's quota.
export function computeEntitlementQuota(
  configuration: ServicePackageConfiguration,
  termMonths: number | null,
  quotaMode: 'default' | 'custom',
  customQuota: number | null
): number | null {
  const kind = getEntitlementKind(configuration.type);
  if (kind === null || kind === 'time_only') return null;

  if (quotaMode === 'custom') return customQuota;

  if (kind === 'one_time') return 1;

  // kind === 'counted'
  switch (configuration.type) {
    case 'BT-CLN':
      return configuration.visits;
    case 'BT-COR':
      return 1;
    case 'BT-FIL':
    case 'CS-WQ':
      return termMonths === null
        ? 0
        : Math.floor(termMonths / configuration.interval);
    default:
      // Unreachable: every `counted`-kind service type is handled above.
      return null;
  }
}

export type AutoAttachBlocker =
  'pricing' | 'incomplete' | 'bundle' | 'term' | 'zeroQuota';

// §4.1 conditions to allow turning `auto_attach` on for a package. Returns
// every blocker that currently applies (not just the first), in the display
// order the spec lists them. When `details` is `null` (package has no
// configuration yet) only `incomplete` fires — `pricing`, `term` and
// `zeroQuota` need configuration data to evaluate and are otherwise skipped,
// consistent with "gói có cấu hình đầy đủ" being the real gate.
export function getAutoAttachBlockers(pkg: {
  group: ServicePackageGroup;
  termMonths: number | null;
  quotaMode: 'default' | 'custom';
  customQuota: number | null;
  details: Pick<ServicePackageDetails, 'pricingMode' | 'configuration'> | null;
}): AutoAttachBlocker[] {
  const blockers: AutoAttachBlocker[] = [];

  if (pkg.details !== null && pkg.details.pricingMode !== 'free_or_included') {
    blockers.push('pricing');
  }
  if (pkg.details === null) {
    blockers.push('incomplete');
  }
  if (pkg.group === 'bundle') {
    blockers.push('bundle');
  }

  const kind = pkg.details
    ? getEntitlementKind(pkg.details.configuration.type)
    : null;
  if (pkg.termMonths === null && kind !== 'one_time') {
    blockers.push('term');
  }

  if (pkg.details && kind === 'counted') {
    const quota = computeEntitlementQuota(
      pkg.details.configuration,
      pkg.termMonths,
      pkg.quotaMode,
      pkg.customQuota
    );
    if (quota === 0) blockers.push('zeroQuota');
  }

  return blockers;
}
