import { motion, AnimatePresence } from 'framer-motion';
import { useGameActions } from '../../hooks/useGame';
import { useUnoCall } from '../../hooks/useUnoCall';
import './UnoButton.css';

export default function UnoButton() {
  const { callUno, catchUno } = useGameActions();
  const { canCallUno, canCatchUno, targetId } = useUnoCall();

  const showButton = canCallUno || canCatchUno;

  const handleClick = () => {
    if (canCallUno) {
      callUno();
    } else if (canCatchUno && targetId) {
      catchUno(targetId);
    }
  };

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          className={`uno-button ${canCallUno ? 'uno-call' : 'uno-catch'}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClick}
        >
          {canCallUno ? 'UNO!' : 'Catch!'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
