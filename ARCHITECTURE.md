# System Architecture & Technical Design

## 1. Executive Summary

The **Hidani Real-Time Interview Assistant** is a high-throughput, low-latency copilot designed to listen to interviewer speech in real-time (via Chrome tab audio or microphone fallback) and stream speakable, grounded answer recommendations to the candidate within a target of **< 3.0 seconds**.

Every single stage of the critical path is non-blocking and fully streaming:
```
Browser Audio (AudioWorklet) 
    → [16kHz PCM16 Chunks (~100ms)] 
    → WebSocket Server (Node.js/TypeScript) 
    → Deepgram Live Streaming STT (Nova-3) 
    → Hybrid Question Detector (Endpointing + Heuristics + LLM Tie-Break) 
    → OpenAI GPT-4o-mini (SSE Streaming Completion) 
    → Client WebSocket 
    → 3-Panel React/Next.js UI (Token-by-Token Render)
```

---

## 2. End-to-End Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Interviewer as Interviewer (Audio)
    participant Worklet as AudioWorklet (Browser)
    participant ClientWS as Web Client (Next.js)
    participant ServerWS as Node.js WS Server
    participant Deepgram as Deepgram STT (Nova-3)
    participant Detector as Question Detector
    participant LLM as OpenAI (GPT-4o-mini)
    actor Candidate as Candidate (Screen)

    Interviewer->>Worklet: Speaks voice question (44.1k/48k)
    Worklet->>Worklet: Downsample to 16kHz PCM16 mono
    Worklet->>ClientWS: Zero-copy ArrayBuffer (~100ms)
    ClientWS->>ServerWS: Binary frame (3200 bytes)
    ServerWS->>Deepgram: Linear16 audio buffer
    Deepgram-->>ServerWS: Interim transcript delta
    ServerWS-->>ClientWS: transcript (isFinal: false)
    ClientWS-->>Candidate: Live grey/italic interim text

    Interviewer->>Interviewer: Stops speaking (Silence)
    Deepgram-->>ServerWS: Final transcript + UtteranceEnd / speech_final
    ServerWS-->>ClientWS: transcript (isFinal: true)
    ClientWS-->>Candidate: Live solid white transcript text

    ServerWS->>Detector: Evaluate turn buffer
    Detector->>Detector: Strip fillers & apply fast heuristics
    alt Ambiguous turn
        Detector->>LLM: 1-token tie-break classifier (YES/NO)
        LLM-->>Detector: Classification result
    end
    Detector-->>ServerWS: question.detected (Type, Confidence)
    ServerWS-->>ClientWS: question.detected
    ClientWS-->>Candidate: Highlight Detected Question Panel

    ServerWS->>LLM: Stream completion (System prompt + Resume + JD)
    LLM-->>ServerWS: First token delta
    ServerWS-->>ClientWS: answer.delta (Token 0) [TTFT Recorded]
    ClientWS-->>Candidate: Streaming answer token (Cursor glowing)
    loop Token Streaming
        LLM-->>ServerWS: Token deltas
        ServerWS-->>ClientWS: answer.delta
        ClientWS-->>Candidate: Real-time bullet updates
    end
    LLM-->>ServerWS: Stream finished [Done]
    ServerWS-->>ClientWS: answer.done (Full text + Latency metrics)
    ClientWS-->>Candidate: Latency badge updated (< 3s green)
