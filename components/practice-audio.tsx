'use client';

import { useEffect, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { speechText } from '@/lib/speech';
import { feedbackNotes } from '@/lib/sound-effects';
import { yansuVoiceClip } from '@/lib/yansu-voice';

export function ReadAloud({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        window.speechSynthesis?.cancel();
        utteranceRef.current = null;
      }
    },
    [],
  );

  function toggleSpeech() {
    if (
      !('speechSynthesis' in window) ||
      !('SpeechSynthesisUtterance' in window)
    ) {
      setMessage('このブラウザでは読み上げを使えないでやんす。');
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      return;
    }
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText(text));
      const japaneseVoices = synth
        .getVoices()
        .filter((voice) => /^ja(?:[-_]|$)/i.test(voice.lang));
      const voice =
        japaneseVoices.find((item) => item.localService) ?? japaneseVoices[0];
      if (voice) utterance.voice = voice;
      // The default Japanese voice also works when getVoices is still loading.
      utterance.lang = 'ja-JP';
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      utterance.volume = 0.8;
      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          setSpeaking(false);
          utteranceRef.current = null;
        }
      };
      utterance.onerror = (event) => {
        if (utteranceRef.current !== utterance) return;
        setSpeaking(false);
        utteranceRef.current = null;
        if (event.error !== 'canceled' && event.error !== 'interrupted')
          setMessage(
            '読み上げができなかったでやんす。日本語の音声や音量を確かめるでやんす。',
          );
      };
      utteranceRef.current = utterance;
      setMessage('');
      setSpeaking(true);
      synth.speak(utterance);
    } catch {
      setSpeaking(false);
      utteranceRef.current = null;
      setMessage('読み上げを始められなかったでやんす。');
    }
  }
  return (
    <div className="read-aloud-wrap">
      <Button
        variant="ghost"
        className="read-aloud-button"
        onClick={toggleSpeech}
        aria-pressed={speaking}
      >
        {speaking ? (
          <Square aria-hidden="true" />
        ) : (
          <Volume2 aria-hidden="true" />
        )}
        {speaking ? '読み上げを止めるでやんす' : '問題を読むでやんす'}
      </Button>
      {message && (
        <output className="audio-message" aria-live="polite">
          {message}
        </output>
      )}
    </div>
  );
}

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const contextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);
  const activeNotes = useRef(new Set<OscillatorNode>());
  const feedbackVoice = useRef<SpeechSynthesisUtterance | null>(null);
  const recordedVoice = useRef<HTMLAudioElement | null>(null);

  function stopNotes() {
    for (const oscillator of activeNotes.current) oscillator.stop();
    activeNotes.current.clear();
  }

  useEffect(
    () => () => {
      enabledRef.current = false;
      recordedVoice.current?.pause();
      window.speechSynthesis?.cancel();
      void contextRef.current?.close().catch(() => {});
    },
    [],
  );

  async function changeEnabled(next: boolean) {
    enabledRef.current = next;
    setEnabled(next);
    setError('');
    if (!next) {
      stopNotes();
      recordedVoice.current?.pause();
      recordedVoice.current = null;
      if (feedbackVoice.current) {
        window.speechSynthesis?.cancel();
        feedbackVoice.current = null;
      }
      void contextRef.current?.suspend().catch(() => {});
      return;
    }
    try {
      const Context =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Context) throw new Error('Web Audio unavailable');
      contextRef.current ??= new Context();
      await contextRef.current.resume();
    } catch {
      enabledRef.current = false;
      setEnabled(false);
      setError('このブラウザでは効果音を使えないでやんす。');
    }
  }

  function play(success: boolean, speak = true) {
    const context = contextRef.current;
    if (!enabledRef.current || !context) return;
    recordedVoice.current?.pause();
    recordedVoice.current = null;
    const clip = speak ? yansuVoiceClip(success) : undefined;
    if (clip) {
      window.speechSynthesis?.cancel();
      const recording = new Audio(clip);
      recording.volume = 0.85;
      recordedVoice.current = recording;
      void recording.play().catch(() => {
        if (recordedVoice.current === recording && enabledRef.current)
          setError(
            'ヤンス君の声が出せないでやんす。もう一度オンにするでやんす。',
          );
      });
    }
    if (
      !clip &&
      speak &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    ) {
      try {
        window.speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance(
          success ? '正解でやんす！' : '外れでやんす！',
        );
        voice.lang = 'ja-JP';
        const japanese = window.speechSynthesis
          .getVoices()
          .filter((item) => /^ja(?:[-_]|$)/i.test(item.lang));
        const selected =
          japanese.find((item) => item.localService) ?? japanese[0];
        if (selected) voice.voice = selected;
        voice.pitch = 1.3;
        voice.rate = 1.05;
        voice.volume = 0.85;
        voice.onend = () => {
          if (feedbackVoice.current === voice) feedbackVoice.current = null;
        };
        voice.onerror = (event) => {
          if (feedbackVoice.current !== voice) return;
          feedbackVoice.current = null;
          if (event.error !== 'canceled' && event.error !== 'interrupted')
            setError(
              'ヤンス君の声が出せないでやんす。端末の日本語音声を確かめるでやんす。',
            );
        };
        feedbackVoice.current = voice;
        window.speechSynthesis.speak(voice);
      } catch {
        setError('ヤンス君の声が出せないでやんす。');
      }
    }
    void context
      .resume()
      .then(() => {
        if (!enabledRef.current) return;
        stopNotes();
        feedbackNotes(success).forEach((note) => {
          const start = context.currentTime + note.at;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = note.type;
          oscillator.frequency.setValueAtTime(note.frequency, start);
          if (note.endFrequency)
            oscillator.frequency.exponentialRampToValueAtTime(
              note.endFrequency,
              start + note.duration,
            );
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(note.volume, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.onended = () => {
            activeNotes.current.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(start);
          activeNotes.current.add(oscillator);
          oscillator.stop(start + note.duration + 0.01);
        });
      })
      .catch(() => {
        enabledRef.current = false;
        setEnabled(false);
        setError('効果音が止まったでやんす。もう一度オンにするでやんす。');
      });
  }

  return { enabled, error, changeEnabled, play };
}
