/** Turns whatever Spotify link an admin pasted into the URL Spotify allows
 * inside an <iframe>, or null when no embeddable form can be worked out
 * (Spotify answers a non-embed URL with "refused to connect"). */
export function spotifyEmbedUrl(raw: string | undefined | null): string | null {
  const input = (raw ?? '').trim();
  if (!input) return null;

  // spotify:episode:<id> style URIs
  const uri = /^spotify:(episode|show|track|playlist|album):([A-Za-z0-9]+)$/.exec(input);
  if (uri) return `https://open.spotify.com/embed/${uri[1]}/${uri[2]}`;

  let u: URL;
  try { u = new URL(input); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'open.spotify.com') {
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs[0] && /^intl-/i.test(segs[0])) segs.shift(); // open.spotify.com/intl-in/episode/…
    if (segs[0] === 'embed' && segs[1] && segs[2]) return `https://open.spotify.com/embed/${segs[1]}/${segs[2]}`;
    if (['episode', 'show', 'track', 'playlist', 'album'].includes(segs[0] ?? '') && segs[1]) {
      return `https://open.spotify.com/embed/${segs[0]}/${segs[1]}`;
    }
    return null;
  }

  // Spotify for Podcasters / Creators pages: …/pod/show/<name>/episodes/<slug>
  if (host.endsWith('.spotify.com') || host === 'spotify.com') {
    if (u.pathname.includes('/embed/')) return `${u.origin}${u.pathname}${u.search}`;
    if (u.pathname.includes('/episodes/')) return `${u.origin}${u.pathname.replace('/episodes/', '/embed/episodes/')}${u.search}`;
  }
  return null;
}
