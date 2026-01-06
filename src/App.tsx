import { useEffect, useState } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import type { Collection, Release } from './store/usePlayerStore'
import { useAudio } from './hooks/useAudio'
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, ChevronDown, Home, Folder, CircleArrowUp, Repeat, Repeat1 } from 'lucide-react';

function App() {
  const {
    isExpanded,
    setExpanded,
    playTrack,
    currentTrack,
    currentRelease,
    togglePlay,
    isPlaying,
    collections,
    tracks,
    latestRelease,
    loadCollections,
    loadTracks,
    loadLatestRelease,
    setQueue,
    playNext,
    playPrevious,
    currentTime,
    seekTo,
    togglePromote,
    isPromoted,
    repeatMode,
    cycleRepeatMode
  } = usePlayerStore();

  const [currentView, setCurrentView] = useState<'home' | 'collections'>('home');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionReleases, setCollectionReleases] = useState<Release[]>([]);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [expandedReleaseNumber, setExpandedReleaseNumber] = useState<number | null>(null);
  const [releaseTracks, setReleaseTracks] = useState<string[]>([]);
  const [activeReleasePlayMode, setActiveReleasePlayMode] = useState<{ releaseNum: number, mode: 'play' | 'shuffle' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useAudio();

  // Helper function to format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * currentTrack.duration;

    seekTo(newTime);
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle dragging
  const handleDragMove = (e: MouseEvent, progressBarRef: HTMLDivElement) => {
    if (!isDragging || !currentTrack) return;

    const rect = progressBarRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * currentTrack.duration;

    seekTo(newTime);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Set up drag listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const progressBar = document.querySelector('.progress-bar-container') as HTMLDivElement;
      if (progressBar) {
        handleDragMove(e, progressBar);
      }
    };

    const handleUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, currentTrack]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      await loadCollections();
      await loadTracks();
      await loadLatestRelease();
    };
    loadData();
  }, [loadCollections, loadTracks, loadLatestRelease]);

  // Load releases when a collection is selected
  useEffect(() => {
    if (selectedCollectionId) {
      fetch(`archives/${selectedCollectionId}/manifest.json`)
        .then(res => res.json())
        .then(data => setCollectionReleases(data.releases))
        .catch(err => console.error('Failed to load collection releases:', err));
    }
  }, [selectedCollectionId]);

  // Load tracks for an expanded release
  const handleReleaseClick = (release: Release) => {
    if (expandedReleaseNumber === release.release_number) {
      // Collapse if already expanded
      setExpandedReleaseNumber(null);
      setReleaseTracks([]);
    } else {
      // Expand and load tracks
      setExpandedReleaseNumber(release.release_number);

      // Find track IDs for this release
      const trackIds = Object.keys(tracks).filter(
        trackId => tracks[trackId].collection_id === selectedCollectionId &&
          tracks[trackId].first_appearance === `${release.release_type} ${release.release_number}`
      );
      setReleaseTracks(trackIds);
    }
  };

  return (
    <div className="relative h-screen w-full bg-archive-black overflow-hidden font-sans">
      {/* MAIN CONTENT - Scrollable behind trays */}
      <main
        className="h-full overflow-y-auto px-6 pt-6"
        style={{
          paddingBottom: currentTrack ? '160px' : '80px'
        }}
      >
        {currentView === 'home' ? (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-black tracking-tighter italic">SONIC TWIST RADIO</h1>
              <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">by Jackie Puppet Band</p>
              <p className="text-zinc-600 text-xs mt-2">
                {Object.keys(tracks).length} songs in {collections.reduce((total, collection) => {
                  // Count releases for this collection from the tracks
                  const releases = new Set(
                    Object.values(tracks)
                      .filter(track => track.collection_id === collection.id)
                      .map(track => track.first_appearance)
                  );
                  return total + releases.size;
                }, 0)} releases
              </p>
            </header>

            {/* RANDOM TRACK */}
            <section className="mb-10">
              <h2 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Shuffle & Play</h2>
              <button
                onClick={() => {
                  const trackIds = Object.keys(tracks);
                  if (trackIds.length > 0) {
                    // Shuffle the array
                    const shuffled = [...trackIds].sort(() => Math.random() - 0.5);
                    setQueue(shuffled, 'global');
                    // Play first track from shuffled queue
                    playTrack(shuffled[0]);
                  }
                }}
                className="w-full bg-archive-accent/10 border border-archive-accent rounded-xl p-6 hover:bg-archive-accent/20 transition-colors"
              >
                <p className="font-bold text-archive-accent">Shuffle & Play</p>
              </button>
            </section>

            {/* LATEST RELEASE */}
            <section className="mb-10">
              <h2 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Latest Release</h2>
              {latestRelease ? (
                <div
                  className="bg-archive-surface rounded-xl border border-archive-muted p-6 cursor-pointer hover:border-archive-accent transition-colors"
                  onClick={() => {
                    // Get all track IDs from this collection, sorted by release date (oldest first)
                    const collectionTrackIds = latestRelease.track_ids;
                    if (collectionTrackIds.length > 0) {
                      setQueue(collectionTrackIds, 'collection', selectedCollectionId || undefined);
                      playTrack(collectionTrackIds[0]);
                    }
                  }}
                >
                  <div className="flex gap-4 mb-4">
                    <div className="w-24 h-24 bg-archive-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={latestRelease.release_image || 'images/default-cover.png'}
                        alt={`${latestRelease.release_type} ${latestRelease.release_number}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest">{latestRelease.collection_name}</p>
                      <h3 className="text-xl font-bold mt-1">{latestRelease.release_type} {latestRelease.release_number}</h3>
                      <p className="text-zinc-500 text-sm mt-1">{latestRelease.track_count} tracks</p>
                      {latestRelease.release_date && (
                        <p className="text-zinc-600 text-xs mt-1">
                          {new Date(latestRelease.release_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-archive-surface rounded-xl border border-archive-muted p-6">
                  <p className="text-zinc-500 text-sm">Loading...</p>
                </div>
              )}
            </section>

            {/* COLLECTIONS/CHANNELS HORIZONTAL SCROLL */}
            <section className="mb-10">
              <h2 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Browse Channels</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {collections
                  .filter((collection: Collection) => {
                    // Skip virtual collections or count tracks for real collections
                    if (collection.isVirtual && collection.id === 'promoted') {
                      const promotedTracksIds = Array.from(usePlayerStore.getState().promotedTracks);
                      return promotedTracksIds.length > 0;
                    }
                    // Count tracks in this collection
                    const trackCount = Object.values(tracks).filter(
                      track => track.collection_id === collection.id
                    ).length;
                    return trackCount > 0;
                  })
                  .map((collection: Collection) => (
                    <div
                      key={collection.id}
                      className="flex-shrink-0 w-32 h-32 bg-archive-surface rounded-xl border border-archive-muted flex items-center justify-center cursor-pointer hover:border-archive-accent transition-colors"
                      style={{ borderColor: collection.color + '40' }}
                      onClick={() => {
                        setCurrentView('collections');
                        setSelectedCollectionId(collection.id);
                      }}
                    >
                      <p className="text-xs font-bold text-center px-2">{collection.name}</p>
                    </div>
                  ))
                }
              </div>
            </section>
          </>
        ) : (
          /* CHANNELS VIEW */
          selectedCollectionId ? (
            /* INDIVIDUAL CHANNEL VIEW */
            <div className="space-y-6">
              <button
                onClick={() => setSelectedCollectionId(null)}
                className="text-archive-accent text-sm mb-4 flex items-center gap-2"
              >
                ← Back to Channels
              </button>

              {(() => {
                const collection = collections.find(c => c.id === selectedCollectionId);
                if (!collection) return null;

                // Handle virtual "Promoted" channel
                if (collection.isVirtual && collection.id === 'promoted') {
                  const promotedTrackIds = Array.from(usePlayerStore.getState().promotedTracks);
                  const promotedTracksList = promotedTrackIds.map(id => tracks[id]).filter(Boolean);

                  return (
                    <>
                      <header className="mb-8">
                        <h1 className="text-3xl font-black tracking-tighter italic" style={{ color: collection.color }}>
                          {collection.name}
                        </h1>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                            {promotedTracksList.length} promoted tracks
                          </p>
                          {promotedTracksList.length > 0 && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (promotedTrackIds.length > 0) {
                                    setQueue(promotedTrackIds, 'collection', 'promoted');
                                    playTrack(promotedTrackIds[0]);
                                  }
                                }}
                                className="text-xs px-3 py-2 rounded-lg bg-archive-accent/10 border border-archive-accent hover:bg-archive-accent/20 transition-colors text-archive-accent font-medium"
                              >
                                ▶ Play All
                              </button>
                              <button
                                onClick={() => {
                                  if (promotedTrackIds.length > 0) {
                                    const shuffled = [...promotedTrackIds].sort(() => Math.random() - 0.5);
                                    setQueue(shuffled, 'collection', 'promoted');
                                    playTrack(shuffled[0]);
                                  }
                                }}
                                className="text-xs px-3 py-2 rounded-lg bg-archive-accent/10 border border-archive-accent hover:bg-archive-accent/20 transition-colors text-archive-accent font-medium"
                              >
                                🎲 Shuffle
                              </button>
                            </div>
                          )}
                        </div>
                      </header>

                      {promotedTracksList.length === 0 ? (
                        <div className="bg-archive-surface rounded-xl border border-archive-muted p-8 text-center">
                          <CircleArrowUp size={48} className="mx-auto mb-4 text-zinc-600" />
                          <p className="text-zinc-500 text-sm">No promoted tracks yet</p>
                          <p className="text-zinc-600 text-xs mt-2">Tap the promote button while listening to add tracks here</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {promotedTracksList.map((track) => (
                            <button
                              key={track.id}
                              onClick={() => playTrack(track.id)}
                              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-archive-muted/50 transition-colors text-left bg-archive-surface border border-archive-muted"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Play size={14} className="opacity-50 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate">{track.title}</p>
                                  <p className="text-xs text-zinc-500 truncate">
                                    {collections.find(c => c.id === track.collection_id)?.name} - {track.first_appearance}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs opacity-50 flex-shrink-0">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                }

                // Regular channel with releases
                return (
                  <>
                    <header className="mb-8">
                      <h1 className="text-3xl font-black tracking-tighter italic" style={{ color: collection.color }}>
                        {collection.name}
                      </h1>
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                          {collectionReleases.length} {collection.releaseType}s
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Get all track IDs from this collection, sorted by release date (oldest first)
                              const collectionTrackIds = Object.keys(tracks)
                                .filter(trackId => tracks[trackId].collection_id === selectedCollectionId)
                                .sort((a, b) => {
                                  const trackA = tracks[a];
                                  const trackB = tracks[b];
                                  // Find the release for each track
                                  const releaseA = collectionReleases.find(r =>
                                    `${r.release_type} ${r.release_number}` === trackA.first_appearance
                                  );
                                  const releaseB = collectionReleases.find(r =>
                                    `${r.release_type} ${r.release_number}` === trackB.first_appearance
                                  );
                                  // Sort by release date, then by release number
                                  const dateA = releaseA?.release_date || '';
                                  const dateB = releaseB?.release_date || '';
                                  if (dateA !== dateB) {
                                    return dateA.localeCompare(dateB);
                                  }
                                  return (releaseA?.release_number || 0) - (releaseB?.release_number || 0);
                                });

                              if (collectionTrackIds.length > 0) {
                                setQueue(collectionTrackIds, 'collection', selectedCollectionId || undefined);
                                playTrack(collectionTrackIds[0]);
                              }
                            }}
                            className="text-xs px-3 py-2 rounded-lg bg-archive-accent/10 border border-archive-accent hover:bg-archive-accent/20 transition-colors text-archive-accent font-medium"
                          >
                            ▶ Play in Order
                          </button>
                          <button
                            onClick={() => {
                              // Get all track IDs from this collection
                              const collectionTrackIds = Object.keys(tracks).filter(
                                trackId => tracks[trackId].collection_id === selectedCollectionId
                              );
                              if (collectionTrackIds.length > 0) {
                                const shuffled = [...collectionTrackIds].sort(() => Math.random() - 0.5);
                                setQueue(shuffled, 'collection', selectedCollectionId || undefined);
                                playTrack(shuffled[0]);
                              }
                            }}
                            className="text-xs px-3 py-2 rounded-lg bg-archive-accent/10 border border-archive-accent hover:bg-archive-accent/20 transition-colors text-archive-accent font-medium"
                          >
                            🎲 Shuffle
                          </button>
                          <button
                            onClick={() => setSortNewestFirst(!sortNewestFirst)}
                            className="text-xs px-3 py-2 rounded-lg bg-archive-surface border border-archive-muted hover:border-archive-accent transition-colors"
                          >
                            {sortNewestFirst ? '↓ Newest First' : '↑ Oldest First'}
                          </button>
                        </div>
                      </div>
                    </header>

                    <div className="grid gap-4">
                      {collectionReleases
                        .sort((a, b) => {
                          const dateA = a.release_date || '';
                          const dateB = b.release_date || '';
                          return sortNewestFirst
                            ? dateB.localeCompare(dateA)
                            : dateA.localeCompare(dateB);
                        })
                        .map((release) => (
                          <div
                            key={release.release_number}
                            className="bg-archive-surface rounded-xl border border-archive-muted overflow-hidden"
                            style={{ borderColor: collection.color + '20' }}
                          >
                            <div
                              className="p-6 cursor-pointer hover:bg-archive-muted/20 transition-colors"
                              onClick={() => handleReleaseClick(release)}
                            >
                              <div className="flex gap-4 items-start">
                                <div className="w-20 h-20 bg-archive-muted rounded-lg overflow-hidden flex-shrink-0">
                                  <img
                                    src={release.release_image || 'images/default-cover.png'}
                                    alt={`${release.release_type} ${release.release_number}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold">
                                    {release.release_type} {release.release_number}
                                  </h3>
                                  <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                                    <span>{release.track_count} tracks</span>
                                    <span>•</span>
                                    <span>{Math.floor(release.total_duration / 60)} min</span>
                                    {release.release_date && (
                                      <>
                                        <span>•</span>
                                        <span>{new Date(release.release_date).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Play buttons */}
                                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        const trackIds = Object.keys(tracks).filter(
                                          trackId => tracks[trackId].collection_id === selectedCollectionId &&
                                            tracks[trackId].first_appearance === `${release.release_type} ${release.release_number}`
                                        );
                                        if (trackIds.length > 0) {
                                          setActiveReleasePlayMode({ releaseNum: release.release_number, mode: 'play' });
                                          setQueue(trackIds, 'release', `${selectedCollectionId}-${release.release_number}`);
                                          playTrack(trackIds[0], release);
                                        }
                                      }}
                                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${activeReleasePlayMode?.releaseNum === release.release_number && activeReleasePlayMode?.mode === 'play'
                                        ? 'bg-archive-accent text-black border-archive-accent'
                                        : 'bg-archive-accent/10 border-archive-accent text-archive-accent hover:bg-archive-accent/20'
                                        }`}
                                    >
                                      ▶ Play All
                                    </button>
                                    <button
                                      onClick={() => {
                                        const trackIds = Object.keys(tracks).filter(
                                          trackId => tracks[trackId].collection_id === selectedCollectionId &&
                                            tracks[trackId].first_appearance === `${release.release_type} ${release.release_number}`
                                        );
                                        if (trackIds.length > 0) {
                                          setActiveReleasePlayMode({ releaseNum: release.release_number, mode: 'shuffle' });
                                          const shuffled = [...trackIds].sort(() => Math.random() - 0.5);
                                          setQueue(shuffled, 'release', `${selectedCollectionId}-${release.release_number}`);
                                          playTrack(shuffled[0], release);
                                        }
                                      }}
                                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeReleasePlayMode?.releaseNum === release.release_number && activeReleasePlayMode?.mode === 'shuffle'
                                        ? 'bg-archive-accent text-black border-archive-accent'
                                        : 'bg-archive-surface border-archive-muted hover:border-archive-accent'
                                        }`}
                                    >
                                      🎲 Shuffle
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* EXPANDED TRACK LIST */}
                            {expandedReleaseNumber === release.release_number && (
                              <div className="border-t border-archive-muted p-4 space-y-2">
                                {releaseTracks.map((trackId: string) => {
                                  const track = tracks[trackId];
                                  if (!track) return null;
                                  return (
                                    <button
                                      key={trackId}
                                      onClick={() => playTrack(trackId, release)}
                                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-archive-muted/50 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Play size={14} className="opacity-50 flex-shrink-0" />
                                        <p className="font-bold text-sm truncate">{track.title}</p>
                                      </div>
                                      <span className="text-xs opacity-50 flex-shrink-0">
                                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* CHANNELS LIST */
            <div className="space-y-6">
              <header className="mb-8">
                <h1 className="text-3xl font-black tracking-tighter italic">CHANNELS</h1>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Browse All Channels</p>
              </header>

              <div className="space-y-4">
                {collections.map((collection: Collection) => (
                  <div
                    key={collection.id}
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className="bg-archive-surface rounded-xl border border-archive-muted p-6 cursor-pointer hover:border-archive-accent transition-colors"
                    style={{ borderColor: collection.color + '40' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold" style={{ color: collection.color }}>
                          {collection.name}
                        </h3>
                        <p className="text-zinc-500 text-sm mt-2">{collection.description}</p>
                        <div className="flex gap-4 mt-4 text-xs text-zinc-600">
                          <span className="uppercase tracking-wider">{collection.releaseType}s</span>
                          <span>•</span>
                          <span>{collection.artist}</span>
                        </div>
                      </div>
                      <div className="w-20 h-20 rounded-lg flex items-center justify-center text-4xl" style={{ backgroundColor: collection.color + '20' }}>
                        🎵
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      {/* PLAYER TRAY - Only visible when track is loaded */}
      {currentTrack && (
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? 'calc(100vh - 64px)' : '80px',
            bottom: '64px'
          }}
          className="fixed left-0 w-full bg-archive-surface border-t border-archive-muted z-40 overflow-hidden"
        >
          {isExpanded ? (
            /* EXPANDED VIEW */
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-archive-muted">
                <button onClick={() => setExpanded(false)} className="p-2">
                  <ChevronDown size={24} />
                </button>
                <h3 className="text-sm font-bold uppercase tracking-wider">Now Playing</h3>
                <div className="w-10" /> {/* Spacer for balance */}
              </div>

              {/* Album Art and Info - Compact */}
              <div className="px-6 py-6 border-b border-archive-muted">
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-archive-muted rounded-lg shadow-xl overflow-hidden flex-shrink-0">
                    <img
                      src={currentTrack.track_image || currentRelease?.release_image || 'images/default-cover.png'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold leading-tight truncate">{currentTrack.title}</h2>
                    <p className="text-archive-accent text-xs font-medium mt-1 truncate">
                      {collections.find(c => c.id === currentTrack.collection_id)?.name || ''} - {currentTrack.first_appearance}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div
                    className="h-1.5 bg-archive-muted rounded-full cursor-pointer relative group progress-bar-container"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-archive-accent rounded-full relative"
                      style={{ width: `${(currentTime / currentTrack.duration) * 100}%` }}
                    >
                      <div
                        className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                        onMouseDown={handleDragStart}
                      />
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="h-full bg-white/20 rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-xs font-mono mt-1.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(currentTrack.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="px-6 py-4 border-b border-archive-muted">
                <div className="flex items-center justify-between">
                  {/* Repeat */}
                  <button
                    onClick={cycleRepeatMode}
                    className={`p-2 rounded-lg transition-colors ${repeatMode !== 'off' ? 'text-archive-accent' : 'text-zinc-500 hover:text-white'
                      }`}
                  >
                    {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                  </button>

                  {/* Playback controls */}
                  <div className="flex items-center gap-6">
                    <button onClick={playPrevious} className="hover:scale-110 transition-transform">
                      <SkipForward size={28} className="rotate-180" />
                    </button>
                    <button onClick={togglePlay} className="bg-white text-black p-4 rounded-full hover:scale-105 transition-transform">
                      {isPlaying ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} />}
                    </button>
                    <button onClick={playNext} className="hover:scale-110 transition-transform">
                      <SkipForward size={28} />
                    </button>
                  </div>

                  {/* Promote */}
                  <button
                    onClick={() => currentTrack && togglePromote(currentTrack.id)}
                    className={`p-2 rounded-lg transition-colors ${currentTrack && isPromoted(currentTrack.id)
                      ? 'text-archive-accent'
                      : 'text-zinc-500 hover:text-white'
                      }`}
                  >
                    <CircleArrowUp
                      size={20}
                      strokeWidth={currentTrack && isPromoted(currentTrack.id) ? 2.5 : 2}
                    />
                  </button>
                </div>
              </div>

              {/* Lyrics - Now has much more space */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4">Lyrics & Credits</p>
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-zinc-300 mb-6">
                  {currentTrack.lyrics}
                </pre>
                <hr className="border-archive-muted mb-4" />
                <p className="text-zinc-500 text-xs italic">{currentTrack.artist}</p>
                <p className="text-zinc-500 text-xs uppercase tracking-tighter mt-1">{currentTrack.date_written}</p>
              </div>
            </div>
          ) : (
            /* MINI PLAYER */
            <div className="h-20 flex flex-col">
              {/* Progress bar */}
              <div
                className="h-1 bg-archive-muted cursor-pointer relative group progress-bar-container"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-archive-accent relative"
                  style={{ width: `${(currentTime / currentTrack.duration) * 100}%` }}
                >
                  {/* Draggable ball */}
                  <div
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                    onMouseDown={handleDragStart}
                  />
                </div>
                {/* Hover indicator */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="h-full bg-white/20" />
                </div>
              </div>

              {/* Player controls */}
              <div
                onClick={() => setExpanded(true)}
                className="flex-1 flex items-center justify-between px-6 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-archive-muted rounded-md overflow-hidden">
                    <img
                      src={currentTrack.track_image || currentRelease?.release_image || 'images/default-cover.png'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{currentTrack.title}</h4>
                    <p className="text-xs text-zinc-500">
                      {collections.find(c => c.id === currentTrack.collection_id)?.name || ''} - {currentTrack.first_appearance}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {formatTime(currentTime)} / {formatTime(currentTrack.duration)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="hover:scale-110 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="white" />
                    ) : (
                      <Play size={24} fill="white" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playNext();
                    }}
                    className="hover:scale-110 transition-transform"
                  >
                    <SkipForward size={24} fill="white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* BOTTOM NAVIGATION BAR - Always visible */}
      <div className="fixed bottom-0 left-0 w-full h-16 bg-archive-surface border-t border-archive-muted z-50 flex items-center justify-around">
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${currentView === 'home' ? 'text-archive-accent' : 'text-zinc-500'
            }`}
        >
          <Home size={24} />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button
          onClick={() => setCurrentView('collections')}
          className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${currentView === 'collections' ? 'text-archive-accent' : 'text-zinc-500'
            }`}
        >
          <Folder size={24} />
          <span className="text-xs font-medium">Channels</span>
        </button>
      </div>
    </div>
  );
}

export default App;
