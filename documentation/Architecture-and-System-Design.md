# Architecture & System Design - Complete Interview Preparation

This document covers all probable architectural and system design questions that could be asked in an interview regarding the Collixa platform, including detailed cross-questions to test depth of knowledge.

---

## 1. Overall System Architecture & Stack Choice
**Question: Walk me through the overall architecture of Collixa. Why did you choose this specific tech stack?**

**Detailed Answer:**
Collixa follows a decoupled, modular architecture separating the frontend client from the backend API.
- **Frontend Layer:** Built with Next.js 14 (App Router) and React, utilizing Tailwind CSS for styling. It acts as a standalone service optimized for high performance, SEO, and dynamic rendering.
- **Backend Layer:** Node.js with Express. It provides RESTful API endpoints and WebSocket handling.
- **Data Layer:** PostgreSQL hosted on Supabase, acting as the persistent storage layer.
- **Communication:** Communication between the frontend and backend happens via HTTP/REST, secured by JWTs. Real-time features use Socket.io.
*Why this approach?* Next.js was chosen for its Server-Side Rendering (SSR) capabilities which are crucial for a public marketplace where SEO is paramount. Express was chosen for the backend because it is lightweight, highly customizable, and excels at handling asynchronous I/O and WebSockets (Socket.io) natively compared to Next.js API routes. Supabase was chosen because it provides a robust PostgreSQL database with built-in Row Level Security (RLS) and easy scaling.

**Cross-Questions:**
- *Interviewer:* "Since you decoupled the frontend and backend, how do you manage CORS and secure cookies between the two?"
  - *Response:* "We configure the Express CORS middleware to strictly accept requests only from the Next.js frontend origin. For tokens, we can use HTTPOnly cookies or pass the JWT in the `Authorization` header. Since Next.js and Express might be on different domains in production, we ensure `credentials: true` is set on both ends."
- *Interviewer:* "Why not use Next.js built-in API routes for the backend instead of maintaining a separate Express server?"
  - *Response:* "While Next.js API routes are great for simple backends, our requirements include persistent WebSocket connections for real-time chat (Socket.io) and long-running AI matching tasks. Next.js API routes are serverless and stateless by default, making WebSocket integration difficult and limiting background processing."

---

## 2. Microservices vs. Monolith
**Question: Is Collixa a monolith or a microservices architecture? How do you justify this choice for a startup?**

**Detailed Answer:**
Collixa is best described as a "decoupled monolith" or a modular monolith. We have a distinct frontend service and a distinct backend service, but the backend itself handles all domains (Auth, Intents, Tribes, Payments) within a single Express application and connects to a single PostgreSQL database.
*Justification:* For a startup, a full microservices architecture introduces unnecessary overhead (service discovery, distributed transactions, complex CI/CD, network latency between services). A modular monolith gives us the velocity of a unified codebase while allowing us to scale the entire backend horizontally behind a load balancer when traffic increases. We separated the frontend from the backend from day one so that we are ready to build mobile apps (React Native) that consume the exact same API.

**Cross-Questions:**
- *Interviewer:* "At what point would you consider splitting the Express backend into actual microservices?"
  - *Response:* "We would split it when different parts of the system require vastly different scaling profiles or technologies. For example, if the AI matching engine starts consuming significantly more CPU than basic CRUD operations, we would extract it into a Python or Go microservice. Similarly, if WebSocket traffic overloads the main API, the chat server would be separated."
- *Interviewer:* "How would you handle database schemas if you eventually split into microservices?"
  - *Response:* "We would follow the 'Database per Service' pattern. The Chat service would have its own database, and the Core API would have its own. To maintain data consistency, we would use event-driven architecture (like RabbitMQ or Kafka) to sync essential data between them."

---

## 3. Data Flow & Request Lifecycle
**Question: Describe the lifecycle of a request when a user creates a new 'Intent'.**

**Detailed Answer:**
1. **Client Request:** The user submits a form on the Next.js frontend. The client-side React code sends a `POST /api/intents` request to the Express backend, attaching the JWT in the `Authorization` header.
2. **Middleware:** 
   - The Express router first passes the request through the `authenticateToken` middleware, which verifies the JWT signature and attaches the decoded user ID to `req.user`.
   - Next, a validation middleware (like Zod or express-validator) ensures the payload (title, budget, skills) matches the required schema.
3. **Controller/Service:** The request hits the Intent controller. The controller initiates a transaction using the PostgreSQL client (or ORM).
4. **Database Operation:** The new Intent is inserted into the `intents` table, linking it to the user's ID via a foreign key.
5. **Asynchronous Tasks:** The controller emits an event to a background job queue to notify the Gemini AI service to start finding matches for this new intent.
6. **Response:** The controller returns a `201 Created` status with the new Intent object back to the Next.js client.

**Cross-Questions:**
- *Interviewer:* "What happens if the database insertion succeeds, but the background AI task fails to queue?"
  - *Response:* "We use the Outbox Pattern or transactional guarantees. We would save the AI task intent in a `jobs` table within the same PostgreSQL transaction. A separate worker process continuously polls this table to process pending jobs. This guarantees the AI task will eventually run even if the Node process crashes immediately after the API responds."

