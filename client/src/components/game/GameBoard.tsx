import PlayerHand from './PlayerHand';
import DrawPile from './DrawPile';
import DiscardPile from './DiscardPile';
import PlayerList from './PlayerList';
import UnoButton from './UnoButton';
import './GameBoard.css';

export default function GameBoard() {
  return (
    <div className="game-board">
      <PlayerList />
      <div className="board-center">
        <DrawPile />
        <DiscardPile />
      </div>
      <UnoButton />
      <PlayerHand />
    </div>
  );
}
