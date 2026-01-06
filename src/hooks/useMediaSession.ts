import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

export const useMediaSession = () => {
  const { currentTrack, currentRelease, togglePlay } = usePlayerStore();

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || "Sonic Twist Archives",
        album: currentRelease ? `${currentRelease.release_type} #${currentRelease.release_number}` : undefined,
        artwork: [
          { src: currentRelease?.release_image || '/images/default-cover.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Map lock-screen buttons to your store actions
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      // We can add 'nexttrack' and 'previoustrack' once we have a queue logic
    }
  }, [currentTrack, currentRelease, togglePlay]);
};