---

## 4. The Wealth Protocol (Payment Architecture & State Management)
**Question: Explain the architecture of the 'Wealth Protocol'. How do you guarantee transaction integrity when dealing with money?**

**Detailed Answer:**
The Wealth Protocol is Collixa's credit-based ecosystem, architected to use the Stripe API. The payment architecture employs a dual-strategy approach:
1. **Production Flow (Asynchronous Webhooks):** Financial data integrity is paramount. In production, the flow relies entirely on Stripe Webhooks as the source of truth, never trusting the client frontend. The frontend asks the backend to create a Stripe Checkout Session, the user pays on Stripe, and Stripe sends a secure signed Webhook (`/api/webhooks/stripe`) which updates the user's credit balance via a PostgreSQL transaction.
2. **Development/Simulated Flow:** For rapid iteration and local testing, we implemented a `/simulateSuccess` endpoint. This allows developers and QA to test the entire credit ecosystem, trigger XP awards, and level up users without pinging the Stripe Sandbox or processing mock credit cards.

**Cross-Questions:**
- *Interviewer:* "What happens if the Stripe webhook hits your server, but your database crashes before you can update the user's credits?"
  - *Response:* "Stripe expects a `200 OK` response. If our database crashes, the Express route will return a 500 error or time out. Stripe will automatically retry sending the webhook later (with exponential backoff)."
- *Interviewer:* "What if Stripe sends the webhook twice due to a network glitch? How do you prevent double-crediting?"
  - *Response:* "Idempotency is critical. When processing the webhook, we first check a `processed_webhooks` table for the Stripe `event_id`. If it exists, we return `200 OK` without doing anything. If it doesn't, we insert it and update the credits within a single ACID transaction."
- *Interviewer:* "Why maintain a simulated payment flow if Stripe has a sandbox?"
  - *Response:* "Stripe's sandbox requires manual credit card entry for every test, which significantly slows down end-to-end testing of features that rely on a user having credits. A simulated endpoint drastically improves Developer Experience (DX) and test velocity."

---

## 5. Real-time Communication (Socket.io Architecture)
**Question: How is the real-time collaboration and chat layer architected?**

**Detailed Answer:**
We use Socket.io attached to our Express HTTP server. 
- **Connection & Auth:** When a Next.js client connects via WebSocket, they pass their JWT. A Socket.io middleware authenticates this token before upgrading the connection.
- **Rooms:** Users can join "rooms" mapped to a Tribe's UUID. 
- **Message Flow:** When User A sends a message, they send a standard REST `POST` request to Express. Once saved in PostgreSQL, the Express controller triggers `io.to(tribe_id).emit('new_message', data)`. This separates data persistence from data broadcasting.

**Cross-Questions:**
- *Interviewer:* "If you scale the Express backend horizontally to 5 instances, how does Socket.io ensure a user connected to Server A receives a message broadcasted by Server B?"
  - *Response:* "Sticky sessions on the load balancer aren't enough for broadcasting. We must implement a Redis Pub/Sub adapter for Socket.io. When Server B broadcasts a message to a room, it publishes it to Redis. Redis then distributes it to all other Socket.io servers (including Server A), which push it to their connected clients."

---

## 6. Security Architecture
**Question: Walk me through the comprehensive security architecture of the platform.**

**Detailed Answer:**
Security is applied in layers (Defense in Depth):
- **Authentication:** We use JWTs. Passwords are hashed using `bcrypt` with a minimum of 10 salt rounds.
- **Authorization:** Express middleware intercepts requests, validates the JWT, and enforces Role-Based Access Control (RBAC). 
- **Data Security:** We leverage Supabase's Row Level Security (RLS). Even if an API endpoint forgets an authorization check, PostgreSQL enforces policies directly at the table level (e.g., `user_id = auth.uid()`).
- **XSS & CSRF:** We use Next.js, which automatically sanitizes React outputs to prevent Cross-Site Scripting (XSS). We use standard CORS policies and helmet.js in Express to set secure HTTP headers.

**Cross-Questions:**
- *Interviewer:* "Where do you store the JWT on the client side, and what are the security implications?"
  - *Response:* "Storing it in `localStorage` makes it vulnerable to XSS attacks, as JavaScript can read it. Storing it in an `HttpOnly` cookie prevents XSS but opens up CSRF (Cross-Site Request Forgery) risks. We prefer `HttpOnly` cookies combined with `SameSite=Strict` flags and CORS to mitigate both vectors."
- *Interviewer:* "How do you handle JWT revocation if a user's account is compromised?"
  - *Response:* "Since JWTs are stateless, they cannot be natively revoked. We keep the expiration time short (e.g., 15 minutes) and issue a long-lived Refresh Token stored securely in the database. To revoke access, we simply delete the refresh token from the database. When the short-lived JWT expires, the attacker cannot get a new one."

---

## 7. AI Subsystem (Gemini API Integration Architecture)
**Question: How does the AI integration fit into the application's critical path, and how do you handle failures?**

