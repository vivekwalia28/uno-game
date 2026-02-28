import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket } from '../context/SocketContext';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
  isSpeaking: boolean;
}

export function useVoiceChat(roomJoined: boolean) {
  const { socket } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const analyserNodesRef = useRef<Map<string, AnalyserNode>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  const createPeer = useCallback((targetId: string, initiator: boolean, stream: MediaStream) => {
    if (!socket) return null;

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socket.emit('voice:signal', { targetId, signal });
    });

    peer.on('stream', (remoteStream) => {
      // Play remote audio
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play().catch(() => {});

      // Set up speaking detection
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const source = ctx.createMediaStreamSource(remoteStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserNodesRef.current.set(targetId, analyser);

      const conn = peersRef.current.get(targetId);
      if (conn) {
        conn.stream = remoteStream;
        peersRef.current.set(targetId, conn);
        setPeers(new Map(peersRef.current));
      }
    });

    peer.on('close', () => {
      peersRef.current.delete(targetId);
      analyserNodesRef.current.delete(targetId);
      setPeers(new Map(peersRef.current));
    });

    peer.on('error', (err) => {
      console.error(`Peer error with ${targetId}:`, err.message);
      peersRef.current.delete(targetId);
      setPeers(new Map(peersRef.current));
    });

    const connection: PeerConnection = { peer, stream: null, isSpeaking: false };
    peersRef.current.set(targetId, connection);
    setPeers(new Map(peersRef.current));

    return peer;
  }, [socket]);

  const joinVoice = useCallback(async () => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsVoiceActive(true);
      socket.emit('voice:join');
    } catch (err) {
      console.error('Failed to get microphone:', err);
    }
  }, [socket]);

  const leaveVoice = useCallback(() => {
    if (!socket) return;

    // Close all peers
    for (const [, conn] of peersRef.current) {
      conn.peer.destroy();
    }
    peersRef.current.clear();
    analyserNodesRef.current.clear();
    setPeers(new Map());

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    setIsVoiceActive(false);
    socket.emit('voice:leave');
  }, [socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Speaking detection loop
  useEffect(() => {
    if (!isVoiceActive) return;
    const interval = setInterval(() => {
      let changed = false;
      for (const [id, analyser] of analyserNodesRef.current) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 15;
        const conn = peersRef.current.get(id);
        if (conn && conn.isSpeaking !== speaking) {
          conn.isSpeaking = speaking;
          changed = true;
        }
      }
      if (changed) setPeers(new Map(peersRef.current));
    }, 100);
    return () => clearInterval(interval);
  }, [isVoiceActive]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomJoined) return;

    const handlePeerJoined = (peerId: string) => {
      if (!localStreamRef.current || !isVoiceActive) return;
      createPeer(peerId, true, localStreamRef.current);
    };

    const handleSignal = (data: { fromId: string; signal: unknown }) => {
      const existing = peersRef.current.get(data.fromId);
      if (existing) {
        existing.peer.signal(data.signal as SimplePeer.SignalData);
      } else if (localStreamRef.current && isVoiceActive) {
        const peer = createPeer(data.fromId, false, localStreamRef.current);
        if (peer) {
          peer.signal(data.signal as SimplePeer.SignalData);
        }
      }
    };

    const handlePeerLeft = (peerId: string) => {
      const conn = peersRef.current.get(peerId);
      if (conn) {
        conn.peer.destroy();
        peersRef.current.delete(peerId);
        analyserNodesRef.current.delete(peerId);
        setPeers(new Map(peersRef.current));
      }
    };

    socket.on('voice:peer_joined', handlePeerJoined);
    socket.on('voice:signal', handleSignal);
    socket.on('voice:peer_left', handlePeerLeft);

    return () => {
      socket.off('voice:peer_joined', handlePeerJoined);
      socket.off('voice:signal', handleSignal);
      socket.off('voice:peer_left', handlePeerLeft);
    };
  }, [socket, roomJoined, isVoiceActive, createPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const [, conn] of peersRef.current) {
        conn.peer.destroy();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      audioContextRef.current?.close();
    };
  }, []);

  return {
    isVoiceActive,
    isMuted,
    peers,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
