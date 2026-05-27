# AI Integration - Complete Interview Preparation

This document covers all probable interview questions related to the Google Gemini Flash AI integration, prompt engineering, and fault tolerance.

---

## 1. System Integration & Asynchronous Processing
**Question: How exactly is the Google Gemini API integrated into the Collixa backend, and how do you manage the latency of AI requests?**

**Detailed Answer:**
LLM API calls can take anywhere from 1 to 10 seconds, which is too slow for a standard HTTP request lifecycle. We treat the AI as an external asynchronous service.
1. When an Intent is created, the Express controller saves it to PostgreSQL and immediately returns a `201 Created` response to the user.
2. The controller then pushes a "matching job" onto a background queue (e.g., using Redis and BullMQ).
3. A background worker picks up the job, fetches the Intent data and a pool of potential candidate Users from the database.
4. The worker formats the prompt and calls the Gemini API via the `@google/genai` SDK.
5. Upon receiving the response, the worker parses it, saves the matches to the database, and emits a Socket.io event to the frontend to notify the user that matches are ready.

**Cross-Questions:**
- *Interviewer:* "What if the background worker crashes while waiting for the Gemini API response?"
  - *Response:* "Job queues like BullMQ handle this via lock timeouts. If the worker crashes, the lock on the job expires, and the queue automatically returns the job to the pool so another worker can retry the AI call."

---

## 2. Prompt Engineering for Structured Data
**Question: LLMs are designed to generate free-form text. How do you force Gemini to return structured, predictable data that your database can understand?**

**Detailed Answer:**
We use several strategies to guarantee structure:
- **System Instructions:** We use a strict system prompt dictating the persona and the exact rules (e.g., "You are a matching engine. You must ONLY respond with valid JSON. Do not include markdown formatting or explanations.").
- **Few-Shot Prompting:** We include an exact example of the desired JSON output within the prompt.
- **Structured Outputs (Native Feature):** We use Gemini's `response_mime_type: "application/json"` configuration. We also pass a strict JSON Schema definition in the API request, which forces the model's generation process to adhere exclusively to our defined schema.
- **Backend Validation:** We never trust the AI. Before saving the response to the database, we run the JSON string through `JSON.parse()` and validate it against a schema validator like Zod.

**Cross-Questions:**
- *Interviewer:* "If the AI returns invalid JSON despite your instructions, how does your system handle it?"
  - *Response:* "The `JSON.parse` or Zod validation will throw an error. The background worker catches this error and triggers a retry. If it fails consecutively (e.g., 3 times), we mark the job as failed and alert the user, potentially falling back to standard SQL search."

---

## 3. Handling API Limits and Failures
**Question: Google Gemini has rate limits and can experience downtime. How do you ensure Collixa remains functional if the AI goes down?**

**Detailed Answer:**
We implement the Circuit Breaker pattern and graceful degradation.
- **Rate Limiting (429 Errors):** If we hit a rate limit, the API returns a 429 status. Our Axios/SDK wrapper catches this and applies an **Exponential Backoff** retry strategy (wait 1s, then 2s, then 4s) before giving up.
- **Downtime (500 Errors):** If the API is completely down, we catch the error and execute a fallback mechanism. Instead of AI matching, we run a traditional PostgreSQL full-text search query (e.g., matching the Intent's tags directly against Users' listed skills). This ensures the user still receives collaborator suggestions, even if they are less nuanced.

**Cross-Questions:**
- *Interviewer:* "How do you monitor the health of the AI integration?"
  - *Response:* "We log the duration, success rate, and error codes of all Gemini API calls using a monitoring tool like Sentry or Datadog. We set up alerts to notify the engineering team if the failure rate spikes above a certain threshold."

---

## 4. Context Windows and Token Limits
**Question: An LLM has a strict limit on how much data it can process at once (Context Window). How do you handle matching an Intent if you have 100,000 users in your database?**

**Detailed Answer:**
We cannot pass the entire user database into the prompt; it would exceed token limits and cost a fortune. We use a funnel approach:
1. **Pre-filtering (Database Level):** We use PostgreSQL to aggressively filter the 100,000 users down to a candidate pool of 50-100 users. We do this using standard SQL matching on hard criteria (e.g., active status, specific required skills, budget range).
2. **AI Ranking (LLM Level):** We take those 50-100 candidate profiles, serialize them into a compact format (like JSON), and inject them into the Gemini prompt along with the Intent description. The AI's job is to read the nuanced descriptions and return the top 5 most highly synergistic matches.

**Cross-Questions:**
- *Interviewer:* "What if the pre-filtered pool of 100 users still exceeds the token limit?"
  - *Response:* "We would chunk the data. We send chunks of 20 users to the API in parallel requests, asking it to score each user. We then aggregate the scores on the backend and sort them to find the top matches."
