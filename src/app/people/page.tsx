'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Stethoscope,
  Building2,
  Shield,
  Coffee,
  UserCheck,
  GraduationCap,
  Mail,
  MapPin,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, UserRole, Doctor } from '@/types';

const ROLES: { id: UserRole; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'doctor', label: 'Doctor / Clinic Staff', icon: Stethoscope, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'department_staff', label: 'Facilities Staff', icon: Building2, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'grievance_officer', label: 'Grievance Officer', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'administrator', label: 'Campus Dean / Admin', icon: UserCheck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'canteen_operator', label: 'Canteen POS Operator', icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
];

export default function PeopleDirectoryPage() {
  const router = useRouter();
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Add Person Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [clinicCabin, setClinicCabin] = useState('Cabin 108, Campus Health Center');
  const [specialization, setSpecialization] = useState('General Physician & Health Services');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [consultationHours, setConsultationHours] = useState('10:00 AM - 02:00 PM');
  const [bio, setBio] = useState('Campus healthcare consultant.');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadPeople = async () => {
    try {
      const res = await fetch('/api/people');
      const data = await res.json();
      if (data.success) {
        setPeople(data.people || []);
        setDoctors(data.doctors || []);
        setRoleCounts(data.roleCounts || {});
      }
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessBanner(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          role,
          rollNumber: role === 'student' ? rollNumber : undefined,
          department: role === 'doctor' ? 'Health Services' : department,
          clinicCabin: role === 'doctor' ? clinicCabin : undefined,
          specialization: role === 'doctor' ? specialization : undefined,
          qualification: role === 'doctor' ? qualification : undefined,
          bio: role === 'doctor' ? bio : undefined,
          consultationHours: role === 'doctor' ? consultationHours : undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add person to database');
      }

      setSuccessBanner(data.message || 'Person successfully registered in database!');
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });

      // Reset form
      setFullName('');
      setEmail('');
      setRollNumber('');
      setAvatarUrl('');
      setShowAddModal(false);

      await loadPeople();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding person';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePerson = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the database?`)) return;

    try {
      const res = await fetch(`/api/people/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPeople((prev) => prev.filter((p) => p.id !== userId));
        await loadPeople();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Delete error: ' + err);
    }
  };

  const handleSwitchToPerson = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Switched session to ${data.user.fullName} (${data.user.role})!`);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error switching session:', err);
    }
  };

  // Filtered people
  const filteredPeople = people.filter((p) => {
    const matchesRole = selectedRoleFilter === 'all' || p.role === selectedRoleFilter;
    const matchesSearch =
      searchQuery === '' ||
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.rollNumber && p.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.department && p.department.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#C084FC] border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center space-x-2 bg-black text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] mb-2">
            <Users className="w-4 h-4 text-[#C084FC]" />
            <span>Campus Registry & Member Database</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            People & Directory Database
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-1">
            Add new students, doctors, department staff, grievance officers, and cafeteria operators directly into the database.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setFormError(null);
          }}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FFF066] text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition self-start md:self-auto cursor-pointer"
        >
          <UserPlus className="w-5 h-5 text-black" />
          <span>+ Add New Person to Database</span>
        </button>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-[#A3E635] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs flex items-center justify-between font-black">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-black hover:bg-black hover:text-white px-2 py-0.5 rounded border border-black font-bold">✕</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Total People</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.total || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">In Database</span>
        </div>

        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Students</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.student || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">Learners (+Wallet)</span>
        </div>

        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Doctors</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.doctor || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">Clinic Directory</span>
        </div>

        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Facilities</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.department_staff || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">Work Ops</span>
        </div>

        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Officers</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.grievance_officer || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">Ethics Directorate</span>
        </div>

        <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] p-4 rounded-xl hover:-translate-y-0.5 transition">
          <span className="text-[10px] uppercase font-black text-neutral-700 block">Canteen POS</span>
          <span className="text-3xl font-black text-black mt-1 block">{loading ? '...' : roleCounts.canteen_operator || 0}</span>
          <span className="text-[10px] font-bold text-neutral-800 mt-0.5 block">Cashiers</span>
        </div>
      </div>

      {/* Search and Role Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[260px] bg-[#FAF7EE] border-2 border-black rounded-xl px-3 py-2 shadow-[2px_2px_0px_#000]">
          <Search className="w-4 h-4 text-black shrink-0" />
          <input
            type="text"
            placeholder="Search by name, institutional email, roll number, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-black placeholder-neutral-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition border-2 border-black shadow-[2px_2px_0px_#000] ${
              selectedRoleFilter === 'all'
                ? 'bg-[#FFE600] text-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            All Roles
          </button>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoleFilter(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition border-2 border-black shadow-[2px_2px_0px_#000] ${
                selectedRoleFilter === r.id
                  ? 'bg-[#FFE600] text-black'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* People Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-black font-black">Loading database records...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-2xl text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000]">
            <Users className="w-12 h-12 mx-auto text-black mb-2" />
            <p className="text-base font-black text-black">No people found matching query.</p>
            <p className="text-xs font-semibold text-neutral-700 mt-1">Click &quot;+ Add New Person to Database&quot; to insert a new member.</p>
          </div>
        ) : (
          filteredPeople.map((person) => {
            const roleConf = ROLES.find((r) => r.id === person.role) || ROLES[0];
            const Icon = roleConf.icon;
            const docInfo = doctors.find((d) => d.userId === person.id);

            return (
              <div
                key={person.id}
                className="bg-white p-5 rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF7EE] overflow-hidden shrink-0 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-black text-base text-black">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.fullName} className="w-full h-full object-cover" />
                    ) : (
                      person.fullName.charAt(0)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-black text-base text-black truncate">{person.fullName}</h3>
                      <button
                        onClick={() => handleDeletePerson(person.id, person.fullName)}
                        title="Remove from database"
                        className="text-black hover:bg-[#FB7185] p-1 shrink-0 rounded border border-black shadow-[1px_1px_0px_#000] transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded border border-black bg-[#FAF7EE] text-black font-black shadow-[1px_1px_0px_#000] mt-1">
                      <Icon className="w-3 h-3 text-black" />
                      <span>{roleConf.label}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-800 pt-2 border-t-2 border-black font-semibold">
                  <p className="flex items-center space-x-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-black shrink-0" />
                    <span className="truncate">{person.email}</span>
                  </p>

                  {person.rollNumber && (
                    <p className="flex items-center space-x-1.5 text-black">
                      <GraduationCap className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>Roll Number: <strong>{person.rollNumber}</strong></span>
                    </p>
                  )}

                  {person.department && (
                    <p className="flex items-center space-x-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-black shrink-0" />
                      <span className="truncate">{person.department}</span>
                    </p>
                  )}

                  {person.clinicCabin && (
                    <p className="flex items-center space-x-1.5 text-black truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-black" />
                      <span className="truncate">{person.clinicCabin}</span>
                    </p>
                  )}

                  {docInfo && (
                    <p className="text-[11px] text-black font-bold bg-[#A3E635] p-1.5 rounded border border-black shadow-[1px_1px_0px_#000]">
                      Specialist: {docInfo.specialization} ({docInfo.consultationHours})
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t-2 border-black">
                  <button
                    onClick={() => handleSwitchToPerson(person.id)}
                    className="w-full py-2 px-3 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Test As This Persona</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[10px_10px_0px_#000] space-y-6 my-8 max-h-[90vh] overflow-y-auto text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <h3 className="font-black text-xl text-black flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-black" />
                  <span>Add New Person to Database</span>
                </h3>
                <p className="text-xs font-semibold text-neutral-700">
                  Instantly creates member profile, registers doctor availability, or initializes student civic wallet.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg shadow-[1.5px_1.5px_0px_#000] font-black"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-[#FB7185] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddPerson} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Aryan Saxena or Neha Gupta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4px_4px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Institutional Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aryan.saxena@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4px_4px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Campus Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4px_4px_0px_#000] outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Role Fields */}
              {role === 'student' && (
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div>
                    <label className="block text-xs font-black text-black mb-1">Roll / Enrollment ID</label>
                    <input
                      type="text"
                      placeholder="CS2024-049"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold uppercase shadow-[1.5px_1.5px_0px_#000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-black mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] font-black text-black bg-[#FFE600] p-1.5 rounded border border-black">
                    💡 Enrolled students automatically receive a Civic Wallet with 25 welcome points!
                  </p>
                </div>
              )}

              {role === 'doctor' && (
                <div className="space-y-3 p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-black mb-1">Medical Specialization</label>
                      <input
                        type="text"
                        placeholder="e.g. Dermatology & Allergy Care"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-black mb-1">Clinic Cabin / Location</label>
                      <input
                        type="text"
                        placeholder="Cabin 108, Campus Health Center"
                        value={clinicCabin}
                        onChange={(e) => setClinicCabin(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-black mb-1">Qualifications</label>
                      <input
                        type="text"
                        placeholder="MBBS, MD"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-black mb-1">Consultation Hours</label>
                      <input
                        type="text"
                        placeholder="10:00 AM - 02:00 PM"
                        value={consultationHours}
                        onChange={(e) => setConsultationHours(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-black text-black bg-[#A3E635] p-1.5 rounded border border-black">
                    💡 This doctor will immediately appear in the Doctor Appointment Booking Directory!
                  </p>
                </div>
              )}

              {role === 'department_staff' && (
                <div className="p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
                  <label className="block text-xs font-black text-black mb-1">Facilities Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                  >
                    <option value="Electrical & Power Facilities">Electrical & Power Facilities</option>
                    <option value="IT Network & Hostel Wi-Fi">IT Network & Hostel Wi-Fi</option>
                    <option value="Water Supply & Sanitation">Water Supply & Sanitation</option>
                    <option value="Campus Estate & Civil Works">Campus Estate & Civil Works</option>
                    <option value="Academic Laboratory Support">Academic Laboratory Support</option>
                  </select>
                </div>
              )}

              {role === 'canteen_operator' && (
                <div className="p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
                  <label className="block text-xs font-black text-black mb-1">Assigned Cafeteria Station</label>
                  <input
                    type="text"
                    placeholder="Central Food Court Counter 1"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-black mb-1">Avatar Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or leave empty for auto-generated avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4px_4px_0px_#000] outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !fullName || !email}
                  className="flex-1 py-2.5 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] disabled:bg-neutral-200"
                >
                  {isSubmitting ? 'Saving to Database...' : 'Save Person to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

