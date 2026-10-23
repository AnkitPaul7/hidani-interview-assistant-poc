'use client';

import React, { useState } from 'react';
import { Header } from '../components/Header';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { ContextModal } from '../components/ContextModal';
import { TestAudioTrigger } from '../components/TestAudioTrigger';
import { useSession } from '../hooks/useSession';
import { useAudioCapture, AudioSourceType } from '../hooks/useAudioCapture';
import { InterviewContext, QuestionType } from '@hidani/shared';
import { AlertCircle } from 'lucide-react';

const DEFAULT_CONTEXT: InterviewContext = {
  candidateName: 'Ankit Paul',
  targetRole: 'Software Developer – AI & Real-Time Systems',
  answerMode: 'concise',
  resume: `Candidate: Ankit Paul
Experience: 4 Years Full-Stack Software Developer at TachoMind
Core Skills: React.js, Next.js, Node.js, TypeScript, WebSockets, REST APIs, AudioWorklet, Async Streams.
Projects:
• Real-time Collaboration Dashboard: Engineered low-latency WebSocket infrastructure handling live data streams with sub-50ms roundtrip UI updates.
• Voice AI Assistant Integration: Built web audio capture pipeline streaming 16kHz PCM audio to STT services and rendering LLM streaming responses.
• Performance Optimization: Replaced polling with bidirectional WebSockets, reducing server network load by 60% and UI render lag by 45%.`,
  jd: `Role: Software Developer – AI & Real-Time Systems
Company: Hidani Tech
Responsibilities:
• Develop real-time applications using Node.js/TypeScript and React/Next.js.
• Build REST APIs and WebSockets for real-time data streaming.
• Integrate LLM APIs (OpenAI) and streaming speech-to-text services (Deepgram).
• Optimize low-latency pipelines (< 3 seconds end-to-end).
Requirements:
• 2+ years software engineering experience with Node/TS and React/Next.js.
• Hands-on experience with WebSockets, streaming systems, and async workflows.
• Familiarity with Deepgram and OpenAI APIs.`,
};

export default function HomePage() {
  const [context, setContext] = useState<InterviewContext>(DEFAULT_CONTEXT);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  const {
    sessionState,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    transcripts,
    interimTranscript,
    activeQuestion,
    streamingAnswer,
    latestMetrics,
    statusDetails,
    startSession,
    stopSession,
    updateContext,
    sendAudioChunk,
    triggerSimulatedQuestion,
    clearHistory,
  } = useSession();

  const {
    isCapturing,
    audioSource,
    volume,
    error: audioError,
    startCapture,
    stopCapture,
  } = useAudioCapture();

  // Toggle main interview session
  const handleToggleSession = async () => {
    if (sessionState !== 'idle') {
      // Stop session
      stopCapture();
      stopSession();
    } else {
      // Start session
      startSession(context, simulationMode);

      if (!simulationMode) {
        const ok = await startCapture(audioSource, (buffer) => {
          sendAudioChunk(buffer);
        });

        if (!ok) {
          stopSession();
        }
      }
    }
  };

  const handleChangeAudioSource = (source: AudioSourceType) => {
    if (isCapturing) {
      stopCapture();
    }
  };

  const handleSaveContext = (updated: InterviewContext) => {
    setContext(updated);
    updateContext(updated);
  };

  const handleTriggerQuestion = (text: string, type?: QuestionType) => {
    if (sessionState === 'idle') {
      startSession(context, true);
    }
    triggerSimulatedQuestion(text, type);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Application Header */}
      <Header
        sessionState={sessionState}
        statusDetails={statusDetails}
        isConnected={isConnected}
        isCapturing={isCapturing}
        audioSource={audioSource}
        volume={volume}
        simulationMode={simulationMode}
        latestMetrics={latestMetrics}
        onToggleSession={handleToggleSession}
        onChangeAudioSource={handleChangeAudioSource}
        onToggleSimulation={() => setSimulationMode(!simulationMode)}
        onOpenContextModal={() => setIsContextModalOpen(true)}
      />

      {/* Audio Capture or Reconnection Alerts */}
      {(audioError || isReconnecting) && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-3">
          {audioError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{audioError}</span>
            </div>
          )}
          {isReconnecting && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 animate-spin" />
              <span>
                WebSocket connection lost. Attempting auto-reconnect (Attempt {reconnectAttempt}/5)...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main 3-Panel Grid View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[540px]">
          {/* Panel 1: Live Transcript (Deepgram) */}
          <div className="h-full min-h-[460px]">
            <TranscriptPanel
              transcripts={transcripts}
              interimTranscript={interimTranscript}
              isCapturing={isCapturing}
              onClear={clearHistory}
            />
          </div>

          {/* Panel 2: Detected Question */}
          <div className="h-full min-h-[460px]">
            <QuestionPanel
              activeQuestion={activeQuestion}
              isThinking={sessionState === 'thinking'}
            />
          </div>

          {/* Panel 3: Streaming Answer (OpenAI) */}
          <div className="h-full min-h-[460px]">
            <AnswerPanel
              streamingAnswer={streamingAnswer}
              isAnswering={sessionState === 'answering'}
              questionText={activeQuestion?.text}
            />
          </div>
        </div>

        {/* Demo Quick Test Bar */}
        <div className="w-full">
          <TestAudioTrigger
            onTrigger={handleTriggerQuestion}
            disabled={!isConnected}
          />
        </div>
      </main>

      {/* Resume & Job Description Context Modal */}
      <ContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        currentContext={context}
        onSave={handleSaveContext}
      />
    </div>
  );
}
