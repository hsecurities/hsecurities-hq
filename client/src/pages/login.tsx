import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Shield, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(2); // Student default
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', { email, password, name, role_id: roleId });
        localStorage.setItem('hsec_token', res.data.token);
        localStorage.setItem('hsec_user', JSON.stringify(res.data.user));
      } else {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('hsec_token', res.data.token);
        localStorage.setItem('hsec_user', JSON.stringify(res.data.user));
      }

      router.push('/campus');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Admin@hSec2026!');
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-6 relative overflow-hidden">
      <Head>
        <title>{isRegister ? 'Register' : 'Sign In'} — hSECURITIES HQ</title>
      </Head>

      {/* Background Cyber Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0066FF]/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center p-2.5 shadow-xl shadow-[#0066FF]/25">
              <Shield className="w-full h-full text-white" />
            </div>
            <span className="font-extrabold text-2xl text-white tracking-tight">
              <tspan className="text-[#38BDF8]">h</tspan>SECURITIES <span className="text-[#0066FF]">HQ</span>
            </span>
          </Link>
          <p className="text-sm text-[#94A3B8]">Virtual Cyber School &amp; Training Campus</p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-[#0F172A]/90 border border-[#1E293B] shadow-2xl backdrop-blur-xl">
          <div className="flex rounded-xl bg-[#0B1220] p-1 mb-6 border border-[#1E293B]">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                !isRegister ? 'bg-[#0066FF] text-white shadow' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                isRegister ? 'bg-[#0066FF] text-white shadow' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <User className="w-5 h-5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white placeholder-[#64748B] text-sm focus:outline-none focus:border-[#0066FF] transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@hsecurities.in"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white placeholder-[#64748B] text-sm focus:outline-none focus:border-[#0066FF] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white placeholder-[#64748B] text-sm focus:outline-none focus:border-[#0066FF] transition"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Account Type</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-[#0B1220] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-[#0066FF] transition"
                >
                  <option value={2}>Cyber Student</option>
                  <option value={1}>Campus Guest</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] font-bold text-white shadow-lg shadow-[#0066FF]/30 transition flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login Presets for testing */}
          <div className="mt-8 pt-6 border-t border-[#1E293B]">
            <p className="text-xs text-[#94A3B8] text-center mb-3">Quick Demo Login Presets:</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickLogin('admin@hsecurities.in')}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-medium text-[#38BDF8] border border-[#334155] transition text-center"
              >
                Root Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
