import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import GameBoard from '../components/game/GameBoard';
import GameOverModal from '../components/game/GameOverModal';
import Toast from '../components/ui/Toast';
import VoiceControls from '../components/voice/VoiceControls';
import { useVoiceChat } from '../hooks/useVoiceChat';
import './GamePage.css';

export default function GamePage() {
  const { gameState, room } = useGame();
  const navigate = useNavigate();
  const voice = useVoiceChat(!!room);

  useEffect(() => {
    if (!gameState && !room) {
      navigate('/');
    }
  }, [gameState, room, navigate]);

  if (!gameState) return null;

  return (
    <div className="game-page">
      <div className="game-voice-controls">
        <VoiceControls voice={voice} compact />
      </div>
      <GameBoard />
      {gameState.status === 'finished' && <GameOverModal />}
      <Toast />
    </div>
  );
}
