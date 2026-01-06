import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { usePlayerStore } from '../store/usePlayerStore';

export const useAudio = () => {
  const { currentTrack, isPlaying, playNext, setCurrentTime, repeatMode } = usePlayerStore();
  const playerRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Expose seek function
  useEffect(() => {
    const handleSeek = (time: number) => {
      if (playerRef.current) {
        playerRef.current.seek(time);
        setCurrentTime(time);
      }
    };

    // Store the seek handler in the store
    usePlayerStore.setState({ seekHandler: handleSeek });
  }, [setCurrentTime]);

  useEffect(() => {
    // If there is no track or the file hasn't changed, don't restart
    if (!currentTrack) return;

    // Clean up previous sound
    if (playerRef.current) {
      playerRef.current.unload();
    }

    // Initialize new sound
    // audio_file now contains the full relative path from public/
    playerRef.current = new Howl({
      src: [currentTrack.audio_file],
      html5: true, // Better for mobile/streaming large files
      autoplay: isPlaying,
      onend: () => {
        // Handle repeat one - restart the same track
        if (repeatMode === 'one' && playerRef.current) {
          playerRef.current.seek(0);
          playerRef.current.play();
          setCurrentTime(0);
        } else {
          // Auto-play next track in queue
          playNext();
        }
      }
    });

    return () => {
      playerRef.current?.unload();
    };
  }, [currentTrack, playNext, repeatMode, setCurrentTime]);

  // Sync play/pause state
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying]);

  // Update current time while playing
  useEffect(() => {
    const updateTime = () => {
      if (playerRef.current && isPlaying) {
        const seek = playerRef.current.seek();
        if (typeof seek === 'number') {
          setCurrentTime(seek);
        }
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      updateTime();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, setCurrentTime]);
};