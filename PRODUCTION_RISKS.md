# Production Risks Analysis — Hidani Real-Time Interview Assistant

> **Deliverable Requirement:** Maximum 300 words answering: *"What are the top 3 risks of taking this POC to production, and how would you address them?"*

---

### 1. External Streaming Latency & Provider Degradation
**Risk:** Three external streaming hops (Audio WebSocket, Deepgram STT, OpenAI completions) sit on the critical path. Provider p99 latency spikes, socket jitter, or rate-limiting break the sub-3-second conversational SLA.
**Mitigation:**
- Implement active dual-provider fallback behind unified streaming adapters (e.g., Deepgram fallback to AssemblyAI/Whisper; OpenAI fallback to Groq Llama-3.3 for ultra-low TTFT).
- Deploy Node.js WebSocket edge clusters closer to users with regional sticky routing.
- Set aggressive per-stage timeouts (e.g., abort and retry if TTFT > 2.0s) and alert on p95 latency breaches.

### 2. Misclassification & Question Detection Inaccuracy
**Risk:** Without real-time speaker diarization, the detector cannot distinguish between the interviewer and candidate, risking spurious answers to the candidate’s own speech, partial fragments, or rhetorical questions.
**Mitigation:**
- Isolate audio channels natively (interviewer via browser tab display media; candidate via microphone) to exclude candidate speech from detection entirely.
- Introduce real-time acoustic speaker diarization.
- Maintain a labelled benchmark dataset of real technical and behavioral interview transcripts to continuously evaluate precision/recall across heuristic and LLM tie-breaker layers.
- Provide a candidate manual override hotkey ("Answer This") in the UI.

### 3. Hallucination, Data Privacy & Ethical Compliance
**Risk:** LLMs can invent ungrounded experience or metrics not on the candidate’s resume. Resumes and live interview audio constitute sensitive PII subject to GDPR/CCPA and wiretapping/consent laws.
**Mitigation:**
- Enforce strict negative grounding prompts combined with post-generation fact-checking that validates claimed numbers against resume vectors.
- Zero-retention data policy: stream audio purely in-memory without persistent disk logging.
- Client-side encryption for session transcripts, explicit consent confirmation before recording, and jurisdiction-specific legal disclaimers.

*(Word count: 288 words)*
