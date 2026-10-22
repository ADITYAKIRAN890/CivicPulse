export type UserRole =
  | 'student'
  | 'doctor'
  | 'department_staff'
  | 'grievance_officer'
  | 'administrator'
  | 'canteen_operator';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  rollNumber?: string;
  department?: string;
  clinicCabin?: string;
  avatarUrl?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  specialization: string;
  qualification: string;
  clinicCabin: string;
  consultationHours: string;
  bio: string;
  activeDays: string[]; // e.g., ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  blockedDates: string[]; // ISO Date strings 'YYYY-MM-DD'
  breakTimes?: string[]; // e.g., ['01:00 PM', '01:30 PM']
  customSlots?: string[]; // Optional custom active slots
  avatarUrl?: string;
}

export type AppointmentStatus =
  | 'confirmed'
  | 'in_consultation'
  | 'completed'
  | 'cancelled_by_student'
  | 'cancelled_by_doctor'
  | 'rescheduled';

export interface Appointment {
  id: string;
  referenceCode: string; // e.g. APT-2026-X89K2
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNumber?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  clinicCabin: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. '10:00 AM'
  reasonCategory: string; // e.g. 'Fever/Cold', 'Sports Injury', 'Mental Wellness'
  notes?: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintCategory =
  | 'hostel'
  | 'electricity'
  | 'wifi'
  | 'hygiene'
  | 'water'
  | 'infrastructure'
  | 'lab_equipment'
  | 'cafeteria'
  | 'classroom_av'
  | 'security';

export type ComplaintStatus =
  | 'submitted'
  | 'triaged'
  | 'in_progress'
  | 'resolved'
  | 'verified_by_student'
  | 'escalated';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Complaint {
  id: string;
  referenceCode: string; // e.g. CMP-2026-4821
  title: string;
  description: string;
  category: ComplaintCategory;
  campusZone: string; // e.g. 'Hostel Block B', 'Library Wing', 'Main Cafeteria'
  locationDetails: string; // e.g. 'Room 304, 3rd Floor'
  imageUrl?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  priorityScore: number; // 0-100
  priorityReasons: string[];
  assignedDepartment: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  studentId: string;
  studentName: string;
  isAnonymous: boolean;
  upvotes: number;
  upvotedBy: string[];
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  escalationReason?: string;
  isDuplicateOf?: string;
  humanReviewRequired: boolean;
  pointsAwardedTriage?: boolean;
  pointsAwardedResolution?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintAuditLog {
  id: string;
  complaintId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export type GrievanceStatus =
  | 'confidential_review'
  | 'hearing_scheduled'
  | 'investigation_active'
  | 'resolved'
  | 'dismissed';

export interface Grievance {
  id: string;
  referenceCode: string; // e.g. GRV-2026-928
  studentId: string;
  studentName: string;
  isAnonymous: boolean;
  targetDepartmentOrRole: string;
  subject: string;
  incidentDescription: string;
  incidentDate: string;
  status: GrievanceStatus;
  hearingScheduledDate?: string;
  hearingNotes?: string;
  assignedOfficerId?: string;
  confidentialResolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export type LedgerTransactionType =
  | 'complaint_triage_reward'
  | 'complaint_resolution_reward'
  | 'coupon_redemption'
  | 'admin_adjustment'
  | 'ledger_reversal';

export interface RewardLedgerEntry {
  id: string;
  idempotencyKey: string; // strict unique constraint
  userId: string;
  amount: number; // +ve credit, -ve debit
  balanceAfter: number;
  transactionType: LedgerTransactionType;
  referenceId: string; // e.g. complaint reference or coupon id
  description: string;
  createdAt: string;
}

export interface UserWallet {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: string;
}

export interface CanteenCatalogItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  monetaryValueRupees: number;
  category: 'meal' | 'beverage' | 'snack' | 'stationery';
  icon: string;
  isAvailable: boolean;
}

export type CouponStatus = 'active' | 'redeemed' | 'expired';

export interface CanteenCoupon {
  id: string;
  couponCode: string; // e.g. CP-CPN-8492-X9
  catalogItemId: string;
  title: string;
  pointsSpent: number;
  monetaryValueRupees: number;
  studentId: string;
  studentName: string;
  status: CouponStatus;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedByOperatorId?: string;
  redeemedByOperatorName?: string;
  redemptionReceiptCode?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'complaint' | 'reward' | 'system' | 'grievance';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface DuplicateSuggestion {
  complaint: Complaint;
  similarityScore: number; // 0.0 to 1.0
  matchedTokens: string[];
}

export interface AIPriorityAnalysis {
  score: number; // 0-100
  priority: ComplaintPriority;
  reasons: string[];
  suggestedDepartment: string;
  suggestedCategory: ComplaintCategory;
  humanReviewRequired: boolean;
}

export type EmailNotificationStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed';

export interface ComplaintEmailNotification {
  id: string;
  complaintId: string;
  complaintReference: string;
  idempotencyKey: string;
  recipientEmail: string;
  senderEmail: string;
  intendedDepartment: string;
  status: EmailNotificationStatus;
  resendId?: string;
  attemptCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

