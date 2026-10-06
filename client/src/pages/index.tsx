import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Shield, Users, Trophy, Video, Terminal, Server, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [onlineCount, setOnlineCount] = useState(14);

  useEffect(() => {
    // Random live fluctuation for realistic feel
    const interval = setInterval(() => {
      setOnlineCount(prev => Math.max(8, prev + Math.floor(Math.random() * 5) - 2));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1220] text-white selection:bg-[#0066FF] selection:text-white">
      <Head>
        <title>hSECURITIES HQ — Virtual Cyber Campus (office.hsecurities.in)</title>
      </Head>

      {/* Top Navbar */}
      <nav className="border-b border-[#1E293B] bg-[#0B1220]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center p-2 shadow-lg shadow-[#0066FF]/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">
                <span className="text-[#38BDF8]">h</span>SECURITIES <span className="text-[#0066FF]">HQ</span>
              </span>
              <p className="text-[10px] text-[#94A3B8] tracking-widest font-semibold uppercase">Cyber Campus</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#94A3B8]">
            <a href="#wings" className="hover:text-white transition">Campus Wings</a>
            <a href="#features" className="hover:text-white transition">Education Features</a>
            <a href="#ctf" className="hover:text-white transition">CTF Cyber Range</a>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-xs text-[#38BDF8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {onlineCount} Online Now
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-[#334155] text-sm font-semibold hover:bg-[#1E293B] transition"
            >
              Sign In
            </Link>
            <Link
              href="/campus"
              className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-sm font-bold shadow-lg shadow-[#0066FF]/30 transition flex items-center gap-2"
            >
              Enter Campus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#0066FF]/15 blur-[140px] pointer-events-none rounded-full"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1E293B]/80 border border-[#0066FF]/40 text-xs font-semibold text-[#38BDF8] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0066FF]"></span>
            OFFICIAL VIRTUAL CYBER SCHOOL PLATFORM
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight md:leading-none mb-6">
            Where Elite Cyber Defenders <br />
            <span className="bg-gradient-to-r from-[#38BDF8] via-[#0066FF] to-white bg-clip-text text-transparent">
              Train, Battle &amp; Collaborate
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Step into the next-generation virtual campus for <strong className="text-white">hSECURITIES</strong>. 
            Featuring real-time spatial voice, interactive hacking labs, live keynote webinars, and competitive Capture The Flag arena.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/campus"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] font-bold text-base shadow-xl shadow-[#0066FF]/30 transition flex items-center justify-center gap-3"
            >
              Launch Virtual Campus <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] font-semibold text-base transition text-center"
            >
              Student &amp; Trainer Portal
            </Link>
          </div>
        </div>
      </section>

      {/* 10 Campus Wings Overview */}
      <section id="wings" className="py-20 px-6 bg-[#080E1A] border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#0066FF] mb-2">Campus Blueprint</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">10 Specialized Virtual Wings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Reception Area", desc: "Campus check-in, directory kiosk, and portal transit hub.", icon: Users },
              { title: "Training Hall", desc: "24 dual-monitor workstations for hands-on cybersecurity labs.", icon: Terminal },
              { title: "Webinar Auditorium", desc: "Keynote lecture amphitheater with megaphone speaker stage.", icon: Video },
              { title: "Conference Center", desc: "Executive boardroom with Jitsi telepresence video suite.", icon: Shield },
              { title: "CTF Battle Arena", desc: "Red Team vs Blue Team hacking pods with live scoreboard.", icon: Trophy },
              { title: "Networking Lounge", desc: "Cyber cafe with soundproof private conversation alcoves.", icon: Users },
              { title: "Staff Office", desc: "Faculty offices, curriculum stations, and student advising.", icon: Shield },
              { title: "Meeting Breakout Pods", desc: "Threat Intel Pod & Incident Response war room.", icon: Terminal },
              { title: "Career & Placement", desc: "Job listings board and 1-on-1 private interview suites.", icon: Users },
              { title: "Server Room & SOC Vault", desc: "Data center infrastructure and SIEM monitoring console.", icon: Server },
            ].map((wing, i) => {
              const Icon = wing.icon;
              return (
                <div key={i} className="p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] hover:border-[#0066FF]/60 transition group">
                  <div className="w-12 h-12 rounded-xl bg-[#1E293B] text-[#38BDF8] flex items-center justify-center mb-4 group-hover:bg-[#0066FF] group-hover:text-white transition">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-lg text-white mb-2">{wing.title}</h4>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{wing.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#1E293B] bg-[#050911] text-center text-sm text-[#94A3B8]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} hSECURITIES HQ. Strategy. Security. Solutions.</p>
          <p className="text-xs text-[#64748B]">Deployable on Ubuntu Server at <span className="text-[#38BDF8]">office.hsecurities.in</span></p>
        </div>
      </footer>
    </div>
  );
}
