# Frontend Technologies - Complete Interview Preparation

This document covers all probable interview questions related to the frontend tech stack (React, Next.js 14, Tailwind, Framer Motion), including detailed cross-questions.

---

## 1. Next.js App Router vs. Traditional React

**Cross-Questions:**
- *Interviewer:* "What is the difference between a Server Component and a Client Component in the App Router?"
  - *Response:* "Server Components run only on the server, have direct access to backend resources (like databases), and their JS is never sent to the client, reducing bundle size. Client Components (`"use client"`) run on both the server (for initial HTML) and the client (hydration), and they can use state, effects, and event listeners."

---

## 2. State Management

**Cross-Questions:**
- *Interviewer:* "If you don't use Redux, how do you handle global state like the current User's profile or Theme?"
  - *Response:* "For the Theme, we use a lightweight Context provider. For the User Profile, we can fetch it securely via a Server Component at the layout level and pass it down, or use a React Context provider wrapped around the application that fetches the user session on mount."

---

## 3. Tailwind CSS

---

## 4. Framer Motion and Performance
**Question: Framer Motion provides great animations, but animations can hurt performance. How do you ensure Collixa remains highly performant?**

**Detailed Answer:**
To maintain 60 FPS during animations, we must avoid triggering browser "Reflows" (layout recalculations) and "Repaints".
We strictly animate properties that can be hardware-accelerated by the GPU, specifically `transform` (translate, scale, rotate) and `opacity`.
We avoid animating properties like `width`, `height`, `margin`, or `top/left` because changing them forces the browser to recalculate the positions of all surrounding elements, causing jank.

**Cross-Questions:**
- *Interviewer:* "How do you handle animations that occur when a component mounts or unmounts?"
  - *Response:* "Framer Motion's `<AnimatePresence>` component is perfect for this. We wrap our conditionally rendered components in it, which allows Framer Motion to intercept the unmount process, play the exit animation, and then safely remove the node from the DOM."

---

## 5. Security & Authentication on the Client
**Question: When the Express backend returns a JWT, how does the Next.js frontend securely handle and attach it to subsequent requests?**

**Detailed Answer:**
If we store the JWT in an `HttpOnly` cookie, the browser automatically attaches it to every request to the backend. Next.js doesn't need to manually read or attach it for API calls. 
If we store it in memory or a secure cookie accessible to the client, we use Axios interceptors:

```javascript
// Example Axios Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Cross-Questions:**
- *Interviewer:* "How do you protect specific Next.js pages (like the Dashboard) from unauthenticated users?"
  - *Response:* "We use Next.js `middleware.ts`. It intercepts the request before it reaches the page, checks the request cookies for the auth token, and if it's missing or invalid, issues an immediate `NextResponse.redirect` to the login page. This prevents the protected page from even rendering."


---

# Backend & API - Complete Interview Preparation

This document covers all probable interview questions related to the Node.js/Express backend API, including detailed cross-questions.

---

## 1. Express Middleware & Request Pipeline
**Question: Explain how you use middleware in Express to structure your API.**

**Detailed Answer:**
Middleware functions have access to the request (`req`), response (`res`), and the `next` function in the application's request-response cycle. We use middleware in a strict pipeline:

```javascript
// 1. Global Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// 2. Auth & 3. Validation -> 4. Controller
app.post('/api/intents', 
  authenticateToken, 
  validateIntentSchema, 
  intentController.createIntent
);

// 5. Global Error Handler (must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

**Cross-Questions:**
- *Interviewer:* "What happens if a controller throws an asynchronous error without calling `next(err)`?"
  - *Response:* "In standard Express 4, unhandled promise rejections will cause the server to hang or crash. We must wrap all async route handlers in a `try/catch` block and pass the error to `next(err)`, or use a utility wrapper like `express-async-handler` to automate this."

---

## 2. Authentication Flow & JWTs
**Question: Walk me through the exact process of user registration and password security.**

**Detailed Answer:**
1. The client sends `email` and plaintext `password` to `/api/auth/register`.
2. We query PostgreSQL to ensure the email isn't already registered.
3. We use `bcrypt` to generate a random salt (cost factor of 10-12) and hash the password. 
4. We insert the user into the database, storing *only* the hash, never the plaintext password.
5. We generate a JWT signing the user's `id` and `role` with our `JWT_SECRET`.
6. We return the JWT (or set it in a cookie) along with non-sensitive user data.

**Cross-Questions:**
- *Interviewer:* "Why use `bcrypt` instead of a standard hashing algorithm like SHA-256?"
  - *Response:* "SHA-256 is fast, making it susceptible to brute-force and rainbow table attacks. `bcrypt` is intentionally slow (key stretching) and automatically incorporates a unique salt for every hash, making brute-force attacks computationally infeasible."

---

## 3. Simulated Payment System
**Question: How do you handle credits and payments securely, since you are simulating this flow?**

