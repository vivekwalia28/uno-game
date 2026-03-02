import { createContext, useContext, ReactNode } from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useGame } from './GameContext';

type VoiceChatReturn = ReturnType<typeof useVoiceChat>;

const VoiceChatContext = createContext<VoiceChatReturn>({
  isVoiceActive: false,
  isMuted: false,
  peers: new Map(),
  joinVoice: async () => {},
  leaveVoice: () => {},
  toggleMute: () => {},
});

export function VoiceChatProvider({ children }: { children: ReactNode }) {
  const { room } = useGame();
  const voice = useVoiceChat(!!room);

  return (
    <VoiceChatContext.Provider value={voice}>
      {children}
    </VoiceChatContext.Provider>
  );
}

export function useVoice() {
  return useContext(VoiceChatContext);
}
