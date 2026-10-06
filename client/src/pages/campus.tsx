import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, MessageSquare,
  Users, Settings, Shield, Trophy, Terminal, X, Send, Bell
} from 'lucide-react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { WebRTCManager } from '../services/webrtc';
import { api } from '../services/api';
import { User, ChatMessage, CTFChallenge } from '../types';

export default function CampusPage() {
  const router = useRouter();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Panels & Modals
  const [showChat, setShowChat] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // CTF Modal state
  const [challenges, setChallenges] = useState<CTFChallenge[]>([]);
  const [flagInputs, setFlagInputs] = useState<{ [id: number]: string }>({});
  const [ctfResult, setCtfResult] = useState<{ [id: number]: string }>({});

  // Broadcast Alert
  const [broadcast, setBroadcast] = useState<string | null>(null);

  useEffect(() => {
    // 1. Verify User Session
    const token = localStorage.getItem('hsec_token');
    const storedUser = localStorage.getItem('hsec_user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // 2. Connect Socket.IO
    const socket = connectSocket();

    // 3. Initialize WebRTC
    const rtc = new WebRTCManager(socket);
    webrtcRef.current = rtc;

    socket.on('proximity:nearby_players', ({ nearbySockets }: { nearbySockets: string[] }) => {
      rtc.syncProximityPeers(nearbySockets);
    });

    socket.on('chat:room_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('campus:broadcast', ({ message, authorName }: { message: string; authorName: string }) => {
      setBroadcast(`📢 [${authorName}]: ${message}`);
      setTimeout(() => setBroadcast(null), 10000);
    });

    // 4. Initialize Phaser.js Scene dynamically (Client-only)
    let isMounted = true;
    import('phaser').then(PhaserModule => {
      if (!isMounted || !gameContainerRef.current) return;

      import('../game/CampusScene').then(({ CampusScene }) => {
        const config: Phaser.Types.Core.GameConfig = {
          type: PhaserModule.AUTO,
          parent: gameContainerRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: '#0B1220',
          physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false }
          },
          scene: [CampusScene]
        };

        const game = new PhaserModule.Game(config);
        phaserGameRef.current = game;

        // Pass dependencies to scene
        game.scene.start('CampusScene', {
          socket,
          initialRoom: 'reception',
          onInteract: (zone: string) => {
            handleInteractionTrigger(zone);
          }
        });

        // Resize handler
        const handleResize = () => {
          if (phaserGameRef.current) {
            phaserGameRef.current.scale.resize(window.innerWidth, window.innerHeight);
          }
        };
        window.addEventListener('resize', handleResize);
      });
    });

    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
      }
      if (webrtcRef.current) {
        webrtcRef.current.destroy();
      }
      disconnectSocket();
    };
  }, []);

  const handleInteractionTrigger = async (zone: string) => {
    setActiveModal(zone);
    if (zone === 'ctfScoreboard') {
      try {
        const res = await api.get('/ctf/challenges');
        setChallenges(res.data.challenges || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (webrtcRef.current) {
      webrtcRef.current.toggleMic(nextState);
    }
    getSocket().emit('player:media_state', {
      isMicOn: nextState,
      isCamOn,
      isScreenSharing
    });
  };

  const handleToggleCam = async () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    if (webrtcRef.current) {
      if (nextState) {
        await webrtcRef.current.initLocalMedia(isMicOn, true);
      }
      webrtcRef.current.toggleCam(nextState);
    }
    getSocket().emit('player:media_state', {
      isMicOn,
      isCamOn: nextState,
      isScreenSharing
    });
  };

  const handleToggleScreen = async () => {
    if (!isScreenSharing) {
      if (webrtcRef.current) {
        const stream = await webrtcRef.current.startScreenShare();
        if (stream) {
          setIsScreenSharing(true);
          getSocket().emit('player:media_state', { isMicOn, isCamOn, isScreenSharing: true });
        }
      }
    } else {
      if (webrtcRef.current) {
        webrtcRef.current.stopScreenShare();
      }
      setIsScreenSharing(false);
      getSocket().emit('player:media_state', { isMicOn, isCamOn, isScreenSharing: false });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    getSocket().emit('chat:send_message', {
      message: chatInput,
      isPrivate: false
    });
    setChatInput('');
  };

  const submitFlag = async (challengeId: number) => {
    const flag = flagInputs[challengeId];
    if (!flag) return;

    try {
      const res = await api.post('/ctf/submit', { challenge_id: challengeId, flag });
      setCtfResult(prev => ({ ...prev, [challengeId]: res.data.message }));
      if (res.data.correct) {
        // Refresh challenges
        const refresh = await api.get('/ctf/challenges');
        setChallenges(refresh.data.challenges || []);
      }
    } catch (err: any) {
      setCtfResult(prev => ({ ...prev, [challengeId]: err.response?.data?.error || 'Submission error' }));
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B1220] select-none">
      <Head>
        <title>Campus — hSECURITIES HQ (office.hsecurities.in)</title>
      </Head>

      {/* Phaser Canvas Container */}
      <div ref={gameContainerRef} className="absolute inset-0 z-0" />

      {/* Top HUD: Brand & Status */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
        <div className="px-4 py-2 rounded-xl bg-[#0B1220]/80 border border-[#1E293B] backdrop-blur-md flex items-center gap-3 shadow-lg">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center p-1">
            <Shield className="w-full h-full text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">
              <span className="text-[#38BDF8]">h</span>SECURITIES <span className="text-[#0066FF]">HQ</span>
            </span>
            <p className="text-[10px] text-[#94A3B8]">Virtual Campus • office.hsecurities.in</p>
          </div>
        </div>
      </div>

      {/* Global Broadcast Banner */}
      {broadcast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-xl px-6 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-2xl flex items-center gap-3 animate-bounce">
          <Bell className="w-5 h-5 flex-shrink-0" />
          <span>{broadcast}</span>
        </div>
      )}

      {/* Bottom Media Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0B1220]/90 border border-[#1E293B] backdrop-blur-xl shadow-2xl">
        <button
          onClick={handleToggleMic}
          className={`p-3 rounded-xl transition ${isMicOn ? 'bg-[#0066FF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'}`}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleToggleCam}
          className={`p-3 rounded-xl transition ${isCamOn ? 'bg-[#0066FF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'}`}
          title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleToggleScreen}
          className={`p-3 rounded-xl transition ${isScreenSharing ? 'bg-emerald-600 text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'}`}
          title="Share Screen"
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-[#334155] mx-1"></div>

        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-3 rounded-xl transition ${showChat ? 'bg-[#0066FF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'}`}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowUsers(!showUsers)}
          className={`p-3 rounded-xl transition ${showUsers ? 'bg-[#0066FF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'}`}
          title="Active Members"
        >
          <Users className="w-5 h-5" />
        </button>

        {user && user.role_priority >= 6 && (
          <Link
            href="/admin"
            className="p-3 rounded-xl bg-[#1E293B] text-[#38BDF8] hover:bg-[#0066FF] hover:text-white transition"
            title="Admin Dashboard"
          >
            <Settings className="w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Right Drawer: Room Chat */}
      {showChat && (
        <div className="absolute right-6 top-6 bottom-24 w-80 rounded-2xl bg-[#0B1220]/95 border border-[#1E293B] backdrop-blur-xl z-20 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#38BDF8]" /> Room Chat
            </h3>
            <button onClick={() => setShowChat(false)} className="text-[#94A3B8] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center mt-12">No messages in this wing yet. Say hello!</p>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-[#38BDF8]">{m.senderName}</span>
                    <span className="text-[10px] text-[#64748B]">({m.senderRole})</span>
                  </div>
                  <p className="text-white/90 bg-[#1E293B] p-2.5 rounded-xl">{m.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#1E293B] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to room..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#1E293B] text-white text-xs border border-[#334155] focus:outline-none focus:border-[#0066FF]"
            />
            <button type="submit" className="p-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Interactive Trigger Modals */}
      {activeModal === 'ctfScoreboard' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0066FF]/20 text-[#38BDF8] flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-white">CTF Arena — Cyber Range</h3>
                  <p className="text-xs text-[#94A3B8]">Capture The Flag tournament challenges</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-[#94A3B8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {challenges.map(c => (
                <div key={c.id} className="p-5 rounded-xl bg-[#0B1220] border border-[#1E293B]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-base text-white">{c.title}</span>
                    <span className="px-2.5 py-1 rounded-md bg-[#1E293B] text-xs font-semibold text-[#38BDF8]">
                      {c.points} PTS • {c.category}
                    </span>
                  </div>
                  <p className="text-sm text-[#94A3B8] mb-4">{c.description}</p>
                  
                  {c.solved ? (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                      ✓ SOLVED BY YOU
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="hSec{flag_goes_here}"
                        value={flagInputs[c.id] || ''}
                        onChange={(e) => setFlagInputs({ ...flagInputs, [c.id]: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#1E293B] border border-[#334155] text-white text-xs font-mono focus:outline-none focus:border-[#0066FF]"
                      />
                      <button
                        onClick={() => submitFlag(c.id)}
                        className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs rounded-lg transition"
                      >
                        Submit Flag
                      </button>
                    </div>
                  )}

                  {ctfResult[c.id] && (
                    <p className="mt-2 text-xs font-semibold text-[#38BDF8]">{ctfResult[c.id]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SOC Console Modal */}
      {activeModal === 'socConsole' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-4">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-emerald-400" />
                <h3 className="font-bold text-lg text-white">SOC Security Information &amp; Event Management (SIEM)</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-[#94A3B8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-black font-mono text-xs text-emerald-400 space-y-2 h-64 overflow-y-auto">
              <p>[SYSTEM] Connected to hSECURITIES Core Telemetry SIEM Engine...</p>
              <p>[FIREWALL] Zero unauthorized intrusions recorded across 10 campus zones.</p>
              <p>[AUTH] Active session token validated. Access granted to restricted enclave.</p>
              <p>[STATUS] Server rack array cooling at 19.4°C. Grid stability 99.99%.</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Kiosk Modal */}
      {activeModal === 'welcomeKiosk' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 shadow-2xl text-center">
            <Shield className="w-12 h-12 text-[#38BDF8] mx-auto mb-4" />
            <h3 className="font-extrabold text-xl text-white mb-2">Welcome to hSECURITIES HQ!</h3>
            <p className="text-sm text-[#94A3B8] mb-6">
              Use arrow keys or WASD to navigate. Use portals in the corners of reception to fast-travel to the Auditorium, Training Labs, or CTF Arena.
            </p>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] font-bold text-white text-sm"
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
