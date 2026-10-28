import { servicePackageFixtures } from '@/mocks/fixtures/servicePackages';
import {
  servicePackageDraftInputSchema,
  type ServicePackageDto,
} from '@/features/service-packages/schemas/servicePackageSchemas';

// Shared in-memory mock backend for the add-on service catalogue (M11).
// Extracted from servicePackageHandlers.ts so other mock handlers (device
// service entitlements) can read/reference packages without importing the
// handlers module. Resets on reload. Kept as a `const` array mutated via
// push/splice/index assignment, never reassigned, so every importer holds the
// same live reference.
export const packageStore: ServicePackageDto[] = servicePackageFixtures.map(
  (item) => ({
    ...item,
  })
);

// A package can be handed to a device (inventory import) or promoted by a
// campaign only while it is published and fully configured.
export function isGrantablePackage(pkg: ServicePackageDto): boolean {
  return (
    pkg.status === 'active' &&
    servicePackageDraftInputSchema.safeParse(pkg).success
  );
}
