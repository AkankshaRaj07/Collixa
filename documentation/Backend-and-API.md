# Backend & API - Complete Interview Preparation

This document covers all probable interview questions related to the Node.js/Express backend API, including detailed cross-questions.

---

## 1. Express Middleware & Request Pipeline
**Question: Explain how you use middleware in Express to structure your API.**

**Detailed Answer:**
Middleware functions have access to the request (`req`), response (`res`), and the `next` function in the application's request-response cycle. 
We use middleware in a strict pipeline:
1. **Global Middleware:** Applied to all routes. Examples include `cors()` for cross-origin sharing, `helmet()` for security headers, and `express.json()` for parsing body payloads.
2. **Authentication Middleware:** e.g., `authenticateToken`. It checks the JWT and rejects unauthenticated requests early.
3. **Validation Middleware:** We use a library (like express-validator or Zod) to check that the `req.body` matches our expected schema before it hits the controller.
4. **Controllers:** The actual business logic.
5. **Error Handling Middleware:** Placed at the very end to catch any errors thrown by controllers and return formatted JSON error responses.

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

## 3. Stripe Integration & Webhooks
**Question: How do you handle Stripe payments securely, and how do you test this flow during development?**

**Detailed Answer:**
We utilize a dual-flow approach for payments:
1. **Production (Webhooks):** Stripe Webhooks are HTTP POST requests sent to notify us of asynchronous events (like a successful payment). Security is critical, so we capture the **raw** unparsed body of the request on our `/api/webhooks/stripe` route. We use `stripe.webhooks.constructEvent` with our `ENDPOINT_SECRET` to cryptographically verify that the payload genuinely originated from Stripe.
2. **Development (Simulated Flow):** To improve Developer Experience (DX) and speed up QA testing, we built a `/api/credits/simulateSuccess` endpoint. This bypasses Stripe entirely, instantly granting the user credits and XP, allowing us to test the platform's core "Wealth Protocol" economics without manually typing sandbox credit cards.

**Cross-Questions:**
- *Interviewer:* "What if your server takes too long to process the webhook and Stripe times out?"
  - *Response:* "Stripe expects a response quickly. We should immediately return a `200 OK` after verifying the signature and then enqueue the actual database update (crediting the user) into a background job (like Redis/BullMQ) to prevent blocking the HTTP response."
- *Interviewer:* "Isn't it dangerous to have a `/simulateSuccess` endpoint in your API?"
  - *Response:* "Yes, if left unprotected. In a real production deployment, this endpoint is either completely stripped out during the build process, or protected by strict environment variable checks (e.g., `if (process.env.NODE_ENV === 'production') return 404;`) to ensure actual users cannot trigger it."

---

## 4. Real-time Architecture (Socket.io)
**Question: How do you secure WebSocket connections, and how do you handle 'Rooms'?**

**Detailed Answer:**
WebSockets don't use standard HTTP headers after the initial handshake, so securing them requires a different approach.
- **Authentication:** When the client initiates the Socket.io connection, they pass their JWT in the `auth` payload. We have a Socket.io middleware (`io.use`) that validates this JWT. If invalid, it disconnects the socket immediately.
- **Rooms:** We use Socket.io's `join` method. When a user navigates to a specific Tribe, they emit a `join_tribe` event with the Tribe ID. The server verifies they belong to that Tribe via the database, and then calls `socket.join(tribeId)`. When broadcasting messages, the server uses `io.to(tribeId).emit()`, ensuring only authenticated members of that room receive the payload.

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
