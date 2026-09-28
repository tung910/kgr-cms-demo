// Four-tier account hierarchy (SP-Admin > System Admin > Admin lĩnh vực >
// Người dùng). Feature-only, so labels live in the `system` namespace.
export const ACCOUNT_LEVELS = [
  { value: 'sp_admin', labelKey: 'members.levels.sp_admin' },
  { value: 'system_admin', labelKey: 'members.levels.system_admin' },
  { value: 'field_admin', labelKey: 'members.levels.field_admin' },
  { value: 'user', labelKey: 'members.levels.user' },
] as const;
