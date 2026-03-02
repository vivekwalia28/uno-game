import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { VoiceChatProvider } from './context/VoiceChatContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <GameProvider>
          <VoiceChatProvider>
            <App />
          </VoiceChatProvider>
        </GameProvider>
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>
);
