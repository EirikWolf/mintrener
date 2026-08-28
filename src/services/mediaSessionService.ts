/**
 * Media Session Service for PWA Lock Screen & Background Control (Steg 3)
 */

interface MediaSessionParams {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

let areActionHandlersRegistered = false;

export function updateMediaSession(params: MediaSessionParams): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    const artwork = params.artworkUrl
      ? [
          { src: params.artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: params.artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      : [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: params.title,
      artist: params.artist,
      album: params.album,
      artwork,
    });

    if (!areActionHandlersRegistered) {
      if (params.onPlay) {
        navigator.mediaSession.setActionHandler('play', params.onPlay);
      }
      if (params.onPause) {
        navigator.mediaSession.setActionHandler('pause', params.onPause);
      }
      if (params.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', params.onNext);
      }
      if (params.onPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', params.onPrevious);
      }
      areActionHandlersRegistered = true;
    }
  } catch (err) {
    console.warn('Kunne ikke oppdatere MediaSession:', err);
  }
}

export function clearMediaSession(): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    navigator.mediaSession.metadata = null;
    if (areActionHandlersRegistered) {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      areActionHandlersRegistered = false;
    }
  } catch (err) {
    console.warn('Kunne ikke nullstille MediaSession:', err);
  }
}
