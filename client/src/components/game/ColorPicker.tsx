import { motion } from 'framer-motion';
import type { Color } from 'shared/types';
import './ColorPicker.css';

interface ColorPickerProps {
  onPick: (color: Color) => void;
  onClose: () => void;
}

const COLORS: Array<{ color: Color; label: string }> = [
  { color: 'red', label: 'Red' },
  { color: 'blue', label: 'Blue' },
  { color: 'green', label: 'Green' },
  { color: 'yellow', label: 'Yellow' },
];

export default function ColorPicker({ onPick, onClose }: ColorPickerProps) {
  return (
    <motion.div
      className="color-picker-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="color-picker"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <h3>Choose a color</h3>
        <div className="color-options">
          {COLORS.map(({ color, label }) => (
            <motion.button
              key={color}
              className={`color-option color-option-${color}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPick(color)}
            >
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
