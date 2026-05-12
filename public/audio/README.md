# public/audio/

Static audio assets bundled with the app.

## `call-end.ogg` (manual asset — to be added)

Played by `components/counsel/CallScreen.tsx` at the 10-minute voice-call
hard cap. Specs:

- Format: **OGG Vorbis** (broad browser support, no licensing concerns).
  If you'd rather ship MP3, update the path in
  `CallScreen.tsx`'s `playEndChime()` helper.
- Length: **400–800ms**.
- Volume: moderate — the player already scales to `0.6`.
- Sound: a soft chime / single bell. Not jarring.

License-free sources:
- [freesound.org](https://freesound.org) (filter by CC0 license).
- [pixabay sfx](https://pixabay.com/sound-effects/).

The chime is decorative — `playEndChime()` swallows errors silently, so
the absence of this file does not break the call-end flow. The user
will simply not hear the chime at the 10-minute mark.
