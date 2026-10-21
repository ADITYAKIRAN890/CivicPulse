import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '@/types';
import { localDb } from '@/lib/db/local-store';

export const SESSION_COOKIE_NAME = 'civicspulse_user_id';
export const DEFAULT_USER_ID = 'user-student-1'; // Default demo user

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
