// src/utils/permissions.ts
import type { Event, PermissionLevel } from '@/types';

/**
 * ✅ Níveis administrativos (salvos no evento)
 */
export type AdminPermissionLevel = Extract<
  PermissionLevel,
  'Super Admin' | 'Admin parcial'
>;

/**
 * ✅ Roles de UI (não necessariamente salvos)
 */
export type UiRole = AdminPermissionLevel | 'Convidado';

const LEVEL = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_PARCIAL: 'Admin parcial',
  CONVIDADO: 'Convidado',
} as const;

function isAdminLevel(value: unknown): value is AdminPermissionLevel {
  return value === LEVEL.SUPER_ADMIN || value === LEVEL.ADMIN_PARCIAL;
}

function isCreator(event: Event, uid: string) {
  return event.userId === uid;
}

/**
 * ✅ Retorna o nível administrativo do usuário
 * - Criador SEMPRE é Super Admin
 * - Subadmins: valor do map
 * - Outros: null
 */
export function getMyAdminLevel(
  event: Event | null | undefined,
  userUid: string | null
): AdminPermissionLevel | null {
  if (!event || !userUid) return null;

  // ✅ regra fundamental
  if (isCreator(event, userUid)) return LEVEL.SUPER_ADMIN;

  const raw = event.subAdminsByUid?.[userUid];
  return isAdminLevel(raw) ? raw : null;
}

/**
 * ✅ Retorna a role para UI
 * - Criador: Super Admin
 * - Subadmin: Super Admin | Admin parcial
 * - Caso contrário: Convidado
 */
export function getMyRole(
  event: Event | null | undefined,
  userUid: string | null
): UiRole | null {
  if (!event || !userUid) return null;

  return getMyAdminLevel(event, userUid) ?? LEVEL.CONVIDADO;
}

/**
 * ✅ Pode editar o evento:
 * - Criador
 * - Super Admin
 * - Admin parcial
 */
export function canEditEvent(
  event: Event | null | undefined,
  userUid: string | null
): boolean {
  if (!event || !userUid) return false;

  const myLevel = getMyAdminLevel(event, userUid);
  return myLevel === LEVEL.SUPER_ADMIN || myLevel === LEVEL.ADMIN_PARCIAL;
}

/**
 * ✅ Pode deletar:
 * - apenas criador
 */
export function canDeleteEvent(
  event: Event | null | undefined,
  userUid: string | null
): boolean {
  if (!event || !userUid) return false;
  return isCreator(event, userUid);
}

/**
 * ✅ Pode gerenciar permissões:
 * - Criador (Super Admin implícito)
 * - Super Admin
 */
export function canManagePermissions(
  event: Event | null | undefined,
  userUid: string | null
): boolean {
  if (!event || !userUid) return false;
  return getMyAdminLevel(event, userUid) === LEVEL.SUPER_ADMIN;
}

/**
 * ✅ Normaliza o map de permissões
 */
export function normalizeSubAdminsByUid(event: Pick<Event, 'subAdminsByUid'>): {
  subAdminsByUid: Record<string, AdminPermissionLevel>;
  subAdminUids: string[];
} {
  const raw = event.subAdminsByUid ?? {};
  const subAdminsByUid: Record<string, AdminPermissionLevel> = {};

  for (const [uid, level] of Object.entries(raw)) {
    if (isAdminLevel(level)) subAdminsByUid[uid] = level;
  }

  return { subAdminsByUid, subAdminUids: Object.keys(subAdminsByUid) };
}

/**
 * ✅ Regra: Admin parcial NÃO pode atribuir Super Admin
 * ✅ Super Admin pode atribuir qualquer nível
 */
export function canAssignLevel(
  myLevel: AdminPermissionLevel | null,
  levelToAssign: AdminPermissionLevel
): boolean {
  if (!myLevel) return false;

  if (myLevel === LEVEL.ADMIN_PARCIAL && levelToAssign === LEVEL.SUPER_ADMIN) {
    return false;
  }
  return true;
}

/**
 * ✅ Regra avançada (profissional):
 * Posso editar/remover a permissão desse alvo?
 *
 * - Ninguém edita o CRIADOR
 * - Admin parcial não edita ninguém (se você quiser)
 * - Super Admin pode editar subadmins (exceto criador)
 * - Opcional: bloquear auto-edição (você pediu isso)
 */
export function canEditTargetPermission(
  event: Event | null | undefined,
  myUid: string | null,
  targetUid: string
): boolean {
  if (!event || !myUid) return false;

  // ❌ não mexe no criador
  if (isCreator(event, targetUid)) return false;

  const myLevel = getMyAdminLevel(event, myUid);

  // ❌ se não é Super Admin, não gerencia permissões
  if (myLevel !== LEVEL.SUPER_ADMIN) return false;

  // ✅ regra que você pediu: se for o próprio usuário, só visualizar (sem editar)
  if (targetUid === myUid) return false;

  return true;
}

/**
 * ✅ Helper para UI: minha permissão exibível
 */
export function getDisplayRoleLabel(
  event: Event | null | undefined,
  uid: string
): UiRole {
  if (!event) return LEVEL.CONVIDADO;

  if (isCreator(event, uid)) return LEVEL.SUPER_ADMIN;

  const raw = event.subAdminsByUid?.[uid];
  return isAdminLevel(raw) ? raw : LEVEL.CONVIDADO;
}