**Detailed Answer:**
The Gemini AI is treated as an external, highly latent asynchronous service. Because AI inference can take several seconds, we decouple it from user-facing HTTP requests.
When an Intent requires matching, the backend queues a task. A worker calls the Gemini API, processes the structured JSON response, and stores the matches in the database. The frontend is notified via Socket.io when the matches are ready, allowing the user to continue using the app without waiting on a loading spinner.

**Cross-Questions:**
- *Interviewer:* "If the Gemini API goes down or hits a rate limit, does the whole marketplace break?"
  - *Response:* "No. We implement the Circuit Breaker pattern and graceful degradation. If Gemini fails or times out, we catch the error, log it, and immediately fall back to a traditional keyword-based SQL search using PostgreSQL's full-text search capabilities, ensuring the user still gets viable collaborator results."
- *Interviewer:* "How do you prevent the AI from returning hallucinations or malformed JSON that breaks your database schema?"
  - *Response:* "We use Gemini's `response_mime_type: "application/json"` feature and provide a strict JSON Schema in the API call. Furthermore, when the response arrives at our Express server, we parse it through a validation library like Zod before ever trusting it or saving it to the database."

---

## 8. Scalability & High Availability
**Question: Collixa gets featured on a major tech blog and experiences a 100x spike in traffic. Which parts of the architecture are most likely to bottleneck, and how do you scale them?**

**Detailed Answer:**
1. **Frontend (Next.js):** 
   - *Bottleneck:* Uncached SSR pages rebuilding on every request.
   - *Solution:* Heavily utilize Next.js ISR (Incremental Static Regeneration) and CDN caching (Vercel/Cloudflare). Static pages serve instantly from the edge, completely absorbing frontend read-traffic spikes.
2. **Backend (Node/Express):**
   - *Bottleneck:* CPU-bound tasks or single-threaded event loop blocking. Node can only handle so many concurrent requests on one core.
   - *Solution:* Horizontal scaling. Deploy multiple instances of the Express server behind a load balancer (Nginx, AWS ALB). Ensure the backend is completely stateless (which it is, thanks to JWTs).
3. **Database (PostgreSQL):**
   - *Bottleneck:* Max connection limits being hit as many Express servers try to connect at once.
   - *Solution:* Implement a connection pooler like PgBouncer. If read traffic (viewing intents) far outweighs write traffic (creating intents), we can deploy read-replicas and route read-only queries to them.

**Cross-Questions:**
- *Interviewer:* "What happens to your Socket.io servers during this traffic spike?"
  - *Response:* "WebSockets hold persistent connections, consuming memory. To scale, we would need to auto-scale our Node.js instances based on RAM and active connections, not just CPU. We'd also ensure the Redis backplane is sufficiently sized to handle the increased Pub/Sub message throughput."

---

## 9. File Storage Architecture (Handling Images/Assets)
**Question: How does the system handle user uploads, like profile pictures or project attachments?**

**Detailed Answer:**
We never store files directly on the Node.js server or in the PostgreSQL database.
- We use Supabase Storage (which is backed by AWS S3).
- The Express backend uses `multer` to accept the file upload in memory, validates the file type and size, and then pipes it directly to the Supabase Storage bucket.
- Supabase returns a public URL, which we then save in the PostgreSQL database (e.g., `avatar_url` in the `users` table).

**Cross-Questions:**
- *Interviewer:* "Piping files through the Express backend consumes bandwidth and memory. Is there a more efficient way?"
  - *Response:* "Yes, we can use Pre-signed URLs. The Next.js frontend can request a secure upload URL from the Express backend. Express generates a short-lived tokenized URL from Supabase/S3 and returns it to the client. The client then uploads the file directly to the storage bucket, completely bypassing our Express server."

---

## 10. Database Architecture & Schema Design
**Question: What are the key considerations you made when designing the PostgreSQL database schema for Collixa?**

**Detailed Answer:**
- **UUIDs over Integers:** We use `UUIDv4` for all primary keys. This prevents predictable ID scraping and allows for decentralized ID generation if we scale to distributed systems.
- **Foreign Key Constraints:** We enforce strict referential integrity. Deleting a user can cascade and delete their intents, or restrict deletion if they have active financial records.
- **Indexing:** We add B-tree indexes on frequently queried columns (e.g., `owner_id` on the Intents table) and GIN indexes for full-text search columns.
- **Normalization vs. Denormalization:** The database is mostly in 3rd Normal Form. However, we might denormalize highly-read data (like keeping a `member_count` on the `Tribes` table) to avoid expensive SQL `COUNT()` joins on every read, keeping it updated via database triggers.

**Cross-Questions:**
- *Interviewer:* "How do you handle schema changes and migrations in a production environment?"
  - *Response:* "We use a migration tool (like Prisma Migrate, Knex, or Supabase CLI). Migrations are version-controlled SQL files applied during the CI/CD pipeline. For breaking changes, we use the Expand and Contract pattern: add a new column, write to both, switch the read to the new column, and finally drop the old column in a later release, ensuring zero downtime."
