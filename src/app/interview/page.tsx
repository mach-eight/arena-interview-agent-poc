"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useKokoroTTS } from "@/hooks/useKokoroTTS";

export default function InterviewPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const spokenIds = useRef<Set<string>>(new Set());
  const streamCursorRef = useRef<{ messageId: string; charIndex: number } | null>(null);
  const lastAssistantIdRef = useRef<string | null>(null);
  const { speak, cancel, ttsStatus, webGpuSupported, errorMessage } =
    useKokoroTTS();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTranscripts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasStarted.current && status === "ready") {
      hasStarted.current = true;
      sendMessage({ text: "Start the interview" });
    }
  }, [status, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isMuted) return;

    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    if (!lastMessage) return;

    const text =
      lastMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";

    if (!text) return;

    if (lastMessage.id !== lastAssistantIdRef.current) {
      cancel();
      lastAssistantIdRef.current = lastMessage.id;
      streamCursorRef.current = { messageId: lastMessage.id, charIndex: 0 };
    }

    const cursor = streamCursorRef.current!;
    const unspoken = text.slice(cursor.charIndex);
    if (!unspoken) return;

    if (status === "streaming") {
      const sentenceRegex = /[^.!?\n]+[.!?\n]+\s*/g;
      let match;
      let lastIndex = 0;

      while ((match = sentenceRegex.exec(unspoken)) !== null) {
        const sentence = match[0].trim();
        if (sentence) speak(sentence);
        lastIndex = sentenceRegex.lastIndex;
      }

      cursor.charIndex += lastIndex;
    } else if (status === "ready" && !spokenIds.current.has(lastMessage.id)) {
      const remaining = unspoken.trim();
      if (remaining) speak(remaining);
      cursor.charIndex = text.length;
      spokenIds.current.add(lastMessage.id);
    }
  }, [messages, status, isMuted, speak, cancel]);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
    if (!isMuted) cancel();
  };
  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const windowWithWebkit = window as Window & {
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const SpeechRecognitionClass =
      window.SpeechRecognition ?? windowWithWebkit.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let accumulated = "";

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          accumulated += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      const transcript = accumulated.trim();
      if (transcript && status === "ready") {
        voiceTranscripts.current.add(transcript);
        sendMessage({ text: transcript });
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <header className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Interview Agent</h1>
          <p className="text-sm text-gray-500">Technical Interview Session</p>
        </div>
        <button
          onClick={handleMuteToggle}
          className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-100"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇 Muted" : "🔊 Speaking"}
        </button>
      </header>

      {ttsStatus === "loading" && (
        <div className="px-4 py-2 text-sm text-gray-500">
          ⏳ Loading Kokoro model...
        </div>
      )}

      {!webGpuSupported && ttsStatus !== "idle" && (
        <div className="px-4 py-2 text-sm text-amber-600">
          ⚠️ WebGPU not supported — using slower WASM fallback
        </div>
      )}

      {ttsStatus === "error" && errorMessage && (
        <div className="px-4 py-2 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => {
            const text =
              m.parts
                ?.filter(
                  (p): p is { type: "text"; text: string } => p.type === "text"
                )
                .map((p) => p.text)
                .join("") ?? "";

            if (!text) return null;

            const isVoiceMessage =
              m.role === "user" && voiceTranscripts.current.has(text);

            return (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {isVoiceMessage ? `🎤 Voice message: ${text}` : text}
                  </p>
                </div>
              </div>
            );
          })}

        {status === "streaming" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-400">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={status !== "ready"}
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={status !== "ready"}
          className={`px-4 py-2 rounded-lg disabled:opacity-50 border ${
            isRecording
              ? "bg-red-500 text-white border-red-500 animate-pulse"
              : "border-gray-300 hover:bg-gray-100"
          }`}
          title={isRecording ? "Stop recording" : "Speak your answer"}
        >
          {isRecording ? "⏹" : "🎤"}
        </button>
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
