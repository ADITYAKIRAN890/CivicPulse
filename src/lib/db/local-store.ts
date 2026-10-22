import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  UserRole,
  Doctor,
  Appointment,
  AppointmentStatus,
  Complaint,
  ComplaintStatus,
  ComplaintAuditLog,
  Grievance,
  GrievanceStatus,
  RewardLedgerEntry,
  UserWallet,
  CanteenCatalogItem,
  CanteenCoupon,
  InAppNotification,
  ComplaintEmailNotification,
} from '@/types';
import {
  SEED_USERS,
  SEED_DOCTORS,
  SEED_APPOINTMENTS,
  SEED_COMPLAINTS,
  SEED_AUDIT_LOGS,
  SEED_GRIEVANCES,
  SEED_CANTEEN_CATALOG,
  SEED_WALLETS,
  SEED_REWARD_LEDGER,
  SEED_COUPONS,
  SEED_NOTIFICATIONS,
} from './seed-data';

interface DatabaseSchema {
  users: UserProfile[];
  doctors: Doctor[];
  appointments: Appointment[];
  complaints: Complaint[];
  auditLogs: ComplaintAuditLog[];
  grievances: Grievance[];
  canteenCatalog: CanteenCatalogItem[];
  wallets: UserWallet[];
  rewardLedger: RewardLedgerEntry[];
  coupons: CanteenCoupon[];
  notifications: InAppNotification[];
  emailNotifications: ComplaintEmailNotification[];
}

// In-Memory Async Mutex for Atomic Race-Condition Protection
class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked: boolean = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const run = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        });
      };

      if (!this.locked) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

class LocalDatabase {
  private dbPath: string;
  private data: DatabaseSchema;
  private mutex = new AsyncMutex();

  constructor() {
    this.dbPath = path.join(process.cwd(), '.civicspulse-data.json');
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        if (fileContent && fileContent.trim().length > 2) {
          const parsed = JSON.parse(fileContent) as DatabaseSchema;
          parsed.emailNotifications = parsed.emailNotifications || [];
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse existing .civicspulse-data.json, re-initializing from seeds:', err);
    }

    const initialData: DatabaseSchema = {
      users: [...SEED_USERS],
      doctors: [...SEED_DOCTORS],
      appointments: [...SEED_APPOINTMENTS],
      complaints: [...SEED_COMPLAINTS],
      auditLogs: [...SEED_AUDIT_LOGS],
      grievances: [...SEED_GRIEVANCES],
      canteenCatalog: [...SEED_CANTEEN_CATALOG],
      wallets: [...SEED_WALLETS],
      rewardLedger: [...SEED_REWARD_LEDGER],
      coupons: [...SEED_COUPONS],
      notifications: [...SEED_NOTIFICATIONS],
      emailNotifications: [],
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local database to disk:', err);
    }
  }

  public resetToSeed(): void {
    this.data = {
      users: JSON.parse(JSON.stringify(SEED_USERS)),
      doctors: JSON.parse(JSON.stringify(SEED_DOCTORS)),
      appointments: JSON.parse(JSON.stringify(SEED_APPOINTMENTS)),
      complaints: JSON.parse(JSON.stringify(SEED_COMPLAINTS)),
      auditLogs: JSON.parse(JSON.stringify(SEED_AUDIT_LOGS)),
      grievances: JSON.parse(JSON.stringify(SEED_GRIEVANCES)),
      canteenCatalog: JSON.parse(JSON.stringify(SEED_CANTEEN_CATALOG)),
      wallets: JSON.parse(JSON.stringify(SEED_WALLETS)),
      rewardLedger: JSON.parse(JSON.stringify(SEED_REWARD_LEDGER)),
      coupons: JSON.parse(JSON.stringify(SEED_COUPONS)),
      notifications: JSON.parse(JSON.stringify(SEED_NOTIFICATIONS)),
      emailNotifications: [],
    };
    this.saveData(this.data);
  }

