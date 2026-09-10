// Optional prerecorded clips take priority. They are bundled locally, never
// requested from an AI service while a child is using the app.
const clips = import.meta.glob<string>('../assets/yansu-voice-*.{mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
});
export function yansuVoiceClip(success: boolean): string | undefined {
  const name = success ? 'correct' : 'wrong';
  return (
    clips[`../assets/yansu-voice-${name}.mp3`] ??
    clips[`../assets/yansu-voice-${name}.wav`]
  );
}
