import { create } from 'zustand';

// Track from the track registry
export interface Track {
  id: string;
  title: string;
  artist: string;
  date_written: string;
  lyrics: string;
  audio_file: string;
  track_image: string | null;
  duration: number;
  collection_id: string;
  first_appearance: string;
}

// Collection metadata (also referred to as "Channels")
export interface Collection {
  id: string;
  name: string;
  artist: string;
  releaseType: string;
  folderPath: string;
  color: string;
  description: string;
  active: boolean;
  isVirtual?: boolean; // For dynamic channels like "Promoted"
}

// Release metadata from manifest
export interface Release {
  release_number: number;
  release_type: string;
  release_date: string | null;
  release_image: string | null;
  track_count: number;
  total_duration: number;
  data_file: string;
}

// Release with full track data
export interface ReleaseWithTracks extends Release {
  collection_id: string;
  collection_name: string;
  track_ids: string[];
}

// Store state
interface PlayerState {
  // Data
  collections: Collection[];
  tracks: Record<string, Track>;
  latestRelease: ReleaseWithTracks | null;
  
  // Player state
  currentTrack: Track | null;
  currentRelease: Release | null;
  isExpanded: boolean;
  isPlaying: boolean;
  currentTime: number; // Current playback position in seconds
  seekHandler: ((time: number) => void) | null; // Function to seek in audio
  repeatMode: 'off' | 'one' | 'all'; // Repeat mode
  
  // Queue state
  queue: string[]; // Array of track IDs
  currentQueueIndex: number;
  queueMode: 'global' | 'collection' | 'release' | null;
  queueContext: string | null; // collection_id or release key
  
  // Promoted tracks
  promotedTracks: Set<string>; // Set of promoted track IDs
  
  // Actions
  loadCollections: () => Promise<void>;
  loadTracks: () => Promise<void>;
  loadLatestRelease: () => Promise<void>;
  playTrack: (trackId: string, release?: Release) => void;
  setExpanded: (val: boolean) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (trackIds: string[], mode: 'global' | 'collection' | 'release', context?: string) => void;
  setCurrentTime: (time: number) => void;
  seekTo: (time: number) => void;
  togglePromote: (trackId: string) => void;
  isPromoted: (trackId: string) => boolean;
  cycleRepeatMode: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  collections: [],
  tracks: {},
  latestRelease: null,
  currentTrack: null,
  currentRelease: null,
  isExpanded: false,
  isPlaying: false,
  currentTime: 0,
  seekHandler: null,
  repeatMode: 'off',
  queue: [],
  currentQueueIndex: -1,
  queueMode: null,
  queueContext: null,
  promotedTracks: new Set(),

