import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Track from Supabase
export interface Track {
  id: string;
  title: string;
  artist: string | null;
  date_written: string;
  lyrics: string;
  audio_file: string;
  track_image: string | null;
  duration: number;
  collection_id: string;
  first_appearance: string;
  track_order: number | null;
}

// Collection metadata
export interface Collection {
  id: string;
  name: string;
  artist: string;
  release_type: string;
  color: string;
  description: string;
  active: boolean;
  is_virtual?: boolean;
}

// Release metadata
export interface Release {
  id: number;
  release_number: number;
  release_type: string;
  release_date: string | null;
  release_image: string | null;
  track_count: number;
  total_duration: number;
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
  currentTime: number;
  seekHandler: ((time: number) => void) | null;
  repeatMode: 'off' | 'one' | 'all';
  
  // Queue state
  queue: string[];
  currentQueueIndex: number;
  queueMode: 'global' | 'collection' | 'release' | null;
  queueContext: string | null;
  
  // Promoted tracks
  promotedTracks: Set<string>;
  
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

  // Load collections from Supabase
  loadCollections: async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('active', true)
        .order('is_virtual', { ascending: false });
      
      if (error) throw error;
      
      set({ collections: data || [] });
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  },

  // Load all tracks from Supabase
  loadTracks: async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*');
      
      if (error) throw error;
      
      // Convert array to Record<string, Track>
      const tracksRecord: Record<string, Track> = {};
      data?.forEach(track => {
        tracksRecord[track.id] = track;
      });
      
      set({ tracks: tracksRecord });
    } catch (error) {
      console.error('Failed to load tracks:', error);
    }
  },

  // Load latest release from Supabase
  loadLatestRelease: async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          *,
          collection:collections!inner(id, name)
        `)
        .order('release_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      if (!data) return;
      
      // Get tracks for this release
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id')
        .eq('release_id', data.id)
        .order('track_order');
      
      const latestRelease: ReleaseWithTracks = {
        ...data,
        collection_id: data.collection.id,
        collection_name: data.collection.name,
        track_ids: trackData?.map(t => t.id) || []
      };
      
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
      const indexInQueue = queue.indexOf(trackId);
      
      if (indexInQueue >= 0) {
        set({ 
          currentTrack: track,
          currentRelease: release || null,
          isPlaying: true,
          currentQueueIndex: indexInQueue,
          currentTime: 0
        });
      } else {
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

  setQueue: (trackIds: string[], mode: 'global' | 'collection' | 'release', context?: string) => {
    set({ 
      queue: trackIds,
      currentQueueIndex: 0,
      queueMode: mode,
      queueContext: context || null
    });
  },

  playNext: () => {
    const { queue, currentQueueIndex, tracks, repeatMode } = get();
    
    if (repeatMode === 'one') {
      return;
    }
    
    if (queue.length === 0) return;
    
    let nextIndex = currentQueueIndex + 1;
    
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
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

  playPrevious: () => {
    const { queue, currentQueueIndex, tracks } = get();
    
    if (queue.length === 0) return;
    
    let prevIndex = currentQueueIndex - 1;
    
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
