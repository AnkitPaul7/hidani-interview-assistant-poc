# Hidani Tech POC — Sample Data & Demo Run Guide

This document contains pre-validated test data for recording the **3–5 minute demo video** and evaluating the application end-to-end.

---

## 1. Candidate Resume (Grounded Profile)

```text
Candidate: Ankit Paul
Role: Software Developer (Frontend & Real-Time Systems)
Experience: 4 Years at TachoMind (2022 – Present)
Location: Remote / India

TECHNICAL EXPERTISE:
- Languages: TypeScript, JavaScript (ES2022+), Node.js, Python (working)
- Frontend: React.js, Next.js (App Router), TailwindCSS, Web Audio API, AudioWorklet
- Backend & Real-Time: Node.js, WebSockets (ws), REST APIs, Asynchronous Streams, Event Loop optimization
- AI & Streaming APIs: Deepgram Live Streaming STT, OpenAI (GPT-4o-mini streaming completions), Prompt Engineering
- Tools & DevOps: Git/GitHub, Docker, Linux, Postman

KEY PROJECTS AT TACHOMIND:
1. Real-Time Telemetry & Collaboration Dashboard:
   - Built full-duplex WebSocket architecture streaming live device metrics and chat messages with sub-50ms UI updates.
   - Replaced HTTP polling with binary-framed WebSocket streams, cutting server bandwidth consumption by 62%.
   - Implemented resilient client auto-reconnect with exponential backoff and message deduplication.

2. Voice AI Assistant Streaming Pipeline:
   - Designed browser audio capture leveraging AudioWorklet to downsample 48kHz audio to 16kHz PCM16 mono in real time.
   - Piped audio frames over WebSockets into streaming STT services and rendered streaming LLM answers token-by-token.
   - Solved UI thread jitter using debounced state updates and zero-copy ArrayBuffer transfers.
```

---

## 2. Job Description (Target Role)

```text
Role: Software Developer – AI & Real-Time Systems
Company: Hidani Tech
Employment: Full-Time | Remote

ABOUT THE ROLE:
Hidani Tech is building next-generation platforms that assist candidates and professionals during live virtual meetings.
The role requires building real-time streaming systems, integrating voice STT and LLM APIs, and shipping responsive web interfaces.

KEY RESPONSIBILITIES:
- Develop real-time applications using Node.js/TypeScript and React/Next.js.
- Build REST APIs and WebSockets for low-latency bidirectional communication and data streaming.
- Integrate streaming Speech-to-Text services (Deepgram) and LLM APIs (OpenAI).
- Design robust prompt engineering workflows with strict grounding.
- Optimize real-time pipelines to achieve sub-3-second end-to-end latency.

REQUIREMENTS:
- 2+ years software engineering experience.
- Proficiency in Node.js/TypeScript and React/Next.js.
- Understanding of WebSockets, asynchronous streams, and event loops.
- Familiarity with Deepgram and OpenAI APIs.
```

---

## 3. 6 Standard Test Questions (For Live Demo Video)

| # | Question Category | Interviewer Voice Prompt | Expected POC Behavior |
|---|---|---|---|
| **1** | **Profile / Intro** | *"Tell me about yourself and your experience with real-time web applications."* | Grounded in TachoMind resume (React/Next.js/Node/WS). 3 concise bullets. |
| **2** | **Role Alignment** | *"Why do you want to join Hidani Tech for this AI & Real-Time Systems role?"* | Bridges candidate's WebSocket/Audio background with Hidani's AI streaming stack. |
| **3** | **Technical (JD)** | *"What are the key architectural trade-offs between WebSockets and HTTP polling for real-time data streaming?"* | Contrasts persistent full-duplex TCP framing vs HTTP overhead, citing low-latency benefits. |
| **4** | **Behavioral (STAR)** | *"Describe a situation where you faced severe latency or outage in production and how you handled it."* | Formatted in compressed STAR: Situation (telemetry lag), Action (binary frames), Result (68% latency cut). |
| **5** | **Follow-up Merge** | *"...and how did you verify the latency metrics and prevent regressions under peak load?"* | Cancels previous in-flight stream, merges follow-up, answers with profiling & load-testing context. |
| **6** | **Filler / Filter Test** | *"Can you hear me alright? Okay great, thanks a lot, let’s get started."* | **Ignored by Question Detector.** No answer generated. Logged as rejected small talk. |

---

## 4. Suggested Demo Video Script (3–5 min)

- **0:00 – 0:30**: Introduction — Overview of Hidani Tech Copilot, 3-panel UI layout (Transcript, Question, Answer), and Context form.
- **0:30 – 1:15**: Press **Start Session** (Tab audio / Mic). Speak or click Question 6 (Small talk). Point out that small talk is filtered out. Then trigger Question 1 (*"Tell me about yourself"*). Show interim vs final transcript and token-by-token answer.
- **1:15 – 2:00**: Trigger Question 2 (*"Why this role?"*). Highlight grounding in the Job Description.
- **2:00 – 2:45**: Trigger Question 3 (*"WebSockets vs HTTP Polling"*). Show technical question classification badge and speakable bullet points.
- **2:45 – 3:30**: Trigger Question 4 (*"Behavioral outage"*). Point out STAR structure (Situation, Action, Result) and word count cap (~70 words). Trigger follow-up to show merge.
- **3:30 – 4:15**: Open the **Latency Badge**: walk through measured TTFT (< 1.5s), silence endpointing, and total pipeline duration. Demonstrate resilience by stopping/restarting or showing auto-reconnect.
- **4:15 – 4:45**: Quick code tour: clean folder structure (`packages/shared`, `apps/server`, `apps/web`), AudioWorklet downsampler, and 3-layer detector.
