import correctVoice from '../assets/yansu-voice-correct.mp3?url';
import wrongVoice from '../assets/yansu-voice-wrong.mp3?url';

// Required assets: a missing recording must fail the build instead of silently
// changing Yansu's voice to the device's speech synthesizer.
export function yansuVoiceClip(success: boolean): string {
  return success ? correctVoice : wrongVoice;
}
