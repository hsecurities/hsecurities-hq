import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Shield, Users, Activity, Settings, Bell, Calendar,
  FileText, Search, ArrowLeft, CheckCircle, AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { getSocket, connectSocket } from '../../services/socket';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'rooms' | 'attendance' | 'broadcast'>('analytics');
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('normal');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('hsec_token');
    const storedUser = localStorage.getItem('hsec_user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(storedUser);
    if (user.role_priority < 6) { // Min Admin level
      router.push('/campus');
      return;
    }

    fetchAnalytics();
    fetchUsers();
    fetchRoles();
    fetchRooms();
    fetchAttendance();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data.analytics);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users', { params: { search: userSearch } });
      setUsersList(res.data.users || []);
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setRolesList(res.data.roles || []);
    } catch (e) { console.error(e); }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRoomsList(res.data.rooms || []);
    } catch (e) { console.error(e); }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/admin/attendance');
      setAttendanceList(res.data.attendance || []);
    } catch (e) { console.error(e); }
  };

  const updateUserRole = async (userId: string, newRoleId: number) => {
    try {
      await api.put(`/admin/users/${userId}`, { role_id: newRoleId });
      fetchUsers();
      setStatusMessage('User clearance updated successfully.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) { console.error(e); }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { status });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const socket = connectSocket();
    socket.emit('admin:broadcast', {
      message: broadcastMessage,
      priority: broadcastPriority
    });

    setStatusMessage('Broadcast notification sent to all active campus members.');
    setBroadcastMessage('');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex">
      <Head>
        <title>Admin Operations Panel — hSECURITIES HQ</title>
      </Head>

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#1E293B] bg-[#080E1A] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center p-1.5 shadow-lg">
              <Shield className="w-full h-full text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight">hSECURITIES</span>
              <p className="text-[10px] text-[#38BDF8] font-bold tracking-widest uppercase">Admin Command</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'analytics', label: 'Dashboard & Analytics', icon: Activity },
              { id: 'users', label: 'User & Role Directory', icon: Users },
              { id: 'rooms', label: 'Room Access & Builder', icon: Settings },
              { id: 'attendance', label: 'Attendance Reports', icon: FileText },
              { id: 'broadcast', label: 'Broadcast & Alerts', icon: Bell },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    activeTab === item.id
                      ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/20'
                      : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <Link
          href="/campus"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-sm font-semibold text-[#94A3B8] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Campus
        </Link>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {statusMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {statusMessage}
          </div>
        )}

        {/* 1. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Campus Telemetry &amp; Analytics</h2>
              <p className="text-sm text-[#94A3B8]">Real-time operational metrics for office.hsecurities.in</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B]">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase">Active Campus Sessions</span>
                <p className="text-4xl font-black text-[#38BDF8] mt-2">{analytics?.current_online_users || 0}</p>
                <span className="text-xs text-emerald-400 font-semibold mt-1 inline-block">● Live in Virtual Space</span>
              </div>
              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B]">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase">Total Enrolled Members</span>
                <p className="text-4xl font-black text-white mt-2">{analytics?.total_registered_users || 0}</p>
                <span className="text-xs text-[#94A3B8] mt-1 inline-block">Students, Trainers &amp; Staff</span>
              </div>
              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B]">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase">CTF Challenge Solves</span>
                <p className="text-4xl font-black text-amber-400 mt-2">{analytics?.total_ctf_solves || 0}</p>
                <span className="text-xs text-amber-400/80 mt-1 inline-block">Flags Captured</span>
              </div>
            </div>

            {/* Room Distribution Breakdown */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B]">
              <h3 className="text-base font-bold text-white mb-4">Wing Occupancy Distribution</h3>
              <div className="space-y-3">
                {analytics?.rooms_occupancy?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B1220] border border-[#1E293B]">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className="px-3 py-1 rounded-full bg-[#1E293B] text-xs font-bold text-[#38BDF8]">
                      {r.current_users} Users Present
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS & ROLES TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">User &amp; Role Management</h2>
                <p className="text-sm text-[#94A3B8]">Assign security clearance levels and view member profiles</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-[#0066FF]"
                />
                <button onClick={fetchUsers} className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] font-bold text-sm rounded-xl">
                  Filter
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0B1220] text-xs text-[#94A3B8] uppercase">
                  <tr>
                    <th className="p-4">Name / Title</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Assigned Clearance Role</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-[#1E293B]/50 transition">
                      <td className="p-4 font-semibold text-white">
                        {u.name}
                        <span className="block text-xs text-[#64748B] font-normal">{u.title || 'Student'}</span>
                      </td>
                      <td className="p-4 text-[#94A3B8] font-mono text-xs">{u.email}</td>
                      <td className="p-4">
                        <select
                          value={u.role_id}
                          onChange={(e) => updateUserRole(u.id, Number(e.target.value))}
                          className="px-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#334155] text-xs font-semibold text-[#38BDF8] focus:outline-none focus:border-[#0066FF]"
                        >
                          {rolesList.map(r => (
                            <option key={r.id} value={r.id}>{r.name} (Priority {r.priority})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Campus Wing Access Controls</h2>
              <p className="text-sm text-[#94A3B8]">Configure room permissions, restrictions, and capacity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roomsList.map(r => (
                <div key={r.id} className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base text-white">{r.name}</h3>
                    <span className="text-xs font-mono text-[#94A3B8]">{r.id}</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mb-4">Category: {r.category} • Max Capacity: {r.capacity}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                    <span className="text-xs text-[#94A3B8]">Min Clearance Priority:</span>
                    <span className="px-2.5 py-1 rounded-md bg-[#1E293B] text-xs font-bold text-[#38BDF8]">
                      Level {r.min_role_priority}+
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Class &amp; Webinar Attendance Logs</h2>
              <p className="text-sm text-[#94A3B8]">Automatic check-ins logged when students enter campus rooms</p>
            </div>

            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0B1220] text-xs text-[#94A3B8] uppercase">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Campus Room / Wing</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Check-in Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {attendanceList.map(a => (
                    <tr key={a.id} className="hover:bg-[#1E293B]/50 transition">
                      <td className="p-4 font-semibold text-white">{a.user_name} ({a.user_email})</td>
                      <td className="p-4 text-[#38BDF8] font-semibold">{a.room_name}</td>
                      <td className="p-4 text-[#94A3B8] font-mono text-xs">{a.session_date}</td>
                      <td className="p-4 text-[#94A3B8] font-mono text-xs">{new Date(a.check_in_time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. BROADCAST TAB */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Live Campus Broadcast</h2>
              <p className="text-sm text-[#94A3B8]">Send an instantaneous banner announcement to all connected users</p>
            </div>

            <form onSubmit={handleBroadcast} className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Message</label>
                <textarea
                  rows={4}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Keynote webinar is starting now in the Webinar Auditorium! Please take your seats."
                  className="w-full p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Priority</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-[#0066FF]"
                >
                  <option value="normal">Normal Announcement</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] font-bold text-white shadow-lg shadow-[#0066FF]/30 transition"
              >
                Transmit Campus Broadcast
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
