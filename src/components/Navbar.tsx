'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Stethoscope,
  AlertTriangle,
  Gift,
  Shield,
  Building2,
  Coffee,
  Bell,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserProfile, UserRole, InAppNotification } from '@/types';

interface NavbarProps {
  initialUser?: UserProfile | null;
}

export default function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initialUser || null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch current session & all users for persona switcher
  useEffect(() => {
    async function loadSessionAndUsers() {
      try {
        const [sessionRes, usersRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/auth/users'),
        ]);
        const sessionData = await sessionRes.json();
        const usersData = await usersRes.json();

        if (sessionData.success && sessionData.user) {
          setCurrentUser(sessionData.user);
        }
        if (usersData.success && usersData.users) {
          setAllUsers(usersData.users);
        }
      } catch (err) {
        console.error('Navbar session fetch error:', err);
      }
    }
    loadSessionAndUsers();
  }, []);

  // Fetch notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // live polling
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setShowPersonaMenu(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const handleResetData = async () => {
    if (!confirm('Reset all campus data to initial synthetic demo state?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Campus demo data reset successfully!');
        window.location.reload();
      }
    } catch (err) {
      alert('Reset failed: ' + err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const roleBadgeColor: Record<UserRole, { bg: string; text: string; label: string }> = {
    student: { bg: 'bg-[#38BDF8] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Student' },
    doctor: { bg: 'bg-[#A3E635] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Doctor / Clinic' },
    department_staff: { bg: 'bg-[#FB923C] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Dept Staff' },
    grievance_officer: { bg: 'bg-[#C084FC] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Grievance Officer' },
    administrator: { bg: 'bg-[#FB7185] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Campus Dean' },
    canteen_operator: { bg: 'bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_#000]', text: 'text-black', label: 'Canteen POS' },
  };

  const activeRoleConfig = currentUser ? roleBadgeColor[currentUser.role] : roleBadgeColor.student;

  const navLinks = [
    { label: 'Campus Pulse', shortLabel: 'Campus', href: '/', icon: Building2 },
    { label: 'Doctor Care', shortLabel: 'Doctor Care', href: '/appointments', icon: Stethoscope },
    { label: 'Complaints', shortLabel: 'Complaints', href: '/complaints', icon: AlertTriangle },
    { label: 'Civic Rewards', shortLabel: 'Rewards', href: '/rewards', icon: Gift },
    { label: 'People Database', shortLabel: 'People', href: '/people', icon: Users },
  ];

  // Role portal dynamic shortcuts
  const portalLinks = [
    { label: 'Doctor Dashboard', shortLabel: 'Doctor Hub', href: '/doctor/dashboard', icon: Stethoscope, roles: ['doctor', 'administrator'] },
    { label: 'Facilities Ops', shortLabel: 'Facilities', href: '/department-portal', icon: Building2, roles: ['department_staff', 'administrator'] },
    { label: 'Grievances', shortLabel: 'Grievances', href: '/grievance-portal', icon: Shield, roles: ['grievance_officer', 'administrator', 'student'] },
    { label: 'Canteen POS', shortLabel: 'Canteen', href: '/canteen-pos', icon: Coffee, roles: ['canteen_operator', 'administrator'] },
    { label: 'Admin Hub', shortLabel: 'Admin', href: '/admin', icon: UserCheck, roles: ['administrator'] },
  ];

  const visiblePortals = portalLinks.filter((p) => currentUser && p.roles.includes(currentUser.role));

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b-[3px] border-black shadow-[0_4px_0px_#000]">

      {/* Main Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-1.5 sm:gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-2.5 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center group-hover:bg-[#FFF066] transition shrink-0">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-black">
                  Civic<span className="bg-[#38BDF8] px-1.5 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000] ml-1">Pulse</span>
                </span>
                <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-[#A3E635] text-black border-2 border-black shadow-[1px_1px_0px_#000]">
                  Campus
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1 2xl:space-x-1.5 shrink-0">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-2 2xl:px-2.5 py-1.5 rounded-lg text-xs 2xl:text-sm font-black whitespace-nowrap transition shrink-0 ${
                    isActive
                      ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'text-black hover:bg-[#FAF7EE] border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-black" />
                  <span className="hidden 2xl:inline">{item.label}</span>
                  <span className="inline 2xl:hidden">{item.shortLabel}</span>
                </Link>
              );
            })}

            {/* Role Dedicated Portals */}
            {visiblePortals.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-2 2xl:px-2.5 py-1.5 rounded-lg text-xs 2xl:text-sm font-black whitespace-nowrap transition shrink-0 ${
                    isActive
                      ? 'bg-[#C084FC] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-neutral-100 text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#E9D5FF]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-black" />
                  <span className="hidden 2xl:inline">{item.label}</span>
                  <span className="inline 2xl:hidden">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-xl bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] hover:bg-[#FFE600] transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FB7185] border-2 border-black text-black text-[11px] font-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl p-4 shadow-[6px_6px_0px_#000] z-50 border-[3px] border-black">
                  <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                    <h3 className="font-black text-sm text-black flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-black" />
                      <span>In-App Notifications</span>
                    </h3>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-black bg-[#A3E635] text-black border-2 border-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_#000] hover:bg-lime-300"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y-2 divide-neutral-200 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs font-bold text-neutral-500 text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          className={`py-2.5 px-2 rounded-lg transition ${
                            !notif.read ? 'bg-[#FFF066]/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-black text-black">{notif.title}</h4>
                            <span className="text-[10px] font-bold text-neutral-600">
                              {new Date(notif.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-neutral-800 mt-0.5 leading-snug">{notif.message}</p>
                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => setShowNotifMenu(false)}
                              className="inline-block mt-1 text-[11px] font-extrabold text-black underline decoration-2 hover:bg-[#FFE600]"
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Persona Switcher Trigger Button */}
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFE600] transition shrink-0"
              title="Switch user role / profile"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-xs text-black shrink-0 shadow-[1px_1px_0px_#000]">
                {currentUser?.fullName.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden sm:flex flex-col justify-center min-w-0 max-w-[95px] xl:max-w-[125px]">
                <p className="text-xs font-black text-black leading-tight truncate whitespace-nowrap">{currentUser?.fullName}</p>
                <p className="text-[10px] font-bold text-neutral-600 leading-tight truncate whitespace-nowrap">{activeRoleConfig.label}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-black shrink-0" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-black shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Persona Switcher Dropdown Modal */}
      {showPersonaMenu && (
        <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/50">
          <div className="w-full sm:w-[420px] max-w-full bg-white rounded-2xl p-5 shadow-[8px_8px_0px_#000] border-[3.5px] border-black mt-12 sm:mr-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <h3 className="font-black text-base text-black flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-black" />
                  <span>Demo Persona Switcher</span>
                </h3>
                <p className="text-xs font-semibold text-neutral-700">
                  Instantly switch roles to test access control and workflows.
                </p>
              </div>
              <button
                onClick={() => setShowPersonaMenu(false)}
                className="p-1 rounded-lg border-2 border-black bg-white hover:bg-[#FB7185] text-black shadow-[1.5px_1.5px_0px_#000]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {allUsers.map((u) => {
                const conf = roleBadgeColor[u.role] || roleBadgeColor.student;
                const isSelected = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition border-2 border-black shadow-[2.5px_2.5px_0px_#000] ${
                      isSelected
                        ? 'bg-[#FFE600] font-black'
                        : 'bg-white hover:bg-[#FAF7EE]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-black truncate">{u.fullName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${conf.bg} ${conf.text} font-black`}>
                          {conf.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-700 truncate">
                        {u.department || u.clinicCabin || u.rollNumber || u.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Reset Seed Data Option */}
            <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-600">Demo Environment</span>
              <button
                onClick={handleResetData}
                disabled={isResetting}
                title="Reset synthetic data to fresh seed state"
                className="flex items-center space-x-1.5 bg-[#FB7185] hover:bg-rose-400 text-black font-black border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_#000] transition hover:-translate-y-0.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b-[3px] border-black p-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-black text-black hover:bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000]"
            >
              <item.icon className="w-4 h-4 text-black" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t-2 border-black">
            <p className="text-[11px] font-black text-black uppercase tracking-wider px-3 mb-1">
              Role Workspaces
            </p>
            {visiblePortals.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-black text-black hover:bg-[#C084FC] border-2 border-black shadow-[2px_2px_0px_#000] mb-2"
              >
                <item.icon className="w-4 h-4 text-black" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

