import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import i18n from '@/core/i18n';
import { isPortalRole, type PortalRole } from '@/core/auth/types';
import {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  type Capability,
} from '@/core/permissions/capabilities';
import { applyCumulativeRead } from '@/core/permissions/permissionCatalog';
import { randomId } from '@/shared/lib/id';

import {
  backupDtoSchema,
  systemConfigDtoSchema,
  type AuditEntryDto,
  type BackupDto,
  type AccountLevel,
  type CatalogKey,
  type MemberDto,
  type RoleGroupDto,
  type SystemConfigDto,
} from '../schemas/systemSchemas';
import {
  configFixture,
  demoMemberSeeds,
  mockPassword,
  seedGroups,
  SYSTEM_ADMIN_CAPABILITIES,
} from './systemFixtures';

// In-memory mock backend for M10 (resets on reload). It stands in for the real
// API, so authorization, privilege-escalation checks, lockout and audit
// logging all live here rather than in the components.

const roleKey = 'cms-portal:mock-auth-role'; // effective role (shared with handlers.ts)
const userKey = 'cms-portal:mock-auth-user';
const simulatedKey = 'cms-portal:mock-auth-simulated';
const mockIp = '10.10.0.24';

interface MemberRecord {
  id: string;
  fullName: string;
  phone: string;
  password: string;
  roleId: PortalRole;
  status: 'active' | 'locked' | 'disabled';
  lastAccessAt: string | null;
  assignedRegions: string[];
  lockedReason: string | null;
  deleted: boolean;
  level: AccountLevel;
  // Creator (the owner for an Admin lĩnh vực).
  parentId: string | null;
  // Set on Admin lĩnh vực only: the System Admin that owns it.
  ownerSystemAdminId: string | null;
}

interface GroupRecord {
  id: PortalRole;
  customName: string | null;
  parentId: PortalRole | null;
  capabilities: Capability[];
  // Set on a System Admin's own group; otherwise derived from parentId.
  level?: AccountLevel;
  // Member that created a custom group.
  createdBy?: string;
}

// Group management stays above the Admin lĩnh vực: never part of their groups.
const FIELD_ADMIN_BARRED: readonly Capability[] = [
  'role.create_root',
  'role.create',
  'role.update',
  'role.delete',
  'role.simulate',
];

const memberStore: MemberRecord[] = demoMemberSeeds.map((seed, index) => ({
  id: seed.id,
  fullName: seed.fullName,
  phone: seed.phone,
  password: mockPassword,
  roleId: seed.roleId,
  status: seed.locked ? 'locked' : 'active',
  lastAccessAt: seed.locked
    ? null
    : new Date(Date.now() - (index + 1) * 3_600_000 * 5).toISOString(),
  assignedRegions: [],
  lockedReason: seed.locked ? 'Nghỉ việc tạm thời' : null,
  deleted: false,
  level: seed.level,
  parentId: seed.parentId,
  ownerSystemAdminId: seed.level === 'field_admin' ? seed.parentId : null,
}));

const groupStore: GroupRecord[] = [
  {
    id: 'super_admin',
    customName: null,
    parentId: null,
    capabilities: [...ROLE_CAPABILITIES.super_admin],
  },
  ...seedGroups.map((group) => ({
    id: group.id,
    customName: group.name,
    parentId: group.parentId,
    capabilities: [...group.capabilities],
    ...(group.level ? { level: group.level } : {}),
  })),
];

let configStore: SystemConfigDto = structuredClone(configFixture);
export function getSystemConfigParams() {
  return configStore.params;
}

const auditStore: AuditEntryDto[] = [];
const backupStore: BackupDto[] = [3, 2, 1].map((daysAgo) => ({
  id: `bk-seed-${daysAgo}`,
  code: `BK-SEED-${daysAgo}`,
  kind: 'scheduled',
  created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  size_mb: 512 + daysAgo * 8,
  created_by: null,
}));

const loginAttempts = new Map<string, { fails: number; lockedUntil: number }>();

function groupName(role: PortalRole): string {
  const group = groupStore.find((item) => item.id === role);
  return group?.customName ?? i18n.t(`roles.${role}`, { ns: 'common' });
}

function findGroup(role: PortalRole): GroupRecord | undefined {
  return groupStore.find((group) => group.id === role);
}

// ---- helpers ---------------------------------------------------------------

function fail(status: number, code: string, message = code) {
  return HttpResponse.json({ code, message }, { status });
}

function currentUser(): MemberRecord | undefined {
  const id = localStorage.getItem(userKey);
  return memberStore.find(
    (member) =>
      member.id === id && !member.deleted && member.status === 'active'
  );
}

function byId(id: string | null): MemberRecord | undefined {
  return id === null
    ? undefined
    : memberStore.find((member) => member.id === id && !member.deleted);
}

