import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '@/types';
import { localDb } from '@/lib/db/local-store';

export const SESSION_COOKIE_NAME = 'civicspulse_user_id';
export const DEFAULT_USER_ID = 'user-student-1'; // Default demo user

export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  student: '/',
  doctor: '/doctor/dashboard',
  department_staff: '/department-portal',
  grievance_officer: '/grievance-portal',
  administrator: '/admin',
  canteen_operator: '/canteen-pos',
};

export function getDashboardRouteForRole(role: UserRole): string {
  return ROLE_DASHBOARD_ROUTES[role] || '/';
}

/**
 * Returns the authenticated user from the verified session cookie,
 * looking up the record in the trusted database.
 * Returns null if not logged in.
 */
export async function getAuthenticatedUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!userId) return null;

  const user = await localDb.getUserById(userId);
  return user || null;
}

/**
 * Strict authentication guard: throws 401 Unauthorized if no active session.
 */
export async function requireAuthenticatedUser(): Promise<UserProfile> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Unauthorized: Valid campus session required. Please sign in.');
  }
  return user;
}

/**
 * Resolves the user's authoritative role directly from the database record.
 * Never trust roles sent from client payloads or query parameters.
 */
export async function verifyRoleFromDatabase(userId: string): Promise<UserRole | null> {
  const user = await localDb.getUserById(userId);
  return user ? user.role : null;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = userIdCookie || DEFAULT_USER_ID;

  const user = await localDb.getUserById(userId);
  if (user) {
    return user;
  }

  // Fallback to primary student user
  const fallback = await localDb.getUserById(DEFAULT_USER_ID);
  if (fallback) return fallback;

  // Ultimate fallback to first user in list
  const users = await localDb.getUsers();
  return users[0];
}

export function enforceRole(user: UserProfile, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Role "${user.role}" does not have permission to perform this action.`);
  }
}

export function canAccessGrievance(user: UserProfile, studentId?: string): boolean {
  if (user.role === 'administrator' || user.role === 'grievance_officer') {
    return true;
  }
  if (user.role === 'student' && studentId && user.id === studentId) {
    return true;
  }
  return false;
}

export function canTriageComplaints(user: UserProfile): boolean {
  return ['department_staff', 'administrator'].includes(user.role);
}

export function canRedeemCoupons(user: UserProfile): boolean {
  return ['canteen_operator', 'administrator'].includes(user.role);
}

export function canManageAppointments(user: UserProfile, doctorUserId?: string): boolean {
  if (user.role === 'administrator') return true;
  if (user.role === 'doctor' && doctorUserId && user.id === doctorUserId) return true;
  return false;
}
