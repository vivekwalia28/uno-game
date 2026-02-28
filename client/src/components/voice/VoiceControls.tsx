import './VoiceControls.css';

interface VoiceControlsProps {
  voice: {
    isVoiceActive: boolean;
    isMuted: boolean;
    peers: Map<string, { isSpeaking: boolean }>;
    joinVoice: () => void;
    leaveVoice: () => void;
    toggleMute: () => void;
  };
  compact?: boolean;
}

export default function VoiceControls({ voice, compact }: VoiceControlsProps) {
  const { isVoiceActive, isMuted, peers, joinVoice, leaveVoice, toggleMute } = voice;

  const speakingCount = Array.from(peers.values()).filter(p => p.isSpeaking).length;

  if (!isVoiceActive) {
    return (
      <button
        className={`voice-btn voice-join ${compact ? 'voice-compact' : ''}`}
        onClick={joinVoice}
      >
        <span className="voice-icon">🎙</span>
        {!compact && ' Join Voice'}
      </button>
    );
  }

  return (
    <div className={`voice-controls ${compact ? 'voice-compact' : ''}`}>
      <button
        className={`voice-btn ${isMuted ? 'voice-muted' : 'voice-active'}`}
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🎙'}
      </button>
      <button className="voice-btn voice-leave" onClick={leaveVoice} title="Leave voice">
        📞
      </button>
      {speakingCount > 0 && (
        <span className="speaking-indicator">
          {speakingCount} speaking
        </span>
      )}
      <span className="peer-count">{peers.size} connected</span>
    </div>
  );
}
