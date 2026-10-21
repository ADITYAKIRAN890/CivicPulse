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
    student: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', label: 'Student' },
    doctor: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', label: 'Doctor / Clinic' },
    department_staff: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', label: 'Dept Staff' },
    grievance_officer: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: 'Grievance Officer' },
    administrator: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', label: 'Campus Dean / Admin' },
    canteen_operator: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', label: 'Canteen POS' },
  };

  const activeRoleConfig = currentUser ? roleBadgeColor[currentUser.role] : roleBadgeColor.student;

  const navLinks = [
    { label: 'Campus Pulse', href: '/', icon: Building2 },
    { label: 'Doctor Care', href: '/appointments', icon: Stethoscope },
    { label: 'Complaints', href: '/complaints', icon: AlertTriangle },
    { label: 'Civic Rewards', href: '/rewards', icon: Gift },
    { label: 'People Database', href: '/people', icon: Users },
  ];

  // Role portal dynamic shortcuts
  const portalLinks = [
    { label: 'Doctor Portal', href: '/doctor-portal', icon: Stethoscope, roles: ['doctor', 'administrator'] },
    { label: 'Facilities Ops', href: '/department-portal', icon: Building2, roles: ['department_staff', 'administrator'] },
    { label: 'Grievances', href: '/grievance-portal', icon: Shield, roles: ['grievance_officer', 'administrator', 'student'] },
    { label: 'Canteen POS', href: '/canteen-pos', icon: Coffee, roles: ['canteen_operator', 'administrator'] },
    { label: 'Admin Hub', href: '/admin', icon: UserCheck, roles: ['administrator'] },
  ];

  const visiblePortals = portalLinks.filter((p) => currentUser && p.roles.includes(currentUser.role));

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80">
      {/* Top Demo Hackathon Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-blue-900/40 text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
            HACKATHON EVALUATION MODE
          </span>
          <span className="hidden sm:inline text-slate-400">
            CivicsPulse · Zero-Budget College MVP (₹0 Stack)
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-slate-400 hidden md:inline">Current Persona:</span>
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded border border-slate-700 text-slate-200 transition"
          >
            <span className="font-semibold text-blue-400">{currentUser?.fullName || 'Aarav Sharma'}</span>
            <span className={`text-[10px] px-1 rounded border ${activeRoleConfig.bg} ${activeRoleConfig.text}`}>
              {activeRoleConfig.label}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={handleResetData}
            disabled={isResetting}
            title="Reset synthetic data to fresh seed state"
            className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline text-[11px]">Reset Data</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition">
                  Civics<span className="text-blue-500">Pulse</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Campus
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">Smart Student Civic & Care Hub</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-300 hover:text-indigo-300 hover:bg-indigo-950/40'
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card rounded-2xl p-4 shadow-2xl z-50 border border-slate-700">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span>In-App Notifications</span>
                    </h3>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          className={`py-2.5 px-2 rounded-lg transition ${
                            !notif.read ? 'bg-blue-950/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-semibold text-slate-200">{notif.title}</h4>
                            <span className="text-[10px] text-slate-500">
                              {new Date(notif.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{notif.message}</p>
                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => setShowNotifMenu(false)}
                              className="inline-block mt-1 text-[11px] text-blue-400 hover:underline"
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
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl glass-card hover:border-blue-500/40 transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                {currentUser?.fullName.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-white leading-tight">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400">{activeRoleConfig.label}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Persona Switcher Dropdown Modal */}
      {showPersonaMenu && (
        <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full sm:w-[420px] max-w-full glass-card rounded-2xl p-5 shadow-2xl border border-slate-700 mt-12 sm:mr-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <span>Demo Persona Switcher</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instantly switch roles to test access control and workflows.
                </p>
              </div>
              <button
                onClick={() => setShowPersonaMenu(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
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
                    className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/50 shadow-md shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-sm text-white shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white truncate">{u.fullName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${conf.bg} ${conf.text} font-medium`}>
                          {conf.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {u.department || u.clinicCabin || u.rollNumber || u.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-800 p-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              <item.icon className="w-4 h-4 text-blue-400" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
              Role Workspaces
            </p>
            {visiblePortals.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-indigo-300 hover:bg-indigo-950/40"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
