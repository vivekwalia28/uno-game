import { useState, useRef, useEffect } from 'react';
import './BackgroundMusic.css';

// Royalty-free lofi ambient track from Pixabay
const MUSIC_URL = 'https://cdn.pixabay.com/audio/2024/11/01/audio_fdc9e503d5.mp3';
const DEFAULT_VOLUME = 0.15;

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = DEFAULT_VOLUME;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  return (
    <div className="bg-music">
      <button className="bg-music-btn" onClick={togglePlay} title={isPlaying ? 'Pause music' : 'Play music'}>
        {isPlaying ? '\u266B' : '\u266A'}
      </button>
      {isPlaying && (
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="bg-music-volume"
          title="Volume"
        />
      )}
    </div>
  );
}
