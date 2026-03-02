import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket } from '../context/SocketContext';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
  audioElement: HTMLAudioElement | null;
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
  // Use a ref to track voice active state so socket handlers always see current value
  const isVoiceActiveRef = useRef(false);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const createPeer = useCallback((targetId: string, initiator: boolean, stream: MediaStream) => {
    if (!socket) return null;

    // Destroy existing peer for this target if any
    const existing = peersRef.current.get(targetId);
    if (existing) {
      existing.peer.destroy();
      if (existing.audioElement) {
        existing.audioElement.pause();
        existing.audioElement.srcObject = null;
      }
    }

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'e8dd65b92f6aee9de53e3b28',
            credential: 'FxMnRd/JB/W0XOQE',
          },
          {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e8dd65b92f6aee9de53e3b28',
            credential: 'FxMnRd/JB/W0XOQE',
          },
          {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'e8dd65b92f6aee9de53e3b28',
            credential: 'FxMnRd/JB/W0XOQE',
          },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socket.emit('voice:signal', { targetId, signal });
    });

    peer.on('stream', (remoteStream) => {
      // Play remote audio using a persistent Audio element
      const audio = new Audio();
      audio.autoplay = true;
      audio.srcObject = remoteStream;

      const tryPlay = () => {
        audio.play().catch(() => {
          const onClick = () => {
            audio.play().catch(() => {});
            document.removeEventListener('click', onClick);
          };
          document.addEventListener('click', onClick, { once: true });
        });
      };
      tryPlay();

      // Route through AudioContext for speaking detection + backup playback
      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createMediaStreamSource(remoteStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      source.connect(ctx.destination);
      analyserNodesRef.current.set(targetId, analyser);

      const conn = peersRef.current.get(targetId);
      if (conn) {
        conn.stream = remoteStream;
        conn.audioElement = audio;
        peersRef.current.set(targetId, conn);
        setPeers(new Map(peersRef.current));
      }
    });

    peer.on('close', () => {
      const conn = peersRef.current.get(targetId);
      if (conn?.audioElement) {
        conn.audioElement.pause();
        conn.audioElement.srcObject = null;
      }
      peersRef.current.delete(targetId);
      analyserNodesRef.current.delete(targetId);
      setPeers(new Map(peersRef.current));
    });

    peer.on('error', (err) => {
      console.error(`Peer error with ${targetId}:`, err.message);
      const conn = peersRef.current.get(targetId);
      if (conn?.audioElement) {
        conn.audioElement.pause();
        conn.audioElement.srcObject = null;
      }
      peersRef.current.delete(targetId);
      analyserNodesRef.current.delete(targetId);
      setPeers(new Map(peersRef.current));
    });

    const connection: PeerConnection = { peer, stream: null, audioElement: null, isSpeaking: false };
    peersRef.current.set(targetId, connection);
    setPeers(new Map(peersRef.current));

    return peer;
  }, [socket, ensureAudioContext]);

  const joinVoice = useCallback(async () => {
    if (!socket) return;
    try {
      ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      socket.emit('voice:join');
    } catch (err) {
      console.error('Failed to get microphone:', err);
    }
  }, [socket, ensureAudioContext]);

  const leaveVoice = useCallback(() => {
    if (!socket) return;

    for (const [, conn] of peersRef.current) {
      conn.peer.destroy();
      if (conn.audioElement) {
        conn.audioElement.pause();
        conn.audioElement.srcObject = null;
      }
    }
    peersRef.current.clear();
    analyserNodesRef.current.clear();
    setPeers(new Map());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    isVoiceActiveRef.current = false;
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

  // Socket event listeners — use refs for guards to avoid stale closures
  useEffect(() => {
    if (!socket || !roomJoined) return;

    const handlePeerJoined = (peerId: string) => {
      // Use refs (always current) instead of state values (stale in closure)
      if (!localStreamRef.current || !isVoiceActiveRef.current) return;
      createPeer(peerId, true, localStreamRef.current);
    };

    const handleSignal = (data: { fromId: string; signal: unknown }) => {
      const existing = peersRef.current.get(data.fromId);
      if (existing) {
        existing.peer.signal(data.signal as SimplePeer.SignalData);
      } else if (localStreamRef.current && isVoiceActiveRef.current) {
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
        if (conn.audioElement) {
          conn.audioElement.pause();
          conn.audioElement.srcObject = null;
        }
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
  // Removed isVoiceActive from deps — handlers use isVoiceActiveRef instead
  }, [socket, roomJoined, createPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const [, conn] of peersRef.current) {
        conn.peer.destroy();
        if (conn.audioElement) {
          conn.audioElement.pause();
          conn.audioElement.srcObject = null;
        }
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
