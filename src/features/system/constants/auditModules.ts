// Modules that write to the audit log today; other modules add themselves by
// appending here and to `audit.modules` in the locale files.
export const AUDIT_MODULES = [
  { value: 'auth', labelKey: 'audit.modules.auth' },
  { value: 'members', labelKey: 'audit.modules.members' },
  { value: 'access', labelKey: 'audit.modules.access' },
  { value: 'role_groups', labelKey: 'audit.modules.role_groups' },
  { value: 'system_config', labelKey: 'audit.modules.system_config' },
  { value: 'campaigns', labelKey: 'audit.modules.campaigns' },
  { value: 'backup', labelKey: 'audit.modules.backup' },
  { value: 'simulation', labelKey: 'audit.modules.simulation' },
  { value: 'audit_log', labelKey: 'audit.modules.audit_log' },
  {
    value: 'service_entitlements',
    labelKey: 'audit.modules.service_entitlements',
  },
] as const;