// The System Admin an account ultimately belongs to (itself for a System
// Admin; none for SP-Admin).
function ownerSystemAdmin(member: MemberRecord): MemberRecord | undefined {
  if (member.level === 'system_admin') return member;
  if (member.level === 'field_admin') return byId(member.ownerSystemAdminId);
  const parent = byId(member.parentId);
  return member.level === 'user' && parent
    ? ownerSystemAdmin(parent)
    : undefined;
}

// Capabilities the account really holds: its group's, cut down to whatever its
// superiors still hold. Whatever is cut stays visible as `inactive`, so a
// revocation above never leaves a subordinate holding a right nobody backs.
function effectiveCapabilities(member: MemberRecord): Capability[] {
  const group = findGroup(member.roleId)?.capabilities ?? [];
  // A plain user never manages accounts, even when it shares its Admin's group.
  const own =
    member.level === 'user'
      ? group.filter((c) => !c.startsWith('member.') && !c.startsWith('role.'))
      : group;
  const parent =
    member.level === 'field_admin'
      ? byId(member.ownerSystemAdminId)
      : member.level === 'user'
        ? byId(member.parentId)
        : undefined;
  if (!parent) return own;
  const granted = effectiveCapabilities(parent);
  return own.filter((capability) => granted.includes(capability));
}

// While simulating, the simulated role's group applies (read-only anyway).
function activeCapabilities(user: MemberRecord): Capability[] {
  return localStorage.getItem(simulatedKey)
    ? (findGroup(effectiveRole(user))?.capabilities ?? [])
    : effectiveCapabilities(user);
}

// Ownership scope: SP-Admin sees all; a System Admin the Admin lĩnh vực it
// owns and their users; an Admin lĩnh vực only the users it created.
function inScope(actor: MemberRecord, target: MemberRecord): boolean {
  switch (actor.level) {
    case 'sp_admin':
      return true;
    case 'system_admin':
      return (
        (target.level === 'field_admin' || target.level === 'user') &&
        ownerSystemAdmin(target)?.id === actor.id
      );
    case 'field_admin':
      return target.level === 'user' && target.parentId === actor.id;
    default:
      return false;
  }
}

const LEVEL_RANK: Record<AccountLevel, number> = {
  sp_admin: 3,
  system_admin: 2,
  field_admin: 1,
  user: 0,
};

const NEXT_LEVEL: Record<AccountLevel, AccountLevel | null> = {
  sp_admin: 'system_admin',
  system_admin: 'field_admin',
  field_admin: 'user',
  user: null,
};

// Refuses and leaves an audit entry, so probing outside the scope is traceable.
function deny(actor: MemberRecord, target: string, code: string, status = 403) {
  recordAudit(actor, {
    module: 'access',
    action: 'access_denied',
    target,
    after: { code },
  });
  return fail(status, code);
}

function effectiveRole(user: MemberRecord): PortalRole {
  const simulated = localStorage.getItem(simulatedKey);
  return isPortalRole(simulated) ? simulated : user.roleId;
}

type Authorized =
  | { user: MemberRecord; error?: undefined }
  | { user?: undefined; error: Response };

function authorize(capability: Capability | null, write: boolean): Authorized {
  const user = currentUser();
  if (!user) return { error: fail(401, 'unauthenticated') };
  if (write && localStorage.getItem(simulatedKey)) {
    return { error: fail(403, 'simulation_read_only') };
  }
  if (capability && !activeCapabilities(user).includes(capability)) {
    return { error: deny(user, capability, 'forbidden') };
  }
  return { user };
}

async function readBody<T>(request: Request, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success
    ? { data: parsed.data }
    : { error: fail(422, 'validation', parsed.error.issues[0]?.message) };
}

// Exported so other mock modules can append to the same audit trail.
export function recordAudit(
  actor: Pick<MemberRecord, 'id' | 'fullName'> | null,
  entry: {
    module: string;
    action: string;
    target: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
    actorName?: string;
  }
): void {
  auditStore.unshift({
    id: randomId(),
    occurred_at: new Date().toISOString(),
    actor_id: actor?.id ?? 'anonymous',
    actor_name: actor?.fullName ?? entry.actorName ?? '—',
    ip: mockIp,
    module: entry.module,
    action: entry.action,
    target: entry.target,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  });
}

// Keeps only keys whose value changed so the audit diff stays readable.
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );
  return {
    before: Object.fromEntries(keys.map((key) => [key, before[key]])),
    after: Object.fromEntries(keys.map((key) => [key, after[key]])),
  };
}