**Detailed Answer:**
1. **Simulated Flow Design:** To iterate quickly without the overhead of third-party sandbox environments, we built a secure, internal credit ledger. We use endpoints like `/api/credits/simulateSuccess` which directly grant users credits and XP.
2. **Security & Integrity:** Although simulated, we treat it as a real financial system. The frontend is never trusted with the source of truth for balances. All simulated payment requests must be fully authenticated via JWT. The Express controllers act as the central authority, sequentially validating balances and writing to PostgreSQL to ensure a user cannot spoof their credit amount.

**Cross-Questions:**
- *Interviewer:* "If you were to replace this simulation with a real payment provider, what architectural changes would you need?"
  - *Response:* "We would transition to an asynchronous webhook architecture. Instead of our server directly handling the credit logic on the user's HTTP request, we would create a checkout session, wait for the external provider to ping a secure webhook endpoint, verify the cryptographic signature of that webhook, and then update the database asynchronously to prevent blocking the frontend."
- *Interviewer:* "Isn't it dangerous to have a `/simulateSuccess` endpoint in your API?"
  - *Response:* "Yes, if left unprotected. In a real production deployment, this endpoint is either completely stripped out during the build process, or protected by strict environment variable checks (e.g., `if (process.env.NODE_ENV === 'production') return 404;`) to ensure actual users cannot trigger it."

---

## 4. Real-time Architecture (Socket.io)
**Question: How do you secure WebSocket connections, and how do you handle 'Rooms'?**

**Detailed Answer:**
WebSockets don't use standard HTTP headers after the initial handshake, so securing them requires a different approach.

```javascript
// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded; // Attach user to socket
    next();
  });
});

// Joining a Room Securely
socket.on('join_tribe', async (tribeId) => {
  const isMember = await checkMembershipInDatabase(socket.user.id, tribeId);
  if (isMember) {
    socket.join(tribeId);
  }
});
```

**Cross-Questions:**
- *Interviewer:* "How do you detect if a user goes offline and notify the Tribe?"
  - *Response:* "Socket.io natively fires a `disconnect` event on the server when the TCP connection drops. We listen for this event, determine which rooms the socket was in, and emit a `user_offline` event to those specific Tribe rooms."

---

## 5. API Design & Rate Limiting
**Question: How do you design your REST API to be scalable and protect it from abuse?**

**Detailed Answer:**
- **RESTful Principles:** We use standard HTTP methods (GET, POST, PUT, DELETE) and standard status codes (200, 201, 400, 401, 404, 500). Endpoints are resource-oriented (e.g., `/api/intents/:id`).
- **Pagination:** For lists of data, we never return all records. We use limit/offset or cursor-based pagination (e.g., `?page=1&limit=20`) to keep response sizes small.
- **Rate Limiting:** We apply middleware like `express-rate-limit`. We might limit public endpoints (like Login) to 5 requests per minute per IP to prevent brute-forcing, while authenticated API routes might have higher limits (e.g., 100 per minute).

**Cross-Questions:**
- *Interviewer:* "What HTTP status code would you return if a user tries to edit an Intent they don't own?"
  - *Response:* "A `403 Forbidden`. The user is authenticated (they have a valid JWT, so it's not a `401 Unauthorized`), but they lack the authorization to perform that specific action on that specific resource."


---

# AI Integration - Complete Interview Preparation

This document covers all probable interview questions related to the Google Gemini Flash AI integration, prompt engineering, and fault tolerance.

---

## 1. System Integration & Asynchronous Processing
**Question: How exactly is the Google Gemini API integrated into the Collixa backend, and how do you manage the latency of AI requests?**

**Detailed Answer:**
In the current MVP, the Express controller handles the Gemini API call within the HTTP request lifecycle. 
1. The Express controller fetches the User's profile and a pool of potential candidate Intents from PostgreSQL.
2. The controller formats the prompt and `await`s the Gemini API via the `@google/genai` SDK.
3. To mitigate the latency (which can be 1-5 seconds), the controller leverages a Time-To-Live (TTL) cache. If the user requested matches within the last hour, the AI step is skipped entirely, and the Express server instantly returns the cached JSON string from PostgreSQL.
4. If a fresh generation is needed, the parsed JSON response is saved back to the database cache and returned to the client.

**Cross-Questions:**
- *Interviewer:* "Awaiting the AI synchronously blocks the Express request. How would you scale this if you had thousands of concurrent users?"
  - *Response:* "Currently, Node.js handles the `await` reasonably well because it doesn't block the main event loop, but the HTTP connection itself is held open for seconds. To scale, I would decouple the AI processing. I'd implement a background worker queue (like Redis and BullMQ). The Express API would instantly return a `202 Accepted`, and a separate worker would call Gemini and push the results to the client via Socket.io when finished."

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


---

