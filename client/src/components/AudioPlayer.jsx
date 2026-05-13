import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Loader2 } from 'lucide-react';

let currentlyPlayingId = null;
let onAudioStartCallback = null;

export const registerAudioPlayer = (callback) => {
  onAudioStartCallback = callback;
};

const stopOtherAudios = (excludeId) => {
  if (currentlyPlayingId && currentlyPlayingId !== excludeId && onAudioStartCallback) {
    onAudioStartCallback(currentlyPlayingId);
  }
  currentlyPlayingId = null;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function AudioPlayer({ src, isMe = true, id }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    setIsLoading(true);
    setError(false);
    setIsReady(false);

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)',
      progressColor: isMe ? '#fff' : 'var(--accent)',
      cursorColor: 'transparent',
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 32,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setIsReady(true);
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('play', () => {
      setIsPlaying(true);
      currentlyPlayingId = id;
      stopOtherAudios(id);
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      if (currentlyPlayingId === id) {
        currentlyPlayingId = null;
      }
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      currentlyPlayingId = null;
    });

    wavesurfer.on('error', (err) => {
      console.error('Audio error:', err);
      setError(true);
      setIsLoading(false);
    });

    wavesurfer.load(src);

    return () => {
      if (currentlyPlayingId === id) {
        currentlyPlayingId = null;
      }
      wavesurfer.destroy();
    };
  }, [src, id]);

  const handlePlayPause = () => {
    if (!wavesurferRef.current || !isReady) return;
    wavesurferRef.current.playPause();
  };

  const handleStop = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.pause();
      wavesurferRef.current.seekTo(0);
    }
  };

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 40,
        background: 'rgba(0,0,0,0.1)',
        borderRadius: 8,
        color: 'var(--ink3)',
        fontSize: 12
      }}>
        Audio unavailable
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
      borderRadius: 12,
      width: 220,
    }}>
      <button
        onClick={handlePlayPause}
        disabled={!isReady}
        style={{
          background: 'none',
          border: 'none',
          cursor: isReady ? 'pointer' : 'default',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLoading ? (
          <Loader2 size={20} className="spinning" style={{ color: isMe ? '#fff' : 'var(--ink)' }} />
        ) : isPlaying ? (
          <Pause size={20} fill={isMe ? '#fff' : 'var(--accent)'} color={isMe ? '#fff' : 'var(--accent)'} />
        ) : (
          <Play size={20} fill={isMe ? '#fff' : 'var(--accent)'} color={isMe ? '#fff' : 'var(--accent)'} />
        )}
      </button>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%' }} />
        {!isReady && !error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Loader2 size={16} className="spinning" style={{ color: isMe ? 'rgba(255,255,255,0.5)' : 'var(--ink3)' }} />
          </div>
        )}
      </div>

      <span style={{
        fontSize: 11,
        color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--ink3)',
        minWidth: 35,
        textAlign: 'right',
      }}>
        {isReady ? formatTime(isPlaying ? wavesurferRef.current?.getCurrentTime() : duration) : '0:00'}
      </span>
    </div>
  );
}

export default AudioPlayer;
export { stopOtherAudios };