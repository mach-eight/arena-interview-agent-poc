"use client";

import { useCallback, useRef, useState } from "react";
import type { KokoroTTS } from "kokoro-js";

type TtsStatus = "idle" | "loading" | "ready" | "speaking" | "error";

function detectWebGpuSupport(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function useKokoroTTS() {
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>("idle");
  const [webGpuSupported] = useState<boolean>(detectWebGpuSupport);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ttsInstanceRef = useRef<KokoroTTS | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const cancelTokenRef = useRef(0);

  const stopCurrentAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      currentSourceRef.current = null;
    }
  }, []);

  const initializeTts = useCallback(async (): Promise<KokoroTTS> => {
    if (ttsInstanceRef.current) return ttsInstanceRef.current;

    setTtsStatus("loading");
    setErrorMessage(null);

    const { KokoroTTS } = await import("kokoro-js");

    const dtype = webGpuSupported ? "fp32" : "q8";
    const device = webGpuSupported ? "webgpu" : "wasm";

    const instance = await KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      { dtype, device }
    );

    ttsInstanceRef.current = instance;
    setTtsStatus("ready");
    return instance;
  }, [webGpuSupported]);

  const playSingle = useCallback(
    async (text: string, token: number): Promise<void> => {
      let instance: KokoroTTS;
      try {
        instance = await initializeTts();
      } catch (error) {
        setTtsStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load TTS model"
        );
        return;
      }

      if (token !== cancelTokenRef.current) return;

      try {
        const audio = await instance.generate(text, {
          voice: "af_heart",
          speed: 1.0,
        });

        if (token !== cancelTokenRef.current) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;
        const audioBuffer = await audioContext.decodeAudioData(audio.toWav());

        if (token !== cancelTokenRef.current) return;

        await new Promise<void>((resolve) => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.onended = () => {
            if (currentSourceRef.current === source) {
              currentSourceRef.current = null;
            }
            resolve();
          };
          currentSourceRef.current = source;
          source.start();
        });
      } catch (error) {
        setTtsStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to synthesize audio"
        );
      }
    },
    [initializeTts]
  );

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setTtsStatus("speaking");

    const token = cancelTokenRef.current;
    while (queueRef.current.length > 0 && token === cancelTokenRef.current) {
      const text = queueRef.current.shift()!;
      await playSingle(text, token);
    }

    isProcessingRef.current = false;
    if (ttsInstanceRef.current && token === cancelTokenRef.current) {
      setTtsStatus("ready");
    }
  }, [playSingle]);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      queueRef.current.push(text);
      processQueue();
    },
    [processQueue]
  );

  const cancel = useCallback(() => {
    cancelTokenRef.current++;
    queueRef.current = [];
    isProcessingRef.current = false;
    stopCurrentAudio();
    if (ttsInstanceRef.current) {
      setTtsStatus("ready");
    }
  }, [stopCurrentAudio]);

  return { speak, cancel, ttsStatus, webGpuSupported, errorMessage };
}
