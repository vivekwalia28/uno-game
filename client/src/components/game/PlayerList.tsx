import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import './PlayerList.css';

export default function PlayerList() {
  const { gameState } = useGame();
  const { socket } = useSocket();

  if (!gameState || !socket) return null;

  const directionSymbol = gameState.direction === 1 ? '↻' : '↺';

  return (
    <div className="player-list-game">
      <div className="direction-indicator" title="Play direction">
        {directionSymbol}
      </div>
      {gameState.players.map((player, index) => {
        const isCurrent = index === gameState.currentPlayerIndex;
        const isMe = player.id === socket.id;
        return (
          <div
            key={player.id}
            className={`player-avatar ${isCurrent ? 'player-current' : ''} ${!player.isConnected ? 'player-offline' : ''} ${isMe ? 'player-me' : ''}`}
          >
            <div className="avatar-icon">
              {player.name[0].toUpperCase()}
            </div>
            <div className="avatar-info">
              <span className="avatar-name">
                {player.name}
                {isMe && ' (You)'}
              </span>
              <span className="avatar-cards">{player.cardCount} cards</span>
            </div>
            {!player.isConnected && <span className="offline-badge">Offline</span>}
          </div>
        );
      })}
    </div>
  );
}
