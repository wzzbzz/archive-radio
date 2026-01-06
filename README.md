# Sonic Twist Radio - Archival Radio App

A modern web-based music archive player for exploring and playing organized music collections. Built for the Jackie Puppet Band's music archive, this app provides an elegant interface for browsing releases, playing tracks, and managing playlists.

## Features

### 🎵 Music Management
- **Collections/Channels**: Browse music organized into themed collections (channels)
- **Releases**: Each collection contains numbered releases (albums, episodes, etc.)
- **Track-level playback**: Individual track control with full metadata
- **Queue management**: Play collections in order or shuffle

### 🎧 Player Features
- **Mini & expanded player views**: Compact player that expands for lyrics and full controls
- **Progress scrubbing**: Click or drag to seek through tracks
- **Repeat modes**: Off, repeat all, or repeat one
- **Previous/Next navigation**: Navigate through your queue
- **Promoted tracks**: Star your favorites for quick access

### 📱 Interface
- **Responsive design**: Clean, mobile-friendly interface
- **Album artwork**: Display collection and release cover images
- **Dark theme**: Easy on the eyes with a custom color scheme
- **Smooth animations**: Powered by Framer Motion

## How It Works

### Data Structure
The app uses a file-based archive system organized as:
```
public/archives/
  └── [collection-id]/
      ├── manifest.json (collection metadata & release list)
      ├── tracks.json (track metadata)
      └── audio/
          └── [track-files].mp3
```

### Key Components

**Collections (Channels)**
- Virtual music channels grouping related releases
- Each has a name, color, description, and release type
- Examples: "Demo Sessions", "Album Tracks", etc.

**Releases**
- Numbered collections within a channel (e.g., "Demo 1", "Demo 2")
- Contain metadata: release date, track count, cover art
- Tracks reference their first appearance release

**Tracks**
- Individual songs with full metadata
- Include: title, duration, artist, lyrics, date written
- Reference their parent collection and release

### State Management

Uses Zustand for global state including:
- Current track & playback status
- Queue management with context (global, collection, release)
- Collections, releases, and track data
- Promoted tracks set
- Player UI state (expanded/collapsed)

### Audio Playback
- Uses Howler.js for robust cross-browser audio
- Custom `useAudio` hook manages playback lifecycle
- `useMediaSession` hook integrates with OS media controls
- Automatic track progression through queue

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **Howler.js** - Audio playback
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd archival-radio
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to any static hosting service.

## Configuration

### Adding Collections

1. Create a new folder in `public/archives/[collection-id]/`
2. Add a `manifest.json` with collection metadata and releases
3. Add a `tracks.json` with track metadata
4. Place audio files in `public/archives/[collection-id]/audio/`

The app will automatically discover and load new collections.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

Private project for Jackie Puppet Band archive.
