import { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export class WebRTCManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private audioElements = new Map<string, HTMLAudioElement>();

  public onRemoteStreamAdd?: (peerSocketId: string, stream: MediaStream) => void;
  public onRemoteStreamRemove?: (peerSocketId: string) => void;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSignaling();
  }

  private setupSignaling() {
    this.socket.on('webrtc:signal', async ({ fromSocketId, signalData }) => {
      let pc = this.peerConnections.get(fromSocketId);

      if (!pc) {
        pc = this.createPeerConnection(fromSocketId, false);
      }

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.socket.emit('webrtc:signal', {
            toSocketId: fromSocketId,
            signalData: answer
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error('[WebRTC Signaling Error]', err);
      }
    });
  }

  public async initLocalMedia(mic: boolean, cam: boolean): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
      });

      // Set initial track states
      this.localStream.getAudioTracks().forEach(t => t.enabled = mic);
      this.localStream.getVideoTracks().forEach(t => t.enabled = cam);

      return this.localStream;
    } catch (err) {
      console.warn('[Media Device Access Warning]', err);
      return null;
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];

      // Replace video track in all active peer connections
      for (const [_, pc] of this.peerConnections) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (err) {
      console.error('[Screen Share Error]', err);
      return null;
    }
  }

  public stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;

      // Revert to camera track if available
      if (this.localStream) {
        const camTrack = this.localStream.getVideoTracks()[0];
        for (const [_, pc] of this.peerConnections) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && camTrack) {
            sender.replaceTrack(camTrack);
          }
        }
      }
    }
  }

  public createPeerConnection(peerSocketId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerSocketId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:signal', {
          toSocketId: peerSocketId,
          signalData: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(peerSocketId, remoteStream);

      // Create audio element for spatial audio playback
      if (!this.audioElements.has(peerSocketId)) {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        this.audioElements.set(peerSocketId, audio);
      }

      if (this.onRemoteStreamAdd) {
        this.onRemoteStreamAdd(peerSocketId, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.closePeer(peerSocketId);
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        this.socket.emit('webrtc:signal', {
          toSocketId: peerSocketId,
          signalData: offer
        });
      });
    }

    return pc;
  }

  public syncProximityPeers(nearbySocketIds: string[]) {
    // Connect to new peers that entered proximity
    nearbySocketIds.forEach(socketId => {
      if (!this.peerConnections.has(socketId)) {
        this.createPeerConnection(socketId, true);
      }
    });

    // Close peers that walked out of proximity
    for (const [socketId] of this.peerConnections) {
      if (!nearbySocketIds.includes(socketId)) {
        this.closePeer(socketId);
      }
    }
  }

  public updateSpatialVolume(peerSocketId: string, distance: number, maxDistance: number = 200) {
    const audio = this.audioElements.get(peerSocketId);
    if (audio) {
      // Linear or quadratic falloff from 1.0 down to 0.0
      const volume = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
      audio.volume = volume;
    }
  }

  public toggleMic(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = enabled);
    }
  }

  public toggleCam(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = enabled);
    }
  }

  public closePeer(peerSocketId: string) {
    const pc = this.peerConnections.get(peerSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerSocketId);
    }
    const audio = this.audioElements.get(peerSocketId);
    if (audio) {
      audio.srcObject = null;
      this.audioElements.delete(peerSocketId);
    }
    this.remoteStreams.delete(peerSocketId);

    if (this.onRemoteStreamRemove) {
      this.onRemoteStreamRemove(peerSocketId);
    }
  }

  public destroy() {
    for (const [peerId] of this.peerConnections) {
      this.closePeer(peerId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
    }
  }
}