  // Load collections from collections.json
  loadCollections: async () => {
    try {
      // this is where we put the API endpoint
      const response = await fetch('archives/collections.json');
      const data = await response.json();
      
      // Add virtual "Promoted" channel
      const promotedChannel: Collection = {
        id: 'promoted',
        name: 'Promoted',
        artist: 'Jackie Puppet Band',
        releaseType: 'Track',
        folderPath: '',
        color: '#fbbf24', // Amber/yellow color
        description: 'Your promoted tracks',
        active: true,
        isVirtual: true
      };
      
      set({ collections: [promotedChannel, ...data.collections] });
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  },

  // Load track registry from tracks.json
  loadTracks: async () => {
    try {
      const response = await fetch('archives/tracks.json');
      const data = await response.json();
      set({ tracks: data.tracks });
    } catch (error) {
      console.error('Failed to load tracks:', error);
    }
  },

  // Load latest release across all collections
  loadLatestRelease: async () => {
    try {
      const { collections, tracks } = get();
      
      let latestRelease: ReleaseWithTracks | null = null;
      let latestDate = '';
      
      // Check each collection's manifest
      for (const collection of collections) {
        
        if (collection.isVirtual)
          continue;

        const manifestResponse = await fetch(`archives/${collection.id}/manifest.json`);
        const manifest = await manifestResponse.json();
        
        // Find the most recent release in this collection
        for (const release of manifest.releases) {
          if (release.release_date && release.release_date > latestDate) {
            latestDate = release.release_date;
            
            // Get track IDs for this release from the track registry
            const releaseTrackIds = Object.keys(tracks).filter(
              trackId => tracks[trackId].collection_id === collection.id &&
                         tracks[trackId].first_appearance === `${release.release_type} ${release.release_number}`
            );
            
            latestRelease = {
              ...release,
              collection_id: collection.id,
              collection_name: collection.name,
              track_ids: releaseTrackIds
            };
          }
        }
      }
      
      set({ latestRelease });
    } catch (error) {
      console.error('Failed to load latest release:', error);
    }
  },

  // Play a track by ID
  playTrack: (trackId: string, release?: Release) => {
    const { tracks, queue } = get();
    const track = tracks[trackId];
    
    if (track) {
      // Find the track in the current queue
      const indexInQueue = queue.indexOf(trackId);
      
      if (indexInQueue >= 0) {
        // Track is in the queue, just update the index
        set({ 
          currentTrack: track,
          currentRelease: release || null,
          isPlaying: true,
          currentQueueIndex: indexInQueue,
          currentTime: 0
        });
      } else {
        // Track not in queue, create a single-track queue
        set({ 
          currentTrack: track,
          currentRelease: release || null,
          isPlaying: true,
          queue: [trackId],
          currentQueueIndex: 0,
          queueMode: null,
          queueContext: null,
          currentTime: 0
        });
      }
    }
  },

  setExpanded: (val) => set({ isExpanded: val }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // Set up a queue and start playing
  setQueue: (trackIds: string[], mode: 'global' | 'collection' | 'release', context?: string) => {
    set({ 
      queue: trackIds,
      currentQueueIndex: 0,
      queueMode: mode,
      queueContext: context || null
    });
  },

  // Play next track in queue
  playNext: () => {
    const { queue, currentQueueIndex, tracks, repeatMode } = get();
    
    // If repeat one, the audio hook handles it - don't change tracks
    if (repeatMode === 'one') {
      return;
    }
    
    if (queue.length === 0) return;
    
    let nextIndex = currentQueueIndex + 1;
    
    // Loop back to start if at end (only if repeat all)
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // Stop at end if repeat is off
      }
    }
    
    const nextTrackId = queue[nextIndex];
    const nextTrack = tracks[nextTrackId];
    
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        currentQueueIndex: nextIndex,
        isPlaying: true,
        currentTime: 0
      });
    }
  },

  // Play previous track in queue
  playPrevious: () => {
    const { queue, currentQueueIndex, tracks } = get();
    
    if (queue.length === 0) return;
    
    let prevIndex = currentQueueIndex - 1;
    
    // Loop to end if at start
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    
    const prevTrackId = queue[prevIndex];
    const prevTrack = tracks[prevTrackId];
    
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        currentQueueIndex: prevIndex,
        isPlaying: true,
        currentTime: 0
      });
    }
  },

  setCurrentTime: (time: number) => set({ currentTime: time }),

  seekTo: (time: number) => {
    const { seekHandler } = get();
    if (seekHandler) {
      seekHandler(time);
    }
  },

  togglePromote: (trackId: string) => {
    const { promotedTracks } = get();
    const newPromoted = new Set(promotedTracks);
    
    if (newPromoted.has(trackId)) {
      newPromoted.delete(trackId);
    } else {
      newPromoted.add(trackId);
    }
    
    set({ promotedTracks: newPromoted });
  },

  isPromoted: (trackId: string) => {
    const { promotedTracks } = get();
    return promotedTracks.has(trackId);
  },

  cycleRepeatMode: () => {
    const { repeatMode } = get();
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    set({ repeatMode: modes[nextIndex] });
  },
}));