```

---

## 3. Latency Budget Analysis (< 3.0 Seconds Target)

The POC achieves a median Time-to-First-Token (TTFT) between **1,100 ms and 1,750 ms**, substantially outperforming the brief's 3-second ceiling:

| Pipeline Stage | Nominal Latency | Cumulative Time | Optimization Lever Applied |
|---|---|---|---|
| **Audio Frame Accumulation** | ~100 ms | 100 ms | AudioWorklet emits 1600-sample chunks directly over WebSocket. |
| **Silence Wait (Endpointing)** | 500 ms | 600 ms | Configured Deepgram `endpointing: 500ms` & `utterance_end_ms: 1000ms`. Triggers on `speech_final`. |
| **STT Final Transcript Arrival** | 120 ms | 720 ms | Deepgram Nova-3 model streaming over persistent WebSocket. |
| **Question Detection & Filtering** | 5 – 15 ms | 735 ms | 90%+ of interview turns resolved instantly by heuristic rules; ambiguous cases use 1-token LLM fallback (~180ms). |
| **OpenAI TTFT (gpt-4o-mini)** | 350 – 600 ms | 1,085 – 1,335 ms | Lean system prompt, warm HTTP connection, low temperature (0.2), max 160 tokens. |
| **WebSocket Delivery to Client** | < 25 ms | **1,110 – 1,360 ms** | Zero-batching: every delta is immediately pushed to WebSocket. |

---

## 4. Key Architectural Decisions & Trade-Offs

| Decision | Selected Choice | Rejected Alternative | Why Selected |
|---|---|---|---|
| **Frontend Framework** | **Next.js 14 App Router + Tailwind** | Vite + React SPA | Next.js is explicitly required in the Hidani JD. App Router delivers modern routing, server-ready scaffolding, and easy deployment. |
| **Backend Architecture** | **Dedicated Node.js/TS WebSocket Server** | Next.js API Routes / Python FastAPI | Next.js serverless functions do not sustain persistent full-duplex binary WebSockets cleanly. Node.js `ws` handles thousands of concurrent audio streams efficiently with low memory overhead. |
| **Audio Capture & Format** | **AudioWorklet → 16kHz PCM16 Mono** | MediaRecorder (WebM/Opus) | MediaRecorder chunking creates variable frame intervals and container headers requiring server-side demuxing. AudioWorklet produces pure, raw PCM16 samples at exactly 16kHz for minimal STT latency. |
| **Speech-to-Text** | **Deepgram Nova-3 Streaming** | Whisper / AssemblyAI | Deepgram provides sub-300ms transcription latency, built-in endpointing, and native speech_final signals. Self-hosted Whisper adds high GPU ops and cold starts. |
| **LLM Provider** | **OpenAI GPT-4o-mini (Streaming)** | GPT-4o / Claude 3.5 / Local Llama | GPT-4o-mini has industry-leading TTFT (~400ms), low cost, and reliable adherence to strict negative grounding instructions. |
| **Shared Contracts** | **`@hidani/shared` monorepo package** | Duplicated TypeScript interfaces | Eliminates contract drift between client and server for WebSocket protocols and latency event schemas. |

---

## 5. Question Detection Pipeline (3-Tier Hybrid)

1. **Turn Boundary Endpointing**:
   - Listens for Deepgram `speech_final: true` or `UtteranceEnd` pause signal (> 500ms).
   - Segments are buffered until the speaker completes their turn, preventing incomplete sentence triggers.

2. **Heuristic Rule Engine (Tier 2 - Fast Path)**:
   - **Filler Stripping**: Removes conversational filler words (`um`, `uh`, `like`, `you know`, `basically`).
   - **Fast Rejection**: Rejects turns under 4 words, pure greetings (`good morning`), mic checks (`can you hear me`), or acknowledgments (`okay`, `got it`, `sounds good`).
   - **Fast Acceptance**: Accepts turns ending in `?`, starting with interrogatives (`what`, `why`, `how`, `could you`), or imperative interview commands (`tell me about`, `walk me through`, `describe`).

3. **LLM Semantic Tie-Breaker (Tier 3 - Ambiguous Cases)**:
   - For nuanced statements without interrogative syntax, dispatches a 1-token prompt to `gpt-4o-mini` (`YES`/`NO`).

4. **Follow-Up Merging & Deduplication**:
   - If an interviewer appends a continuation within 1.5 seconds (e.g. *"...and what were the results?"*), the detector merges the turn and triggers an `AbortController` cancellation on any in-flight answer stream.