function paginate<T>(items: T[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('page_size')) || 20)
  );
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function memberDto(member: MemberRecord, actor: MemberRecord): MemberDto {
  const effective = effectiveCapabilities(member);
  return {
    id: member.id,
    full_name: member.fullName,
    phone: member.phone,
    role_id: member.roleId,
    role_name: groupName(member.roleId),
    status: member.status,
    last_access_at: member.lastAccessAt,
    assigned_regions: member.assignedRegions,
    locked_reason: member.lockedReason,
    level: member.level,
    parent_id: member.parentId,
    owner_system_admin_id: ownerSystemAdmin(member)?.id ?? null,
    capabilities: effective,
    inactive_capabilities: (
      findGroup(member.roleId)?.capabilities ?? []
    ).filter((capability) => !effective.includes(capability)),
    manageable: canManage(actor, member),
    transferable:
      actor.level === 'sp_admin' &&
      member.level === 'field_admin' &&
      canManage(actor, member),
  };
}

// Anti privilege-escalation: only accounts inside the actor's ownership scope,
// never itself (so nobody edits or raises their own permissions).
function canManage(actor: MemberRecord, target: MemberRecord): boolean {
  return (
    actor.id !== target.id &&
    actor.status === 'active' &&
    inScope(actor, target)
  );
}

// A group may only be handed out when every capability in it is one the actor
// itself holds (child ⊆ parent).
// Which tier a group belongs to: a System Admin's own group, the groups under
// it (for Admin lĩnh vực), or an end-user group.
function groupLevel(role: PortalRole): AccountLevel {
  if (role === 'super_admin') return 'sp_admin';
  const group = findGroup(role);
  return group?.level ?? (group?.parentId ? 'field_admin' : 'user');
}

function canAssign(
  actor: MemberRecord,
  role: PortalRole,
  level: AccountLevel
): boolean {
  const group = findGroup(role);
  if (!group || role === 'super_admin') return false;
  // An Admin lĩnh vực has no groups of its own to hand out: its members share
  // its own group (same functions), so nothing else can be granted.
  if (actor.level === 'field_admin') return role === actor.roleId;
  if (groupLevel(role) !== level) return false;
  // A System Admin hands out only the field groups it created itself.
  if (actor.level === 'system_admin' && group.parentId !== actor.roleId) {
    return false;
  }
  const held = effectiveCapabilities(actor);
  return group.capabilities.every((capability) => held.includes(capability));
}

// Hands an Admin lĩnh vực (and, through it, its users) to another System Admin.
function transferOwner(
  actor: MemberRecord,
  admin: MemberRecord,
  newOwner: MemberRecord,
  reason: string
): void {
  const previous = byId(admin.ownerSystemAdminId);
  admin.ownerSystemAdminId = newOwner.id;
  admin.parentId = newOwner.id;
  recordAudit(actor, {
    module: 'members',
    action: 'transfer',
    target: admin.phone,
    before: { owner_system_admin: previous?.fullName ?? null },
    after: { owner_system_admin: newOwner.fullName },
    reason,
  });
}

// What a child group may hold at most: its parent's capabilities.
function groupCeiling(group: GroupRecord): Capability[] | null {
  if (group.level === 'system_admin') return SYSTEM_ADMIN_CAPABILITIES;
  const parent = group.parentId ? findGroup(group.parentId) : undefined;
  return parent
    ? parent.capabilities.filter((c) => !FIELD_ADMIN_BARRED.includes(c))
    : null;
}

function groupDto(group: GroupRecord): RoleGroupDto {
  return {
    id: group.id,
    name: groupName(group.id),
    is_system: !group.id.startsWith('custom:'),
    locked: group.id === 'super_admin',
    member_count: memberStore.filter(
      (member) => !member.deleted && member.roleId === group.id
    ).length,
    level: groupLevel(group.id),
    parent_id: group.parentId,
    parent_capabilities: groupCeiling(group),
    capabilities: group.capabilities,
  };
}

function sessionDto(user: MemberRecord) {
  const role = effectiveRole(user);
  return {
    user: { id: user.id, full_name: user.fullName, phone: user.phone },
    role_id: role,
    role_name: groupName(role),
    capabilities: activeCapabilities(user),
    idle_timeout_minutes: configStore.params.session_timeout_minutes,
    simulated_from:
      role === user.roleId
        ? null
        : { role_id: user.roleId, name: groupName(user.roleId) },
  };
}

function passwordIssue(password: string): string | null {
  const min = configStore.params.password_min_length;
  return password.length >= min &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
    ? null
    : String(min);
}

function phoneTaken(phone: string, exceptId?: string): boolean {
  return memberStore.some(
    (member) =>
      !member.deleted && member.phone === phone && member.id !== exceptId
  );
}

// ---- schemas ---------------------------------------------------------------

const roleIdSchema = z.custom<PortalRole>(isPortalRole);

const memberBodySchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^0[35789]\d{8}$/),
  password: z.string().optional(),
  // Absent when SP-Admin creates a System Admin: its group is made from `capabilities`.
  role_id: roleIdSchema.optional(),
  capabilities: z.array(z.enum(CAPABILITIES)).optional(),
  assigned_regions: z.array(z.string()),
});

