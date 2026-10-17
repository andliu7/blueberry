import { describe, expect, it } from "vitest";
import { spotifyEmbedHeight } from "@/components/ui/spotify-loop";
import { playlistUri, SPOTIFY_PLAYLISTS } from "@/lib/useAmbience";

// The break room's playlists were drawn in the 152px track player, which
// squashed them. Playlists and albums get Spotify's standard 352.
describe("spotifyEmbedHeight", () => {
  it("gives playlists and albums the full player", () => {
    expect(spotifyEmbedHeight(playlistUri(SPOTIFY_PLAYLISTS[0].id))).toBe(352);
    expect(spotifyEmbedHeight("spotify:album:abc")).toBe(352);
  });
  it("keeps a single track compact", () => {
    expect(spotifyEmbedHeight("spotify:track:abc")).toBe(152);
  });
});
