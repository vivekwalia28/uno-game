import { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import Toast from '../components/ui/Toast';
import './HomePage.css';

export default function HomePage() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const { isConnected } = useSocket();
  const { createRoom, joinRoom } = useRoom();
  const { toasts } = useGame();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) createRoom(name.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && roomCode.trim()) joinRoom(roomCode.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <h1 className="home-title">
          <span className="title-u">U</span>
          <span className="title-n">N</span>
          <span className="title-o">O</span>
        </h1>
        <p className="home-subtitle">Multiplayer Card Game with Voice Chat</p>

        {!isConnected && (
          <div className="connection-status">Connecting to server...</div>
        )}

        {mode === 'menu' && (
          <div className="menu-buttons">
            <button className="btn btn-primary" onClick={() => setMode('create')} disabled={!isConnected}>
              Create Room
            </button>
            <button className="btn btn-secondary" onClick={() => setMode('join')} disabled={!isConnected}>
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="home-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
              className="input"
            />
            <div className="form-buttons">
              <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                Create Room
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('menu')}>
                Back
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="home-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
              className="input"
            />
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input"
              style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center' }}
            />
            <div className="form-buttons">
              <button type="submit" className="btn btn-primary" disabled={!name.trim() || !roomCode.trim()}>
                Join Room
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('menu')}>
                Back
              </button>
            </div>
          </form>
        )}
      </div>
      <Toast />
    </div>
  );
}