const reasonBodySchema = z.object({
  reason: z.string().trim().min(1),
  transfer_to_id: z.string().optional(),
});

const roleGroupBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  capabilities: z.array(z.enum(CAPABILITIES)).min(1),
  // A System Admin group (a new Admin lĩnh vực group under it) or none.
  parent_id: roleIdSchema.nullish(),
});

const configBodySchema = systemConfigDtoSchema.pick({
  params: true,
  catalogs: true,
});

// ---- handlers --------------------------------------------------------------

function auditFiltered(url: URL): AuditEntryDto[] {
  const actor = url.searchParams.get('actor')?.toLowerCase();
  const moduleName = url.searchParams.get('module');
  const action = url.searchParams.get('action')?.toLowerCase();
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  return auditStore.filter(
    (entry) =>
      (!actor || entry.actor_name.toLowerCase().includes(actor)) &&
      (!moduleName || entry.module === moduleName) &&
      (!action || entry.action.toLowerCase().includes(action)) &&
      (!from || entry.occurred_at.slice(0, 10) >= from) &&
      (!to || entry.occurred_at.slice(0, 10) <= to)
  );
}

export const systemHandlers = [
  // -- auth ------------------------------------------------------------------
  http.post('/api/auth/login', async ({ request }) => {
    const body = await readBody(
      request,
      z.object({ phone: z.string(), password: z.string() })
    );
    if (body.error) return body.error;

    const { phone, password } = body.data;
    const member = memberStore.find((m) => !m.deleted && m.phone === phone);
    const { login_max_failed: maxFailed, lockout_minutes: lockMinutes } =
      configStore.params;
    const attempt = loginAttempts.get(phone) ?? { fails: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > Date.now()) {
      return fail(
        422,
        'attempts_locked',
        String(Math.ceil((attempt.lockedUntil - Date.now()) / 60_000))
      );
    }

    // The same error covers unknown phone and wrong password (no enumeration).
    if (!member || member.password !== password) {
      if (member) {
        attempt.fails += 1;
        if (attempt.fails >= maxFailed) {
          attempt.fails = 0;
          attempt.lockedUntil = Date.now() + lockMinutes * 60_000;
        }
        loginAttempts.set(phone, attempt);
      }
      recordAudit(member ?? null, {
        module: 'auth',
        action: 'login_failed',
        target: phone,
        actorName: phone,
      });
      return fail(422, 'invalid_credentials');
    }

    if (member.status !== 'active') return fail(422, 'account_locked');

    loginAttempts.delete(phone);
    member.lastAccessAt = new Date().toISOString();
    localStorage.setItem(userKey, member.id);
    localStorage.setItem(roleKey, member.roleId);
    localStorage.removeItem(simulatedKey);
    recordAudit(member, {
      module: 'auth',
      action: 'login',
      target: member.phone,
    });

    return HttpResponse.json(sessionDto(member));
  }),

  http.get('/api/auth/session', () => {
    const user = currentUser();
    if (!user) return fail(401, 'unauthenticated');
    return HttpResponse.json(sessionDto(user));
  }),

  http.post('/api/auth/logout', () => {
    localStorage.removeItem(userKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(simulatedKey);
    return HttpResponse.json({});
  }),

  http.post('/api/auth/simulate', async ({ request }) => {
    const user = currentUser();
    if (!user) return fail(401, 'unauthenticated');
    // Authorization uses the *actual* role: a simulated one cannot escalate.
    if (!effectiveCapabilities(user).includes('role.simulate')) {
      return fail(403, 'forbidden');
    }

    const body = await readBody(
      request,
      z.object({ role_id: roleIdSchema.nullable() })
    );
    if (body.error) return body.error;

    const target = body.data.role_id;
    if (target === null) {
      localStorage.removeItem(simulatedKey);
      localStorage.setItem(roleKey, user.roleId);
      recordAudit(user, {
        module: 'simulation',
        action: 'simulation_end',
        target: groupName(effectiveRole(user)),
      });
    } else {
      if (!findGroup(target) || target === user.roleId) {
        return fail(422, 'invalid_role');
      }
      localStorage.setItem(simulatedKey, target);
      localStorage.setItem(roleKey, target);
      recordAudit(user, {
        module: 'simulation',
        action: 'simulation_start',
        target: groupName(target),
      });
    }

    return HttpResponse.json(sessionDto(user));
  }),

  http.post('/api/auth/change-password', async ({ request }) => {
    const auth = authorize(null, true);
    if (auth.error) return auth.error;

    const body = await readBody(
      request,
      z.object({ current_password: z.string(), new_password: z.string() })
    );
    if (body.error) return body.error;

    if (body.data.current_password !== auth.user.password) {
      return fail(422, 'invalid_credentials');
    }
    const issue = passwordIssue(body.data.new_password);
    if (issue) return fail(422, 'weak_password', issue);

    auth.user.password = body.data.new_password;
    recordAudit(auth.user, {
      module: 'auth',
      action: 'change_password',
      target: auth.user.phone,
    });
    return HttpResponse.json({});
  }),

  // -- members ---------------------------------------------------------------
  // Only the caller itself and what falls inside its ownership scope.
  http.get('/api/system/members', ({ request }) => {
    const auth = authorize('member.read', false);
    if (auth.error) return auth.error;
    const { user } = auth;

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim().toLowerCase();
    const roleId = url.searchParams.get('role_id');
    const ownerId = url.searchParams.get('owner_id');

    const rows = memberStore.filter(
      (member) =>
        !member.deleted &&
        (member.id === user.id || inScope(user, member)) &&
        (!roleId || member.roleId === roleId) &&
        (!ownerId ||
          (member.level === 'field_admin' &&
            member.ownerSystemAdminId === ownerId)) &&
        (!search ||
          member.fullName.toLowerCase().includes(search) ||
          member.phone.includes(search) ||
          groupName(member.roleId).toLowerCase().includes(search))
    );
    const page = paginate(rows, url);
    return HttpResponse.json({
      ...page,
      items: page.items.map((member) => memberDto(member, user)),
    });
  }),

  http.get('/api/system/member-options', () => {
    const user = currentUser();
    if (!user) return fail(401, 'unauthenticated');
    const caps = activeCapabilities(user);
    if (!caps.includes('member.create') && !caps.includes('member.update')) {
      return deny(user, 'member-options', 'forbidden');
    }

    return HttpResponse.json({
      roles: groupStore
        .filter((group) => canAssign(user, group.id, groupLevel(group.id)))
        .map((group) => ({
          id: group.id,
          name: groupName(group.id),
          level: user.level === 'field_admin' ? 'user' : groupLevel(group.id),
        })),
      regions: configStore.catalogs.region.map(({ code, name }) => ({
        code,
        name,
      })),
      create_level: NEXT_LEVEL[user.level],
      create_capabilities:
        NEXT_LEVEL[user.level] === 'system_admin'
          ? SYSTEM_ADMIN_CAPABILITIES
          : null,
      system_admins:
        user.level === 'sp_admin'
          ? memberStore
              .filter(
                (member) =>
                  !member.deleted &&
                  member.level === 'system_admin' &&
                  member.status === 'active'
              )
              .map((member) => ({ id: member.id, name: member.fullName }))
          : [],
    });
  }),

  http.post('/api/system/members', async ({ request }) => {
    const auth = authorize('member.create', true);
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await readBody(request, memberBodySchema);
    if (body.error) return body.error;
    const values = body.data;

    // The new account's level follows from the creator's: SP-Admin → System
    // Admin → Admin lĩnh vực → user. Nobody can create SP-Admin or a peer.
    const level = NEXT_LEVEL[user.level];
    if (!level) return deny(user, values.phone, 'forbidden');
    if (!values.password) return fail(422, 'validation', 'password');
    const issue = passwordIssue(values.password);
    if (issue) return fail(422, 'weak_password', issue);
    // Super Admin is "1 user only" (plan [PQ!D9]).
    if (values.role_id === 'super_admin')
      return fail(422, 'super_admin_single');
    if (level !== 'system_admin' || values.role_id) {
      if (!values.role_id || !canAssign(user, values.role_id, level)) {
        return deny(user, values.phone, 'exceeds_permissions');
      }
    } else if (!values.capabilities?.length) {
      return fail(422, 'validation', 'capabilities');
    } else if (
      values.capabilities.some((c) => !SYSTEM_ADMIN_CAPABILITIES.includes(c))
    ) {
      return fail(422, 'exceeds_parent');
    }
    if (phoneTaken(values.phone)) return fail(422, 'phone_taken');

    // Keep the selected System Admin group; only the legacy capabilities-only
    // input needs a new group created for the account.
    let roleId: PortalRole | undefined = values.role_id;
    if (level === 'system_admin' && !roleId) {
      const name = `System Admin - ${values.full_name}`;
      if (groupStore.some((g) => !g.parentId && groupName(g.id) === name)) {
        return fail(422, 'name_taken');
      }
      const group: GroupRecord = {
        id: `custom:sys-${randomId().slice(0, 8)}`,
        customName: name,
        level,
        parentId: null,
        createdBy: user.id,
        capabilities: [...applyCumulativeRead(new Set(values.capabilities))],
      };
      groupStore.push(group);
      roleId = group.id;
    }
    if (!roleId) return fail(422, 'validation', 'role_id');

    const member: MemberRecord = {
      id: `u-${randomId()}`,
      fullName: values.full_name,
      phone: values.phone,
      password: values.password,
      roleId,
      status: 'active',
      lastAccessAt: null,
      assignedRegions: values.assigned_regions,
      lockedReason: null,
      deleted: false,
      level,
      parentId: user.id,
      ownerSystemAdminId: level === 'field_admin' ? user.id : null,
    };
    memberStore.unshift(member);
    recordAudit(user, {
      module: 'members',
      action: 'create',
      target: member.phone,
      after: {
        full_name: member.fullName,
        level: member.level,
        role: groupName(member.roleId),
        assigned_regions: member.assignedRegions,
      },
    });
    return HttpResponse.json(memberDto(member, user), { status: 201 });
  }),

  http.put('/api/system/members/:id', async ({ params, request }) => {
    const auth = authorize('member.update', true);
    if (auth.error) return auth.error;
    const { user } = auth;

    const member = byId(String(params.id));
    if (!member) return fail(404, 'not_found');
    if (!canManage(user, member)) {
      return deny(user, member.phone, 'out_of_scope');
    }

    const body = await readBody(request, memberBodySchema);
    if (body.error) return body.error;
    const values = body.data;

    if (values.password) {
      const issue = passwordIssue(values.password);
      if (issue) return fail(422, 'weak_password', issue);
    }
    const nextRole = values.role_id ?? member.roleId;
    if (
      nextRole !== member.roleId &&
      (nextRole === 'super_admin' || !canAssign(user, nextRole, member.level))
    ) {
      return deny(user, member.phone, 'exceeds_permissions');
    }
    if (phoneTaken(values.phone, member.id)) return fail(422, 'phone_taken');

    const changes = diff(
      {
        full_name: member.fullName,
        phone: member.phone,
        role: groupName(member.roleId),
        assigned_regions: member.assignedRegions,
      },
      {
        full_name: values.full_name,
        phone: values.phone,
        role: groupName(nextRole),
        assigned_regions: values.assigned_regions,
      }
    );
    member.fullName = values.full_name;
    member.phone = values.phone;
    member.roleId = nextRole;
    member.assignedRegions = values.assigned_regions;
    if (values.password) member.password = values.password;

    recordAudit(user, {
      module: 'members',
      action: 'update',
      target: member.phone,
      ...changes,
    });
    return HttpResponse.json(memberDto(member, user));
  }),

  http.post('/api/system/members/:id/:action', async ({ params, request }) => {
    const action = String(params.action);
    if (!['lock', 'unlock', 'disable', 'delete', 'transfer'].includes(action)) {
      return fail(404, 'not_found');
    }
    const auth = authorize(
      action === 'delete' ? 'member.delete' : 'member.update',
      true
    );
    if (auth.error) return auth.error;
    const { user } = auth;

    const member = byId(String(params.id));
    if (!member) return fail(404, 'not_found');
    if (!canManage(user, member)) {
      return deny(user, member.phone, 'out_of_scope');
    }

    const body = await readBody(request, reasonBodySchema);
    if (body.error) return body.error;
    const { reason, transfer_to_id: transferToId } = body.data;

    // A new owner must be another System Admin that is still active.
    const newOwner = byId(transferToId ?? null);
    const ownerOk =
      newOwner?.level === 'system_admin' &&
      newOwner.status === 'active' &&
      newOwner.id !== member.id;

    if (action === 'transfer') {
      if (user.level !== 'sp_admin') {
        return deny(user, member.phone, 'forbidden');
      }
      if (member.level !== 'field_admin') return fail(422, 'invalid_target');
      if (!newOwner || !ownerOk || newOwner.id === member.ownerSystemAdminId) {
        return fail(422, 'invalid_owner');
      }
      transferOwner(user, member, newOwner, reason);
      return HttpResponse.json({});
    }

    if (action === 'delete' && member.level === 'system_admin') {
      return fail(422, 'no_hard_delete');
    }
    if (
      action === 'delete' &&
      memberStore.some((m) => !m.deleted && m.parentId === member.id)
    ) {
      return fail(409, 'has_children');
    }

    // A System Admin cannot be locked or disabled while it still owns Admin
    // lĩnh vực: they must be handed to another active System Admin first.
    if (
      (action === 'lock' || action === 'disable') &&
      member.level === 'system_admin'
    ) {
      const owned = memberStore.filter(
        (m) =>
          !m.deleted &&
          m.level === 'field_admin' &&
          m.ownerSystemAdminId === member.id
      );
      if (owned.length > 0) {
        if (!transferToId) return fail(409, 'owned_admins_pending');
        if (!newOwner || !ownerOk) return fail(422, 'invalid_owner');
        for (const admin of owned) transferOwner(user, admin, newOwner, reason);
      }
    }

    const beforeStatus = member.status;
    if (action === 'lock' || action === 'disable') {
      member.status = action === 'lock' ? 'locked' : 'disabled';
      member.lockedReason = reason;
    } else if (action === 'unlock') {
      member.status = 'active';
      member.lockedReason = null;
      loginAttempts.delete(member.phone);
    } else {
      // Soft delete keeps the row for traceability ([PQ!J65]).
      member.deleted = true;
    }

    recordAudit(user, {
      module: 'members',
      action,
      target: member.phone,
      before: { status: beforeStatus },
      after: { status: action === 'delete' ? 'deleted' : member.status },
      reason,
    });
    return HttpResponse.json({});
  }),

  // -- role groups -----------------------------------------------------------
  http.get('/api/system/role-groups', () => {
    const auth = authorize('role.read', false);
    if (auth.error) return auth.error;
    // A viewer only sees the groups of tiers below its own account level, so
    // e.g. an Admin never sees the Super Admin matrix (SP-Admin sees all).
    // A System Admin only sees the field groups under its own group.
    const visible = groupStore.filter((group) =>
      auth.user.level === 'sp_admin'
        ? true
        : auth.user.level === 'system_admin'
          ? group.id === auth.user.roleId || group.parentId === auth.user.roleId
          : LEVEL_RANK[groupLevel(group.id)] < LEVEL_RANK[auth.user.level]
    );
    return HttpResponse.json(visible.map(groupDto));
  }),

  http.post('/api/system/role-groups', async ({ request }) => {
    const auth = authorize('role.create', true);
    if (auth.error) return auth.error;

    const body = await readBody(request, roleGroupBodySchema);
    if (body.error) return body.error;

    const { user } = auth;
    const parentId = body.data.parent_id ?? null;
    if (
      auth.user.level !== 'sp_admin' &&
      (auth.user.level !== 'system_admin' || parentId !== auth.user.roleId)
    ) {
      return deny(auth.user, 'role.create', 'forbidden');
    }
    if (!parentId && !activeCapabilities(user).includes('role.create_root')) {
      return deny(user, 'role.create_root', 'forbidden');
    }
    if (
      parentId &&
      (!findGroup(parentId) || groupLevel(parentId) !== 'system_admin')
    ) {
      return fail(422, 'invalid_parent');
    }
    if (
      groupStore.some(
        (group) =>
          group.parentId === parentId &&
          groupName(group.id).toLowerCase() === body.data.name.toLowerCase()
      )
    ) {
      return fail(422, 'name_taken');
    }
    const ceiling = parentId
      ? groupCeiling({
          id: 'custom:new',
          customName: null,
          capabilities: [],
          parentId,
        })
      : SYSTEM_ADMIN_CAPABILITIES;
    if (ceiling && body.data.capabilities.some((c) => !ceiling.includes(c))) {
      return fail(422, 'exceeds_parent');
    }
    const group: GroupRecord = {
      id: `custom:${randomId().slice(0, 8)}`,
      customName: body.data.name,
      ...(parentId ? {} : { level: 'system_admin' as const }),
      createdBy: user.id,
      parentId,
      capabilities: [...applyCumulativeRead(new Set(body.data.capabilities))],
    };
    groupStore.push(group);
    recordAudit(auth.user, {
      module: 'role_groups',
      action: 'create',
      target: body.data.name,
      after: {
        name: body.data.name,
        parent_id: parentId,
        capabilities: group.capabilities,
      },
    });
    return HttpResponse.json(groupDto(group), { status: 201 });
  }),

  http.put('/api/system/role-groups/:id', async ({ params, request }) => {
    const auth = authorize('role.update', true);
    if (auth.error) return auth.error;

    const id = decodeURIComponent(String(params.id));
    const group = isPortalRole(id) ? findGroup(id) : undefined;
    if (!group) return fail(404, 'not_found');
    if (
      auth.user.level !== 'sp_admin' &&
      (auth.user.level !== 'system_admin' ||
        group.parentId !== auth.user.roleId)
    ) {
      return deny(auth.user, 'role.update', 'forbidden');
    }
    // Nobody may narrow the Super Admin group ([PQ!J66]).
    if (group.id === 'super_admin') return fail(403, 'group_locked');

    const body = await readBody(request, roleGroupBodySchema);
    if (body.error) return body.error;

    // A child group can never exceed its parent.
    const ceiling = groupCeiling(group);
    if (ceiling && body.data.capabilities.some((c) => !ceiling.includes(c))) {
      return fail(422, 'exceeds_parent');
    }

    const isCustom = group.id.startsWith('custom:');
    const nextName = isCustom ? body.data.name : groupName(group.id);
    if (
      groupStore.some(
        (other) =>
          other.id !== group.id &&
          other.parentId === group.parentId &&
          groupName(other.id).toLowerCase() === nextName.toLowerCase()
      )
    ) {
      return fail(422, 'name_taken');
    }

    const before = {
      name: groupName(group.id),
      capabilities: group.capabilities,
    };
    if (isCustom) group.customName = nextName;
    group.capabilities = [
      ...applyCumulativeRead(new Set(body.data.capabilities)),
    ];

    recordAudit(auth.user, {
      module: 'role_groups',
      action: 'update',
      target: nextName,
      ...diff(before, { name: nextName, capabilities: group.capabilities }),
    });
    return HttpResponse.json(groupDto(group));
  }),

  http.delete('/api/system/role-groups/:id', ({ params }) => {
    const auth = authorize('role.delete', true);
    if (auth.error) return auth.error;

    const id = decodeURIComponent(String(params.id));
    const index = groupStore.findIndex((group) => group.id === id);
    const group = groupStore[index];
    if (!group) return fail(404, 'not_found');
    if (group.id === 'super_admin') return fail(403, 'group_locked');
    if (
      groupDto(group).member_count > 0 ||
      groupStore.some((other) => other.parentId === group.id)
    ) {
      return fail(409, 'group_in_use');
    }

    groupStore.splice(index, 1);
    recordAudit(auth.user, {
      module: 'role_groups',
      action: 'delete',
      target: groupName(group.id),
      before: { capabilities: group.capabilities },
    });
    return HttpResponse.json({});
  }),

  // -- audit log (append-only: no create/update/delete route exists) ---------
  http.get('/api/system/audit-logs', ({ request }) => {
    const auth = authorize('audit.read', false);
    if (auth.error) return auth.error;
    return HttpResponse.json(
      paginate(auditFiltered(new URL(request.url)), new URL(request.url))
    );
  }),

  http.get('/api/system/audit-logs/export', ({ request }) => {
    const auth = authorize('audit.export', false);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const rows = auditFiltered(url);
    recordAudit(auth.user, {
      module: 'audit_log',
      action: 'export',
      target: `${rows.length}`,
      after: Object.fromEntries(url.searchParams),
    });
    return HttpResponse.json({
      items: rows.slice(0, 5000),
      page: 1,
      page_size: 5000,
      total: rows.length,
    });
  }),

  // -- config & backups ------------------------------------------------------
  http.get('/api/system/config', () => {
    const auth = authorize('config.read', false);
    if (auth.error) return auth.error;
    return HttpResponse.json(configStore);
  }),

  http.put('/api/system/config', async ({ request }) => {
    const auth = authorize('config.update', true);
    if (auth.error) return auth.error;

    const body = await readBody(request, configBodySchema);
    if (body.error) return body.error;

    if (
      (body.data.params.campaign_frequency_limit !==
        configStore.params.campaign_frequency_limit ||
        body.data.params.campaign_frequency_days !==
          configStore.params.campaign_frequency_days) &&
      !activeCapabilities(auth.user).includes('campaign.frequency.config')
    )
      return fail(403, 'forbidden');
    const catalogKeys: CatalogKey[] = ['model', 'core', 'region'];
    for (const key of catalogKeys) {
      const codes = body.data.catalogs[key].map((item) => item.code);
      if (new Set(codes).size !== codes.length) {
        return fail(422, 'duplicate_code', key);
      }
    }

    const before = { ...configStore.params, ...configStore.catalogs };
    configStore = {
      ...body.data,
      updated_at: new Date().toISOString(),
    };
    recordAudit(auth.user, {
      module: 'system_config',
      action: 'update',
      target: 'config',
      ...diff(before, { ...configStore.params, ...configStore.catalogs }),
    });
    return HttpResponse.json(configStore);
  }),

  http.get('/api/system/backups', () => {
    const auth = authorize('backup.read', false);
    if (auth.error) return auth.error;
    return HttpResponse.json(backupStore);
  }),

  http.post('/api/system/backups', () => {
    const auth = authorize('backup.run', true);
    if (auth.error) return auth.error;

    const now = new Date();
    const backup = backupDtoSchema.parse({
      id: randomId(),
      code: `BK-${now.toISOString().slice(0, 16).replace(/\D/g, '')}`,
      kind: 'manual',
      created_at: now.toISOString(),
      size_mb: 540,
      created_by: auth.user.fullName,
    });
    backupStore.unshift(backup);
    recordAudit(auth.user, {
      module: 'backup',
      action: 'backup_create',
      target: backup.code,
    });
    return HttpResponse.json(backup, { status: 201 });
  }),

  http.post('/api/system/backups/:id/restore', async ({ params, request }) => {
    const auth = authorize('backup.run', true);
    if (auth.error) return auth.error;

    const backup = backupStore.find((item) => item.id === params.id);
    if (!backup) return fail(404, 'not_found');

    const body = await readBody(
      request,
      z.object({ confirm_code: z.string() })
    );
    if (body.error) return body.error;
    // Second step of the two-step confirmation: retype the backup code.
    if (body.data.confirm_code !== backup.code) {
      return fail(422, 'confirm_mismatch');
    }

    recordAudit(auth.user, {
      module: 'backup',
      action: 'backup_restore',
      target: backup.code,
    });
    return HttpResponse.json({});
  }),
];