  // ================= USERS & AUTH =================
  async getUsers(): Promise<UserProfile[]> {
    return [...this.data.users];
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.data.users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createUser(user: Omit<UserProfile, 'id' | 'createdAt'>): Promise<UserProfile> {
    const release = await this.mutex.acquire();
    try {
      const existing = this.data.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (existing) {
        throw new Error('User with this email already exists.');
      }

      const newUser: UserProfile = {
        ...user,
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      };

      this.data.users.push(newUser);

      // Initialize wallet for students
      if (newUser.role === 'student') {
        this.data.wallets.push({
          userId: newUser.id,
          balance: 25, // 25 welcome points on approved registration
          lifetimeEarned: 25,
          lifetimeSpent: 0,
          updatedAt: new Date().toISOString(),
        });

        this.data.rewardLedger.push({
          id: `ledg-${Date.now()}`,
          idempotencyKey: `welcome_bonus_${newUser.id}`,
          userId: newUser.id,
          amount: 25,
          balanceAfter: 25,
          transactionType: 'admin_adjustment',
          referenceId: 'sys-onboard',
          description: 'Welcome to Civic Pulse! Verified Campus Member Bonus.',
          createdAt: new Date().toISOString(),
        });
      }

      this.saveData(this.data);
      return newUser;
    } finally {
      release();
    }
  }

  async addPerson(params: {
    fullName: string;
    email: string;
    role: UserRole;
    rollNumber?: string;
    department?: string;
    clinicCabin?: string;
    avatarUrl?: string;
    specialization?: string;
    qualification?: string;
    bio?: string;
    consultationHours?: string;
  }): Promise<{ user: UserProfile; doctor?: Doctor }> {
    const release = await this.mutex.acquire();
    try {
      const emailLower = params.email.trim().toLowerCase();
      const existing = this.data.users.find((u) => u.email.toLowerCase() === emailLower);
      if (existing) {
        throw new Error(`Person with email "${params.email}" already exists in the campus database.`);
      }

      const userId = `user-${params.role}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const avatarUrl =
        params.avatarUrl ||
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

      const newUser: UserProfile = {
        id: userId,
        email: emailLower,
        fullName: params.fullName.trim(),
        role: params.role,
        rollNumber: params.rollNumber?.trim().toUpperCase(),
        department: params.department?.trim(),
        clinicCabin: params.clinicCabin?.trim(),
        avatarUrl,
        isApproved: true,
        createdAt: new Date().toISOString(),
      };

      this.data.users.push(newUser);

      let createdDoctor: Doctor | undefined;

      // If doctor, also insert into doctor directory so appointments can immediately be booked
      if (params.role === 'doctor') {
        createdDoctor = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: newUser.id,
          fullName: newUser.fullName,
          specialization: params.specialization || 'General Physician & Campus Care',
          qualification: params.qualification || 'MBBS',
          clinicCabin: params.clinicCabin || newUser.clinicCabin || 'Cabin 108, Campus Health Center',
          consultationHours: params.consultationHours || '09:00 AM - 01:00 PM',
          bio: params.bio || 'Campus medical consultant and student care physician.',
          activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          blockedDates: [],
          avatarUrl,
        };
        this.data.doctors.push(createdDoctor);
      }

      // If student, initialize wallet and welcome points
      if (params.role === 'student') {
        this.data.wallets.push({
          userId: newUser.id,
          balance: 25,
          lifetimeEarned: 25,
          lifetimeSpent: 0,
          updatedAt: new Date().toISOString(),
        });

        this.data.rewardLedger.push({
          id: `ledg-${Date.now()}`,
          idempotencyKey: `welcome_bonus_${newUser.id}`,
          userId: newUser.id,
          amount: 25,
          balanceAfter: 25,
          transactionType: 'admin_adjustment',
          referenceId: 'sys-onboard',
          description: 'Welcome to Civic Pulse! Verified Campus Member Bonus.',
          createdAt: new Date().toISOString(),
        });
      }

      this.saveData(this.data);
      return { user: newUser, doctor: createdDoctor };
    } finally {
      release();
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      const userIndex = this.data.users.findIndex((u) => u.id === userId);
      if (userIndex === -1) {
        throw new Error('User not found in database.');
      }
      const user = this.data.users[userIndex];
      this.data.users.splice(userIndex, 1);

      // If doctor, also remove from doctors list
      if (user.role === 'doctor') {
        this.data.doctors = this.data.doctors.filter((d) => d.userId !== userId && d.id !== userId);
      }

      // Clean up notifications/wallet
      this.data.wallets = this.data.wallets.filter((w) => w.userId !== userId);
      this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);

      this.saveData(this.data);
      return true;
    } finally {
      release();
    }
  }

  async approveUser(userId: string): Promise<UserProfile> {
    const release = await this.mutex.acquire();
    try {
      const user = this.data.users.find((u) => u.id === userId);
      if (!user) throw new Error('User not found');
      user.isApproved = true;
      this.saveData(this.data);
      return user;
    } finally {
      release();
    }
  }

  // ================= DOCTORS & APPOINTMENTS =================
  async getDoctors(): Promise<Doctor[]> {
    return [...this.data.doctors];
  }

  async getDoctorById(id: string): Promise<Doctor | null> {
    return this.data.doctors.find((d) => d.id === id) || null;
  }

  async blockDoctorDate(doctorId: string, date: string): Promise<Doctor> {
    const release = await this.mutex.acquire();
    try {
      const doc = this.data.doctors.find((d) => d.id === doctorId);
      if (!doc) throw new Error('Doctor not found');
      if (!doc.blockedDates.includes(date)) {
        doc.blockedDates.push(date);
        this.saveData(this.data);
      }
      return doc;
    } finally {
      release();
    }
  }

  async unblockDoctorDate(doctorId: string, date: string): Promise<Doctor> {
    const release = await this.mutex.acquire();
    try {
      const doc = this.data.doctors.find((d) => d.id === doctorId);
      if (!doc) throw new Error('Doctor not found');
      doc.blockedDates = doc.blockedDates.filter((d) => d !== date);
      this.saveData(this.data);
      return doc;
    } finally {
      release();
    }
  }

  async updateDoctorSchedule(
    doctorId: string,
    updates: {
      consultationHours?: string;
      activeDays?: string[];
      blockedDates?: string[];
      breakTimes?: string[];
      customSlots?: string[];
      bio?: string;
      clinicCabin?: string;
    }
  ): Promise<Doctor> {
    const release = await this.mutex.acquire();
    try {
      const doc = this.data.doctors.find((d) => d.id === doctorId);
      if (!doc) throw new Error('Doctor not found');
      if (updates.consultationHours !== undefined) doc.consultationHours = updates.consultationHours;
      if (updates.activeDays !== undefined) doc.activeDays = updates.activeDays;
      if (updates.blockedDates !== undefined) doc.blockedDates = updates.blockedDates;
      if (updates.breakTimes !== undefined) doc.breakTimes = updates.breakTimes;
      if (updates.customSlots !== undefined) doc.customSlots = updates.customSlots;
      if (updates.bio !== undefined) doc.bio = updates.bio;
      if (updates.clinicCabin !== undefined) doc.clinicCabin = updates.clinicCabin;
      this.saveData(this.data);
      return doc;
    } finally {
      release();
    }
  }

  async getAppointments(filters?: {
    doctorId?: string;
    studentId?: string;
    date?: string;
    status?: AppointmentStatus;
    search?: string;
  }): Promise<Appointment[]> {
    let result = [...this.data.appointments];
    if (filters?.doctorId) {
      result = result.filter((a) => a.doctorId === filters.doctorId);
    }
    if (filters?.studentId) {
      result = result.filter((a) => a.studentId === filters.studentId);
    }
    if (filters?.date) {
      result = result.filter((a) => a.date === filters.date);
    }
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.referenceCode.toLowerCase().includes(q) ||
          a.studentName.toLowerCase().includes(q) ||
          (a.studentRollNumber && a.studentRollNumber.toLowerCase().includes(q)) ||
          a.reasonCategory.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q))
      );
    }
    // Return sorted newest first
    return result.sort((a, b) => {
      const dateA = a.date + ' ' + (a.timeSlot || '');
      const dateB = b.date + ' ' + (b.timeSlot || '');
      return dateB.localeCompare(dateA);
    });
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    return this.data.appointments.find((a) => a.id === id) || null;
  }

  // ATOMIC CONCURRENT-SAFE BOOKING
  async bookDoctorAppointment(params: {
    studentId: string;
    doctorId: string;
    date: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "10:00 AM"
    reasonCategory: string;
    notes?: string;
  }): Promise<Appointment> {
    const release = await this.mutex.acquire();
    try {
      const doc = this.data.doctors.find((d) => d.id === params.doctorId);
      if (!doc) {
        throw new Error('Doctor not found in clinic registry.');
      }

      const student = this.data.users.find((u) => u.id === params.studentId);
      if (!student) {
        throw new Error('Student account not found.');
      }

      // Check doctor blocked date
      if (doc.blockedDates.includes(params.date)) {
        throw new Error(`Doctor ${doc.fullName} is unavailable or on leave on ${params.date}.`);
      }

      // Check break times
      if (doc.breakTimes && doc.breakTimes.includes(params.timeSlot)) {
        throw new Error(`Time slot ${params.timeSlot} is reserved for doctor break/recess.`);
      }

      // Check double-booking race condition:
      // Does an active appointment already exist for this doctor on this date and timeSlot?
      const existingConflict = this.data.appointments.find(
        (a) =>
          a.doctorId === params.doctorId &&
          a.date === params.date &&
          a.timeSlot === params.timeSlot &&
          !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
      );

      if (existingConflict) {
        throw new Error(
          `Conflict: Time slot ${params.timeSlot} on ${params.date} with ${doc.fullName} has already been reserved. Please choose an alternate slot.`
        );
      }

      // Check if student already has a booking at that exact same time
      const studentConflict = this.data.appointments.find(
        (a) =>
          a.studentId === params.studentId &&
          a.date === params.date &&
          a.timeSlot === params.timeSlot &&
          !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
      );

      if (studentConflict) {
        throw new Error(`You already have an appointment scheduled at ${params.timeSlot} on ${params.date}.`);
      }

      const refCode = `APT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const appointment: Appointment = {
        id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        referenceCode: refCode,
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        studentRollNumber: student.rollNumber,
        doctorId: doc.id,
        doctorName: doc.fullName,
        doctorSpecialization: doc.specialization,
        clinicCabin: doc.clinicCabin,
        date: params.date,
        timeSlot: params.timeSlot,
        reasonCategory: params.reasonCategory,
        notes: params.notes,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.data.appointments.push(appointment);

      // Create in-app notifications
      this.data.notifications.push({
        id: `notif-${Date.now()}-1`,
        userId: student.id,
        title: 'Doctor Appointment Confirmed',
        message: `Your appointment with ${doc.fullName} is scheduled for ${params.date} at ${params.timeSlot} (${doc.clinicCabin}). Reference: ${refCode}`,
        type: 'appointment',
        read: false,
        link: '/appointments',
        createdAt: new Date().toISOString(),
      });

      this.data.notifications.push({
        id: `notif-${Date.now()}-2`,
        userId: doc.userId,
        title: 'New Patient Booking',
        message: `New appointment: ${student.fullName} (${student.rollNumber || 'Student'}) booked ${params.timeSlot} on ${params.date}. Reason: ${params.reasonCategory}`,
        type: 'appointment',
        read: false,
        link: '/doctor-portal',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return appointment;
    } finally {
      release();
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    actorId: string,
    newStatus: AppointmentStatus,
    reason?: string
  ): Promise<Appointment> {
    const release = await this.mutex.acquire();
    try {
      const apt = this.data.appointments.find((a) => a.id === appointmentId);
      if (!apt) throw new Error('Appointment not found.');

      const actor = this.data.users.find((u) => u.id === actorId);
      if (!actor) throw new Error('Actor not found.');

      // Valid state transitions
      const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
        confirmed: ['in_consultation', 'completed', 'cancelled_by_student', 'cancelled_by_doctor', 'rescheduled'],
        in_consultation: ['completed', 'cancelled_by_doctor'],
        completed: [],
        cancelled_by_student: [],
        cancelled_by_doctor: [],
        rescheduled: ['confirmed', 'cancelled_by_student', 'cancelled_by_doctor'],
      };

      if (!validTransitions[apt.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${apt.status} to ${newStatus}.`);
      }

      // Check permission: student can only cancel their own
      if (newStatus === 'cancelled_by_student' && actor.id !== apt.studentId && actor.role !== 'administrator') {
        throw new Error('Only the booking student or an administrator can cancel this appointment as student.');
      }

      // Check permission: doctor actions can only be performed by assigned doctor or administrator
      if (['in_consultation', 'completed', 'cancelled_by_doctor'].includes(newStatus)) {
        const docRecord = this.data.doctors.find((d) => d.id === apt.doctorId);
        const isAssignedDoctor = (docRecord && docRecord.userId === actor.id) || actor.id === apt.doctorId;
        if (!isAssignedDoctor && actor.role !== 'administrator') {
          throw new Error('Only the assigned doctor or an administrator can update consultation status.');
        }
      }

      apt.status = newStatus;
      if (reason) apt.cancellationReason = reason;
      apt.updatedAt = new Date().toISOString();

      // Notification
      const targetUserId = actor.id === apt.studentId ? apt.doctorId : apt.studentId;
      const docUser = this.data.users.find((u) => u.id === apt.doctorId || u.fullName === apt.doctorName);
      const recipientId = actor.id === apt.studentId ? (docUser?.id || apt.doctorId) : apt.studentId;

      this.data.notifications.push({
        id: `notif-${Date.now()}`,
        userId: recipientId,
        title: `Appointment Status: ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
        message: `Appointment ${apt.referenceCode} on ${apt.date} at ${apt.timeSlot} was updated to ${newStatus.replace(/_/g, ' ')}. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'appointment',
        read: false,
        link: actor.role === 'doctor' ? '/doctor/dashboard' : '/appointments',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return apt;
    } finally {
      release();
    }
  }

  async rescheduleAppointment(
    appointmentId: string,
    actorId: string,
    newDate: string,
    newTimeSlot: string
  ): Promise<Appointment> {
    const release = await this.mutex.acquire();
    try {
      const apt = this.data.appointments.find((a) => a.id === appointmentId);
      if (!apt) throw new Error('Appointment not found.');

      const doc = this.data.doctors.find((d) => d.id === apt.doctorId);
      const actor = this.data.users.find((u) => u.id === actorId);
      const isStudent = actor?.id === apt.studentId;
      const isDoctor = (doc && doc.userId === actor?.id) || actor?.id === apt.doctorId;
      const isAdmin = actor?.role === 'administrator';

      if (!isStudent && !isDoctor && !isAdmin) {
        throw new Error('Unauthorized to reschedule this appointment.');
      }

      if (doc?.blockedDates.includes(newDate)) {
        throw new Error(`Doctor is unavailable on ${newDate}.`);
      }

      if (doc?.breakTimes && doc.breakTimes.includes(newTimeSlot)) {
        throw new Error(`Time slot ${newTimeSlot} is reserved for doctor break/recess.`);
      }

      // Check conflict on new slot
      const conflict = this.data.appointments.find(
        (a) =>
          a.id !== appointmentId &&
          a.doctorId === apt.doctorId &&
          a.date === newDate &&
          a.timeSlot === newTimeSlot &&
          !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
      );

      if (conflict) {
        throw new Error(`The requested time slot ${newTimeSlot} on ${newDate} is already booked.`);
      }

      apt.date = newDate;
      apt.timeSlot = newTimeSlot;
      apt.status = 'confirmed';
      apt.updatedAt = new Date().toISOString();

      const recipientId = isDoctor ? apt.studentId : (doc?.userId || apt.doctorId);
      const initiator = isDoctor ? `Dr. ${doc?.fullName || apt.doctorName}` : (actor?.fullName || 'Student');

      this.data.notifications.push({
        id: `notif-${Date.now()}-resched`,
        userId: recipientId,
        title: 'Appointment Rescheduled Successfully',
        message: `Your appointment with ${apt.doctorName} was rescheduled by ${initiator} to ${newDate} at ${newTimeSlot}.`,
        type: 'appointment',
        read: false,
        link: isDoctor ? '/appointments' : '/doctor/dashboard',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return apt;
    } finally {
      release();
    }
  }

  // ================= COMPLAINTS =================
  async getComplaints(filters?: {
    category?: string;
    status?: ComplaintStatus;
    studentId?: string;
    assignedStaffId?: string;
    priority?: string;
  }): Promise<Complaint[]> {
    let result = [...this.data.complaints];
    if (filters?.category) {
      result = result.filter((c) => c.category === filters.category);
    }
    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters?.studentId) {
      result = result.filter((c) => c.studentId === filters.studentId);
    }
    if (filters?.assignedStaffId) {
      result = result.filter((c) => c.assignedStaffId === filters.assignedStaffId);
    }
    if (filters?.priority) {
      result = result.filter((c) => c.priority === filters.priority);
    }
    // Sort newest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    return this.data.complaints.find((c) => c.id === id) || null;
  }

  async createComplaint(complaint: Omit<Complaint, 'id' | 'referenceCode' | 'createdAt' | 'updatedAt' | 'upvotes' | 'upvotedBy'>): Promise<Complaint> {
    const release = await this.mutex.acquire();
    try {
      const refCode = `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newComplaint: Complaint = {
        ...complaint,
        id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        referenceCode: refCode,
        upvotes: 1,
        upvotedBy: [complaint.studentId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.data.complaints.push(newComplaint);

      // Audit log entry
      this.data.auditLogs.push({
        id: `log-${Date.now()}`,
        complaintId: newComplaint.id,
        actorId: complaint.studentId,
        actorName: complaint.studentName,
        actorRole: 'student',
        action: 'complaint_submitted',
        details: `Submitted ticket in category "${complaint.category}" for zone "${complaint.campusZone}". Initial AI priority: ${complaint.priority.toUpperCase()} (${complaint.priorityScore}/100).`,
        timestamp: new Date().toISOString(),
      });

      this.saveData(this.data);
      return newComplaint;
    } finally {
      release();
    }
  }

  async updateComplaintStatus(params: {
    complaintId: string;
    actorId: string;
    newStatus: ComplaintStatus;
    notes?: string;
    resolutionImageUrl?: string;
    assignedStaffId?: string;
    assignedDepartment?: string;
  }): Promise<{ complaint: Complaint; pointsAwarded: number }> {
    const release = await this.mutex.acquire();
    try {
      const complaint = this.data.complaints.find((c) => c.id === params.complaintId);
      if (!complaint) throw new Error('Complaint not found.');

      const actor = this.data.users.find((u) => u.id === params.actorId);
      if (!actor) throw new Error('Actor not found.');

      // Check role permissions:
      // Students can only 'verify_by_student' or 'escalated'
      if (actor.role === 'student' && !['verified_by_student', 'escalated'].includes(params.newStatus)) {
        throw new Error('Students can only verify resolution or escalate a complaint.');
      }

      // Valid state transitions
      const validTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
        submitted: ['triaged', 'escalated'],
        triaged: ['in_progress', 'escalated'],
        in_progress: ['resolved', 'escalated'],
        resolved: ['verified_by_student', 'escalated', 'in_progress'],
        verified_by_student: [],
        escalated: ['in_progress', 'triaged', 'resolved'],
      };

      if (!validTransitions[complaint.status].includes(params.newStatus)) {
        throw new Error(`Invalid status transition from "${complaint.status}" to "${params.newStatus}".`);
      }

      complaint.status = params.newStatus;
      complaint.updatedAt = new Date().toISOString();

      if (params.assignedStaffId) {
        complaint.assignedStaffId = params.assignedStaffId;
        const staff = this.data.users.find((u) => u.id === params.assignedStaffId);
        if (staff) complaint.assignedStaffName = staff.fullName;
      }
      if (params.assignedDepartment) {
        complaint.assignedDepartment = params.assignedDepartment;
      }
      if (params.notes) {
        if (params.newStatus === 'resolved') {
          complaint.resolutionNotes = params.notes;
          complaint.resolvedAt = new Date().toISOString();
        }
        if (params.newStatus === 'escalated') {
          complaint.escalationReason = params.notes;
          complaint.escalatedAt = new Date().toISOString();
        }
      }
      if (params.resolutionImageUrl) {
        complaint.resolutionImageUrl = params.resolutionImageUrl;
      }

      // Audit Log
      this.data.auditLogs.push({
        id: `log-${Date.now()}`,
        complaintId: complaint.id,
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        action: `status_${params.newStatus}`,
        details: params.notes || `Complaint status updated to ${params.newStatus}.`,
        timestamp: new Date().toISOString(),
      });

      // Reward points handling:
      // ONLY award points for validated useful complaints and legitimate resolution milestones!
      // NOT for complaint submission quantity!
      let pointsAwarded = 0;

      // Milestone 1: Staff validation / triage (+25 pts)
      if (params.newStatus === 'triaged' && !complaint.pointsAwardedTriage) {
        complaint.pointsAwardedTriage = true;
        const rewardResult = this.internalAwardPoints({
          userId: complaint.studentId,
          amount: 25,
          idempotencyKey: `reward_${complaint.id}_triage_${complaint.studentId}`,
          transactionType: 'complaint_triage_reward',
          referenceId: complaint.id,
          description: `Civic Impact Reward: Complaint ${complaint.referenceCode} validated by campus facilities (+25 pts)`,
        });
        if (rewardResult) pointsAwarded += 25;
      }

      // Milestone 2: Legitimate resolution with evidence (+50 pts)
      if (params.newStatus === 'resolved' && !complaint.pointsAwardedResolution) {
        complaint.pointsAwardedResolution = true;
        const rewardResult = this.internalAwardPoints({
          userId: complaint.studentId,
          amount: 50,
          idempotencyKey: `reward_${complaint.id}_resolution_${complaint.studentId}`,
          transactionType: 'complaint_resolution_reward',
          referenceId: complaint.id,
          description: `Civic Impact Reward: Complaint ${complaint.referenceCode} resolved with verified resolution proof (+50 pts)`,
        });
        if (rewardResult) pointsAwarded += 50;
      }

      // In-app notification to student
      this.data.notifications.push({
        id: `notif-${Date.now()}`,
        userId: complaint.studentId,
        title: `Complaint Updated: ${complaint.referenceCode}`,
        message: `Your complaint "${complaint.title}" is now ${params.newStatus.replace(/_/g, ' ').toUpperCase()}. ${pointsAwarded > 0 ? `+${pointsAwarded} points credited to your wallet!` : ''}`,
        type: 'complaint',
        read: false,
        link: '/complaints',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return { complaint, pointsAwarded };
    } finally {
      release();
    }
  }

  async upvoteComplaint(complaintId: string, userId: string): Promise<Complaint> {
    const release = await this.mutex.acquire();
    try {
      const complaint = this.data.complaints.find((c) => c.id === complaintId);
      if (!complaint) throw new Error('Complaint not found.');

      if (complaint.upvotedBy.includes(userId)) {
        // Remove upvote
        complaint.upvotedBy = complaint.upvotedBy.filter((id) => id !== userId);
        complaint.upvotes = Math.max(0, complaint.upvotes - 1);
      } else {
        complaint.upvotedBy.push(userId);
        complaint.upvotes += 1;
      }

      complaint.updatedAt = new Date().toISOString();
      this.saveData(this.data);
      return complaint;
    } finally {
      release();
    }
  }

  async getComplaintAuditLogs(complaintId: string): Promise<ComplaintAuditLog[]> {
    return this.data.auditLogs
      .filter((log) => log.complaintId === complaintId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ================= GRIEVANCES (RESTRICTED WORKFLOW) =================
  // Staff-behaviour grievances in a separate, restricted workflow!
  async getGrievances(requestingUser: UserProfile): Promise<Grievance[]> {
    // Only Grievance Officer and Administrator can view all grievances!
    // Students can ONLY view grievances they personally submitted!
    // Doctors and Department Staff get empty list / forbidden.
    if (['grievance_officer', 'administrator'].includes(requestingUser.role)) {
      return [...this.data.grievances].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (requestingUser.role === 'student') {
      return this.data.grievances
        .filter((g) => g.studentId === requestingUser.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Other roles have zero access to grievances
    return [];
  }

  async createGrievance(grievance: Omit<Grievance, 'id' | 'referenceCode' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Grievance> {
    const release = await this.mutex.acquire();
    try {
      const refCode = `GRV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const newGrievance: Grievance = {
        ...grievance,
        id: `grv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        referenceCode: refCode,
        status: 'confidential_review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.data.grievances.push(newGrievance);

      // Notify Grievance Officers
      const officers = this.data.users.filter((u) => u.role === 'grievance_officer');
      for (const officer of officers) {
        this.data.notifications.push({
          id: `notif-${Date.now()}-${officer.id}`,
          userId: officer.id,
          title: 'New Confidential Grievance Lodged',
          message: `Confidential file ${refCode} submitted against ${newGrievance.targetDepartmentOrRole}. Immediate review required.`,
          type: 'grievance',
          read: false,
          link: '/grievance-portal',
          createdAt: new Date().toISOString(),
        });
      }

      this.saveData(this.data);
      return newGrievance;
    } finally {
      release();
    }
  }

  async updateGrievance(params: {
    grievanceId: string;
    officerId: string;
    status: GrievanceStatus;
    hearingScheduledDate?: string;
    hearingNotes?: string;
    confidentialResolutionSummary?: string;
  }): Promise<Grievance> {
    const release = await this.mutex.acquire();
    try {
      const officer = this.data.users.find((u) => u.id === params.officerId);
      if (!officer || !['grievance_officer', 'administrator'].includes(officer.role)) {
        throw new Error('Unauthorized: Only grievance committee officers can adjudicate grievances.');
      }

      const grievance = this.data.grievances.find((g) => g.id === params.grievanceId);
      if (!grievance) throw new Error('Grievance file not found.');

      grievance.status = params.status;
      grievance.assignedOfficerId = officer.id;
      if (params.hearingScheduledDate) grievance.hearingScheduledDate = params.hearingScheduledDate;
      if (params.hearingNotes) grievance.hearingNotes = params.hearingNotes;
      if (params.confidentialResolutionSummary) grievance.confidentialResolutionSummary = params.confidentialResolutionSummary;
      grievance.updatedAt = new Date().toISOString();

      // Notify student
      this.data.notifications.push({
        id: `notif-${Date.now()}`,
        userId: grievance.studentId,
        title: `Grievance Update: ${grievance.referenceCode}`,
        message: `Your grievance file status is now: ${params.status.replace(/_/g, ' ').toUpperCase()}. ${params.hearingScheduledDate ? `Hearing scheduled: ${params.hearingScheduledDate}` : ''}`,
        type: 'grievance',
        read: false,
        link: '/grievance-portal',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return grievance;
    } finally {
      release();
    }
  }

  // ================= REWARDS & CANTEEN COUPONS =================
  private internalAwardPoints(params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    transactionType: 'complaint_triage_reward' | 'complaint_resolution_reward' | 'admin_adjustment';
    referenceId: string;
    description: string;
  }): boolean {
    // Idempotency check: prevent duplicate reward
    const existing = this.data.rewardLedger.find((e) => e.idempotencyKey === params.idempotencyKey);
    if (existing) {
      console.warn(`Idempotency key ${params.idempotencyKey} already applied. Skipping duplicate credit.`);
      return false;
    }

    let wallet = this.data.wallets.find((w) => w.userId === params.userId);
    if (!wallet) {
      wallet = {
        userId: params.userId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        updatedAt: new Date().toISOString(),
      };
      this.data.wallets.push(wallet);
    }

    wallet.balance += params.amount;
    wallet.lifetimeEarned += params.amount;
    wallet.updatedAt = new Date().toISOString();

    const entry: RewardLedgerEntry = {
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      amount: params.amount,
      balanceAfter: wallet.balance,
      transactionType: params.transactionType,
      referenceId: params.referenceId,
      description: params.description,
      createdAt: new Date().toISOString(),
    };

    this.data.rewardLedger.push(entry);
    return true;
  }

  async getWallet(userId: string): Promise<UserWallet> {
    let wallet = this.data.wallets.find((w) => w.userId === userId);
    if (!wallet) {
      wallet = {
        userId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        updatedAt: new Date().toISOString(),
      };
      this.data.wallets.push(wallet);
      this.saveData(this.data);
    }
    return { ...wallet };
  }

  async getRewardLedger(userId: string): Promise<RewardLedgerEntry[]> {
    return this.data.rewardLedger
      .filter((e) => e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCanteenCatalog(): Promise<CanteenCatalogItem[]> {
    return [...this.data.canteenCatalog];
  }

  async getCoupons(studentId?: string): Promise<CanteenCoupon[]> {
    let result = [...this.data.coupons];
    if (studentId) {
      result = result.filter((c) => c.studentId === studentId);
    }
    return result.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  // ATOMIC COUPON ISSUANCE
  async issueCanteenCoupon(studentId: string, catalogItemId: string): Promise<CanteenCoupon> {
    const release = await this.mutex.acquire();
    try {
      const student = this.data.users.find((u) => u.id === studentId);
      if (!student) throw new Error('Student account not found.');

      const item = this.data.canteenCatalog.find((c) => c.id === catalogItemId && c.isAvailable);
      if (!item) throw new Error('Canteen voucher item not available.');

      let wallet = this.data.wallets.find((w) => w.userId === studentId);
      if (!wallet || wallet.balance < item.pointsCost) {
        throw new Error(
          `Insufficient Civic Pulse Points. Required: ${item.pointsCost} pts, Current Balance: ${wallet?.balance || 0} pts.`
        );
      }

      // Debit wallet atomically
      wallet.balance -= item.pointsCost;
      wallet.lifetimeSpent += item.pointsCost;
      wallet.updatedAt = new Date().toISOString();

      const couponId = `cpn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const couponCode = `CP-CPN-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

      // Ledger Debit Record
      this.data.rewardLedger.push({
        id: `ledg-${Date.now()}`,
        idempotencyKey: `coupon_issue_${couponId}_debit`,
        userId: studentId,
        amount: -item.pointsCost,
        balanceAfter: wallet.balance,
        transactionType: 'coupon_redemption',
        referenceId: couponId,
        description: `Purchased voucher: ${item.title} (-${item.pointsCost} pts)`,
        createdAt: new Date().toISOString(),
      });

      // 30 days validity
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const coupon: CanteenCoupon = {
        id: couponId,
        couponCode,
        catalogItemId: item.id,
        title: item.title,
        pointsSpent: item.pointsCost,
        monetaryValueRupees: item.monetaryValueRupees,
        studentId: student.id,
        studentName: student.fullName,
        status: 'active',
        issuedAt: new Date().toISOString(),
        expiresAt,
      };

      this.data.coupons.push(coupon);

      this.data.notifications.push({
        id: `notif-${Date.now()}`,
        userId: student.id,
        title: 'Canteen Coupon Generated!',
        message: `Your voucher for ${item.title} (Code: ${couponCode}) is ready. Present at canteen POS to redeem.`,
        type: 'reward',
        read: false,
        link: '/rewards',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return coupon;
    } finally {
      release();
    }
  }

  // ATOMIC SINGLE-USE COUPON REDEMPTION (Canteen Operator POS)
  async redeemCanteenCoupon(couponCode: string, operatorId: string): Promise<CanteenCoupon> {
    const release = await this.mutex.acquire();
    try {
      const operator = this.data.users.find((u) => u.id === operatorId);
      if (!operator || !['canteen_operator', 'administrator'].includes(operator.role)) {
        throw new Error('Unauthorized: Only an approved Canteen Operator or Admin can redeem coupons.');
      }

      const normalizedCode = couponCode.trim().toUpperCase();
      const coupon = this.data.coupons.find((c) => c.couponCode.toUpperCase() === normalizedCode);

      if (!coupon) {
        throw new Error(`Invalid Coupon: Code "${couponCode}" was not found in the campus registry.`);
      }

      // Check if already redeemed - STRICT SINGLE USE
      if (coupon.status === 'redeemed') {
        throw new Error(
          `Security Alert: Coupon "${coupon.couponCode}" has ALREADY been redeemed on ${coupon.redeemedAt} by ${coupon.redeemedByOperatorName || 'Canteen Counter'}. Duplicate redemption strictly prohibited.`
        );
      }

      // Check expiry
      if (coupon.status === 'expired' || new Date(coupon.expiresAt).getTime() < Date.now()) {
        coupon.status = 'expired';
        this.saveData(this.data);
        throw new Error(`Expired Coupon: Voucher expired on ${new Date(coupon.expiresAt).toLocaleDateString()}.`);
      }

      // Mark redeemed atomically
      const receiptCode = `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      coupon.status = 'redeemed';
      coupon.redeemedAt = new Date().toISOString();
      coupon.redeemedByOperatorId = operator.id;
      coupon.redeemedByOperatorName = `${operator.fullName} (${operator.department || 'Canteen POS'})`;
      coupon.redemptionReceiptCode = receiptCode;

      // Notify student of successful POS settlement
      this.data.notifications.push({
        id: `notif-${Date.now()}`,
        userId: coupon.studentId,
        title: 'Coupon Redeemed at Canteen',
        message: `Your coupon for "${coupon.title}" was redeemed at ${operator.department || 'Canteen'}. Receipt: ${receiptCode}`,
        type: 'reward',
        read: false,
        link: '/rewards',
        createdAt: new Date().toISOString(),
      });

      this.saveData(this.data);
      return coupon;
    } finally {
      release();
    }
  }

  // ================= NOTIFICATIONS =================
  async getNotifications(userId: string): Promise<InAppNotification[]> {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(notificationId: string, userId?: string): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const n = this.data.notifications.find((item) => item.id === notificationId);
      if (n && (!userId || n.userId === userId)) {
        n.read = true;
        this.saveData(this.data);
      }
    } finally {
      release();
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.data.notifications.forEach((n) => {
        if (n.userId === userId) n.read = true;
      });
      this.saveData(this.data);
    } finally {
      release();
    }
  }

  // ================= COMPLAINT EMAIL NOTIFICATIONS =================
  async getEmailNotifications(complaintId?: string): Promise<ComplaintEmailNotification[]> {
    const list = this.data.emailNotifications || [];
    if (complaintId) {
      return list.filter((n) => n.complaintId === complaintId);
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getEmailNotificationByIdempotencyKey(key: string): Promise<ComplaintEmailNotification | null> {
    const list = this.data.emailNotifications || [];
    return list.find((n) => n.idempotencyKey === key) || null;
  }

  async saveEmailNotification(notif: ComplaintEmailNotification): Promise<ComplaintEmailNotification> {
    const release = await this.mutex.acquire();
    try {
      this.data.emailNotifications = this.data.emailNotifications || [];
      const existingIndex = this.data.emailNotifications.findIndex((n) => n.idempotencyKey === notif.idempotencyKey);
      if (existingIndex >= 0) {
        this.data.emailNotifications[existingIndex] = { ...notif, updatedAt: new Date().toISOString() };
      } else {
        this.data.emailNotifications.push(notif);
      }
      this.saveData(this.data);
      return notif;
    } finally {
      release();
    }
  }

  async updateEmailNotification(id: string, updates: Partial<ComplaintEmailNotification>): Promise<ComplaintEmailNotification | null> {
    const release = await this.mutex.acquire();
    try {
      this.data.emailNotifications = this.data.emailNotifications || [];
      const notif = this.data.emailNotifications.find((n) => n.id === id);
      if (!notif) return null;
      Object.assign(notif, updates, { updatedAt: new Date().toISOString() });
      this.saveData(this.data);
      return notif;
    } finally {
      release();
    }
  }
}

// Global Singleton Instance
declare global {
  var __civicsPulseDb: LocalDatabase | undefined;
}

export const localDb =
  globalThis.__civicsPulseDb && typeof (globalThis.__civicsPulseDb as any).getEmailNotifications === 'function'
    ? globalThis.__civicsPulseDb
    : (globalThis.__civicsPulseDb = new LocalDatabase());
