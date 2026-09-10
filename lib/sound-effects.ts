type Note = {
  frequency: number;
  at: number;
  duration: number;
  volume: number;
  type: OscillatorType;
  endFrequency?: number;
};

export function feedbackNotes(success: boolean): Note[] {
  if (!success)
    return [
      {
        frequency: 330,
        endFrequency: 294,
        at: 0,
        duration: 0.13,
        volume: 0.07,
        type: 'sine',
      },
      {
        frequency: 262,
        endFrequency: 196,
        at: 0.13,
        duration: 0.2,
        volume: 0.07,
        type: 'sine',
      },
    ];
  // A rising fanfare, a full major chord, then a sparkling high note.
  const melody = [523.25, 659.25, 783.99, 1046.5];
  return [
    ...melody.map(
      (frequency, index): Note => ({
        frequency,
        at: index * 0.13,
        duration: 0.23,
        volume: 0.085,
        type: 'triangle',
      }),
    ),
    ...[523.25, 659.25, 783.99, 1046.5].map(
      (frequency): Note => ({
        frequency,
        at: 0.58,
        duration: 0.62,
        volume: 0.035,
        type: 'triangle',
      }),
    ),
    {
      frequency: 1567.98,
      at: 0.81,
      duration: 0.22,
      volume: 0.03,
      type: 'sine',
    },
    { frequency: 2093, at: 0.94, duration: 0.3, volume: 0.025, type: 'sine' },
  ];
}
