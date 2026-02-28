import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../hooks/useRoom';
import VoiceControls from '../components/voice/VoiceControls';
import { useVoiceChat } from '../hooks/useVoiceChat';
import Toast from '../components/ui/Toast';
import './LobbyPage.css';

export default function LobbyPage() {
  const { room, gameState } = useGame();
  const { socket } = useSocket();
  const { leaveRoom, startGame } = useRoom();
  const navigate = useNavigate();
  const voice = useVoiceChat(!!room);

  // Redirect to game when game starts
  useEffect(() => {
    if (gameState) {
      navigate('/game');
    }
  }, [gameState, navigate]);

  // Redirect to home if no room
  useEffect(() => {
    if (!room) {
      navigate('/');
    }
  }, [room, navigate]);

  if (!room || !socket) return null;

  const isHost = room.hostId === socket.id;
  const canStart = isHost && room.players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-container">
        <div className="lobby-header">
          <h2>Game Lobby</h2>
          <button className="btn btn-ghost btn-sm" onClick={leaveRoom}>Leave</button>
        </div>

        <div className="room-code-section">
          <p className="room-code-label">Room Code</p>
          <div className="room-code" onClick={copyCode} title="Click to copy">
            {room.code}
          </div>
          <p className="room-code-hint">Share this code with friends to join</p>
        </div>

        <div className="players-section">
          <h3>Players ({room.players.length}/{room.maxPlayers})</h3>
          <ul className="player-list">
            {room.players.map(player => (
              <li key={player.id} className="player-item">
                <span className="player-name">
                  {player.name}
                  {player.isHost && <span className="host-badge">Host</span>}
                  {player.id === socket.id && <span className="you-badge">You</span>}
                </span>
                <span className={`status-dot ${player.isConnected ? 'connected' : 'disconnected'}`} />
              </li>
            ))}
          </ul>
        </div>

        <div className="lobby-voice">
          <VoiceControls voice={voice} />
        </div>

        {isHost ? (
          <button
            className="btn btn-primary btn-lg"
            onClick={startGame}
            disabled={!canStart}
          >
            {room.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
          </button>
        ) : (
          <p className="waiting-text">Waiting for host to start the game...</p>
        )}
      </div>
      <Toast />
    </div>
  );
}
