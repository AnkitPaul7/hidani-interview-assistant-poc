import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnswerMode,
  ClientMessage,
  InterviewContext,
  LatencyMetrics,
  QuestionType,
  ServerMessage,
  SessionState,
  WS_CONFIG,
} from '@hidani/shared';

export interface DetectedQuestionUI {
  id: string;
  text: string;
  questionType: QuestionType;
  confidence: number;
  detectionMethod: string;
  timestamp: number;
}

export interface TranscriptItem {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface UseSessionReturn {
  sessionState: SessionState;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  transcripts: TranscriptItem[];
  interimTranscript: string;
  activeQuestion: DetectedQuestionUI | null;
  streamingAnswer: string;
  latestMetrics: LatencyMetrics | null;
  statusDetails: string;
  startSession: (context: InterviewContext, simulationMode?: boolean) => void;
  stopSession: () => void;
  updateContext: (context: Partial<InterviewContext>) => void;
  sendAudioChunk: (buffer: ArrayBuffer) => void;
  triggerSimulatedQuestion: (text: string, type?: QuestionType) => void;
  clearHistory: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function useSession(): UseSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<DetectedQuestionUI | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [latestMetrics, setLatestMetrics] = useState<LatencyMetrics | null>(null);
  const [statusDetails, setStatusDetails] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef<InterviewContext>({ resume: '', jd: '', answerMode: 'concise' });
  const simulationModeRef = useRef<boolean>(false);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const sessionStateRef = useRef<SessionState>('idle');
  const reconnectAttemptRef = useRef(0);

  // Keep a ref in sync so socket callbacks never read a stale sessionState
  sessionStateRef.current = sessionState;

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;

        // If connection was lost during an active session, auto-resubmit start packet
        const activeState = sessionStateRef.current;
        if (!isManuallyStoppedRef.current && (activeState === 'listening' || activeState === 'answering' || activeState === 'thinking')) {
          const startMsg: ClientMessage = {
            type: 'session.start',
            payload: {
              resume: contextRef.current.resume,
              jd: contextRef.current.jd,
              answerMode: contextRef.current.answerMode,
              simulationMode: simulationModeRef.current,
            },
          };
          ws.send(JSON.stringify(startMsg));
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg: ServerMessage = JSON.parse(event.data);
            handleServerMessage(msg);
          } catch (err) {
            console.error('[Session] JSON parse error:', err);
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff if not manually closed
        if (!isManuallyStoppedRef.current) {
          const nextAttempt = reconnectAttemptRef.current + 1;
          reconnectAttemptRef.current = nextAttempt;
          setReconnectAttempt(nextAttempt);
          if (nextAttempt <= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            setIsReconnecting(true);
            const backoff = Math.min(
              WS_CONFIG.RECONNECT_BASE_MS * Math.pow(2, nextAttempt - 1),
              WS_CONFIG.RECONNECT_MAX_MS
            );
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoff);
          } else {
            setIsReconnecting(false);
            setSessionState('error');
            setStatusDetails('Connection lost. Please check if the backend server is running.');
          }
        }
      };

      ws.onerror = (err) => {
        console.error('[Session] WebSocket connection error:', err);
      };
    } catch (err) {
      console.error('[Session] Failed to connect WebSocket:', err);
    }
  }, []);

  useEffect(() => {
    // connectWebSocket is stable ([] deps) so this only runs on mount/unmount;
    // previously it re-ran on every state change, closing the socket each time.
    isManuallyStoppedRef.current = false;
    connectWebSocket();

    return () => {
      isManuallyStoppedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const handleServerMessage = (msg: ServerMessage) => {
    switch (msg.type) {
      case 'status':
        setSessionState(msg.payload.state);
        if (msg.payload.details) {
          setStatusDetails(msg.payload.details);
        }
        break;

      case 'transcript':
        if (msg.payload.isFinal) {
          setInterimTranscript('');
          setTranscripts((prev) => [
            ...prev,
            {
              id: `tr_${Date.now()}_${Math.random()}`,
              text: msg.payload.text,
              isFinal: true,
              timestamp: msg.payload.timestamp,
            },
          ]);
        } else {
          setInterimTranscript(msg.payload.text);
        }
        break;

      case 'question.detected':
        setActiveQuestion({
          id: msg.payload.id,
          text: msg.payload.text,
          questionType: msg.payload.questionType,
          confidence: msg.payload.confidence,
          detectionMethod: msg.payload.detectionMethod,
          timestamp: msg.payload.timestamp,
        });
        setStreamingAnswer(''); // Clear previous answer for incoming new answer stream
        break;

      case 'answer.delta':
        setStreamingAnswer((prev) => prev + msg.payload.delta);
        break;

      case 'answer.done':
        setStreamingAnswer(msg.payload.fullAnswer);
        setLatestMetrics(msg.payload.metrics);
        break;

      case 'error':
        console.error('[Session Error]', msg.payload.message);
        setStatusDetails(`Error: ${msg.payload.message}`);
        break;

      default:
        break;
    }
  };

  const startSession = (ctx: InterviewContext, simulation = false) => {
    isManuallyStoppedRef.current = false;
    contextRef.current = ctx;
    simulationModeRef.current = simulation;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }

    const sendStart = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const msg: ClientMessage = {
          type: 'session.start',
          payload: {
            resume: ctx.resume,
            jd: ctx.jd,
            candidateName: ctx.candidateName,
            targetRole: ctx.targetRole,
            answerMode: ctx.answerMode,
            simulationMode: simulation,
          },
        };
        wsRef.current.send(JSON.stringify(msg));
        setSessionState('listening');
        setStatusDetails('Listening to audio stream...');
      }
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendStart();
    } else {
      setTimeout(sendStart, 300);
    }
  };

  const stopSession = () => {
    isManuallyStoppedRef.current = true;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'session.stop' };
      wsRef.current.send(JSON.stringify(msg));
    }
    setSessionState('idle');
    setInterimTranscript('');
    setStatusDetails('Session stopped.');
  };

  const updateContext = (ctx: Partial<InterviewContext>) => {
    contextRef.current = { ...contextRef.current, ...ctx };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = {
        type: 'session.update_context',
        payload: ctx,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const sendAudioChunk = (buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionStateRef.current !== 'idle') {
      wsRef.current.send(buffer);
    }
  };

  const triggerSimulatedQuestion = (text: string, type?: QuestionType) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = {
        type: 'simulation.trigger_question',
        payload: { questionText: text, questionType: type },
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const clearHistory = () => {
    setTranscripts([]);
    setInterimTranscript('');
    setActiveQuestion(null);
    setStreamingAnswer('');
    setLatestMetrics(null);
  };

  return {
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
  };
}
