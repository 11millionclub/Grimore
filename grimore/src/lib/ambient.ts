import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Background sounds for reading sessions. expo-audio is a native module, so
 * an app build made before it was added does not have it: there the music
 * option is hidden instead of crashing. The web always has it.
 */
type ExpoAudio = typeof import('expo-audio');
type Player = ReturnType<ExpoAudio['createAudioPlayer']>;

let audio: ExpoAudio | null = null;
if (Platform.OS === 'web' || requireOptionalNativeModule('ExpoAudio')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  audio = require('expo-audio') as ExpoAudio;
}

export const musicAvailable = !!audio;

/** Generated loops (no samples, no licences): rain, a fireplace and a soft pad. */
export const TRACKS = [
  { id: 'rain', label: 'Rain', source: require('@/assets/audio/rain.m4a') as number },
  { id: 'fireplace', label: 'Fireplace', source: require('@/assets/audio/fireplace.m4a') as number },
  { id: 'pad', label: 'Soft music', source: require('@/assets/audio/pad.m4a') as number },
] as const;
export type TrackId = (typeof TRACKS)[number]['id'];

let player: Player | null = null;
let modeSet = false;

export function playAmbient(id: TrackId, volume = 0.6) {
  if (!audio) return;
  stopAmbient();
  if (!modeSet) {
    modeSet = true;
    // Keep playing when the phone is on silent or the screen locks.
    void audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  const track = TRACKS.find((t) => t.id === id) ?? TRACKS[0];
  player = audio.createAudioPlayer(track.source);
  player.loop = true;
  player.volume = volume;
  player.play();
}

export function setAmbientVolume(v: number) {
  if (player) player.volume = Math.max(0, Math.min(1, v));
}

export function pauseAmbient() {
  player?.pause();
}

export function resumeAmbient() {
  player?.play();
}

export function stopAmbient() {
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    // Already released.
  }
  player = null;
}
