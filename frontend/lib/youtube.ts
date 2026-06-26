/**
 * Extracts a YouTube video id from any of the URL forms a vendor might
 * paste from the YouTube share button or address bar. Returns null when
 * the URL isn't recognizable as YouTube — the caller should hide the
 * "Watch Video" button rather than try to embed an unknown URL.
 *
 * Supported inputs:
 *   - https://www.youtube.com/watch?v=ABC123
 *   - https://youtu.be/ABC123
 *   - https://youtube.com/shorts/ABC123
 *   - https://www.youtube.com/embed/ABC123
 *   - Bare 11-char id ("ABC123abcDE") — fallback for sloppy paste
 *
 * The id format is YouTube's URL-safe base64-ish 11 characters.
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Bare-id paste — accept it.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let parsed: URL;
  try {
    // Allow URLs without a scheme by prefixing https:// — `new URL("youtube.com/...")` throws.
    parsed = new URL(trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0] ?? '';
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    // /watch?v=<id>
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v') ?? '';
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    // /shorts/<id> or /embed/<id> or /v/<id>
    const m = parsed.pathname.match(/^\/(?:shorts|embed|v)\/([\w-]{11})/);
    if (m) return m[1];
  }

  return null;
}

/**
 * Builds the iframe-ready embed URL for a YouTube video. Returns null
 * when the input URL isn't a recognizable YouTube link, so the caller
 * can hide the player entirely instead of rendering an `<iframe src="">`.
 *
 * Options:
 *   - autoplay: start playing as soon as the iframe loads (default true).
 *     The user-gesture-on-click rule means the modal-open click counts
 *     as a gesture, so YouTube respects this without needing mute.
 */
export function youTubeEmbedUrl(
  url: string | null | undefined,
  options: { autoplay?: boolean } = {},
): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  if (options.autoplay !== false) params.set('autoplay', '1');
  // Hide the YouTube logo + related-videos at end (best-effort — YouTube
  // ignores some of these on embedded players, but they don't hurt).
  params.set('rel', '0');
  params.set('modestbranding', '1');
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
