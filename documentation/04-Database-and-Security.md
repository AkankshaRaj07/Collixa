# Database - Complete Interview Preparation

This document covers all probable interview questions related to PostgreSQL, Supabase, and schema design, including detailed cross-questions.

---

## 1. Schema Design & Data Integrity
**Question: Walk me through the schema design for connecting Users to Intents (Tribes).**

**Detailed Answer:**
An `Intent` represents a project, and a `User` represents a person. A User can be part of many Intents, and an Intent can have many Users. This is a Many-to-Many relationship requiring a junction table.
- **`users` table:** `id` (UUID, PK), `email`, `password_hash`.
- **`intents` table:** `id` (UUID, PK), `title`, `owner_id` (FK to `users.id`).
- **`tribe_members` (Junction Table):** `intent_id` (FK to `intents.id`), `user_id` (FK to `users.id`), `role` (e.g., 'Developer'), `status` (e.g., 'Pending', 'Active').

```sql
-- Enforcing Data Integrity
CREATE TABLE tribe_members (
    intent_id UUID REFERENCES intents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50),
    status VARCHAR(20),
    PRIMARY KEY (intent_id, user_id) -- Prevents duplicate joins
);
```

We enforce data integrity using Foreign Key constraints. We also add a Composite Primary Key on `(intent_id, user_id)` in the `tribe_members` table to guarantee that a user cannot join the same intent twice.

**Cross-Questions:**
- *Interviewer:* "If you delete a User, what happens to their associated Intents and Tribe memberships?"
  - *Response:* "This is governed by the Foreign Key `ON DELETE` clause. For `tribe_members`, we would use `ON DELETE CASCADE`, so leaving the platform automatically removes them from Tribes. However, for `intents` they own, we might use `ON DELETE RESTRICT` to prevent accidental deletion of a live project, requiring them to transfer ownership or explicitly delete the intent first."

---

## 2. UUIDs vs. Auto-Incrementing Integers
**Question: Why did you choose UUIDs for primary keys across your tables instead of standard auto-incrementing integers (SERIAL)?**

**Detailed Answer:**
UUIDs (Universally Unique Identifiers) provide several major advantages for a modern platform:
- **Security:** Auto-incrementing IDs reveal business metrics (e.g., if a user registers and gets ID 100, they know you have 100 users). It also makes resource enumeration easy (Insecure Direct Object Reference attacks). UUIDs are unguessable.
- **Distributed Generation:** IDs can be generated reliably on the client side or in edge functions before being synced to the database, without fear of a collision.
- **Data Merging:** If we ever shard the database or merge data from different systems, UUIDs guarantee there won't be primary key conflicts.

**Cross-Questions:**
- *Interviewer:* "Are there any performance downsides to using UUIDs over Integers?"
  - *Response:* "Yes. UUIDs take 16 bytes of storage compared to 4 bytes for a standard integer. This makes the primary key indexes larger, meaning fewer index pages fit in RAM (cache), which can slightly degrade read performance on extremely large datasets. Furthermore, non-sequential UUIDs (v4) can cause index fragmentation during inserts, though PostgreSQL handles this relatively well."

---

## 3. Supabase Row Level Security (RLS)
**Question: What is Row Level Security, and how does it enhance the security of the application?**

**Detailed Answer:**
Row Level Security (RLS) is a PostgreSQL feature leveraged heavily by Supabase. It allows database administrators to define policies that restrict which rows a specific database user can SELECT, INSERT, UPDATE, or DELETE based on the context of the query.
In a traditional setup, the Express backend acts as a superuser and handles all authorization logic. If a developer makes a mistake in the Node.js code, data can leak.
With RLS, we pass the user's context (e.g., their JWT claims) directly to PostgreSQL. 

```sql
-- Enable RLS on the intents table
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only update their own intents
CREATE POLICY update_intent ON intents 
FOR UPDATE USING (auth.uid() = owner_id);
```

This acts as a final layer of defense; the database simply refuses to update the row if the user isn't the owner, regardless of the API's behavior.

**Cross-Questions:**
- *Interviewer:* "If you are using a Node.js Express backend, how do you pass the user's JWT context to PostgreSQL so RLS works?"
  - *Response:* "When making a query from Express, we must set local configuration parameters for the transaction. Before running the actual query, we execute `SET LOCAL request.jwt.claim.sub = 'user_uuid';`. The RLS policy reads this configuration variable to enforce the rules."

---

## 4. Query Optimization & Indexing
**Question: How do you ensure your database queries remain fast as the platform grows to millions of Intents and Users?**

**Detailed Answer:**
The primary tool for query optimization is Indexing.
- **Foreign Keys:** We automatically index all Foreign Keys (like `owner_id` on the `intents` table) because they are frequently used in `JOIN` and `WHERE` clauses.
- **Search Columns:** For text-heavy columns like Intent descriptions, we use PostgreSQL's GIN (Generalized Inverted Index) for efficient full-text search, rather than relying on slow `LIKE '%keyword%'` queries.
- **Analyzing Queries:** We use the `EXPLAIN ANALYZE` command in PostgreSQL to profile slow queries. It shows whether the database is using a "Sequential Scan" (bad for large tables) or an "Index Scan" (good).

**Cross-Questions:**
- *Interviewer:* "Can you have too many indexes? What is the downside?"
  - *Response:* "Yes. Every time a row is inserted, updated, or deleted, PostgreSQL must also update every associated index. Having too many indexes significantly slows down write operations and consumes extra disk space. You should only index columns that are strictly necessary for frequent read queries."

---

## 5. Future Scaling: Transactions and ACID Properties
**Question: When processing a payment or forming a Tribe, how would you ensure data doesn't get into an inconsistent state as the platform scales?**

**Detailed Answer:**
Currently, the MVP handles operations sequentially in Node.js. However, for a production financial system, I would use Database Transactions to uphold ACID properties (Atomicity, Consistency, Isolation, Durability). 
Atomicity guarantees that a series of operations either *all* succeed or *all* fail.
For example, when a user buys credits, I would write a PostgreSQL RPC function to:

```sql
BEGIN; -- Start Transaction

INSERT INTO credit_transactions (user_id, amount) 
VALUES ('user-123', 500);

UPDATE users 
SET balance = balance + 500 
WHERE id = 'user-123';

COMMIT; -- End Transaction
```

If the server crashes between the `INSERT` and `UPDATE`, or if the `UPDATE` violates a constraint, the database automatically rolls back the entire transaction. The ledger entry disappears, ensuring the user's balance and the ledger remain perfectly in sync.


---

# Security Considerations & System Hardening

In any Full-Stack or Backend engineering interview, security is a major topic. Interviewers want to know that you proactively protect user data, financial ledgers, and API endpoints against common vulnerabilities.

When asked, **"What security measures did you implement in Collixa?"** or **"How do you protect your API?"**, you can refer to the following multi-layered security architecture.

---

## 1. Authentication & Authorization

**The Threat:** Unauthorized access to user accounts or users modifying data they do not own.

**The Implementation:**
*   **Password Hashing:** Plaintext passwords are never stored. The backend uses `bcrypt` to hash and salt passwords before saving them to PostgreSQL. This makes brute-force and rainbow table attacks computationally infeasible if the database were ever compromised.
*   **Stateless JWT Authentication:** We use JSON Web Tokens (JWTs). Every protected API route routes through an Express authentication middleware that verifies the cryptographic signature of the token using a secret key (`JWT_SECRET`).
*   **Strict Authorization:** Authentication (who you are) is separated from Authorization (what you can do). Even if a user provides a valid JWT, controller logic explicitly verifies ownership. For example, before deleting an Intent, the API queries PostgreSQL to confirm `req.user.id === intent.owner_id`, returning a `403 Forbidden` if it fails.

---

## 2. Real-Time Communication Security (Socket.io)

**The Threat:** Malicious actors connecting to WebSockets to eavesdrop on private Tribe chats.

**The Implementation:**
*   **Handshake Authentication:** WebSockets do not automatically pass HTTP-only cookies well, so we intercept the initial Socket.io handshake. The client must pass their JWT in the `auth` payload. The server validates this token before upgrading the HTTP connection to a WebSocket.
*   **Tribe Room Isolation:** We use Socket.io 'Rooms' to compartmentalize data. A user cannot simply ask to join a room. They emit a `join_tribe` request to the backend. The Node.js server queries PostgreSQL to confirm the user is officially an accepted member of that Tribe. Only then does the backend call `socket.join(tribeId)`. This guarantees that `io.to(tribeId).emit()` never leaks private messages to unauthorized listeners.

---

## 3. Database Security (PostgreSQL & Supabase)

**The Threat:** Data enumeration, SQL injection, and API flaws exposing data.

**The Implementation:**
*   **Preventing IDOR (Insecure Direct Object Reference):** Every single Primary Key in the database uses `UUIDv4`. If we used auto-incrementing integers (1, 2, 3...), an attacker could easily write a script to scrape every user profile or intent by simply looping through IDs. UUIDs are completely unguessable, making enumeration impossible.
*   **Row-Level Security (RLS):** Because the database is hosted on Supabase, we benefit from PostgreSQL Row-Level Security. We can write policies directly on the tables (e.g., `USING (auth.uid() = owner_id)`). This acts as a 'defense-in-depth' mechanism; even if I make a mistake in my Express API routing and accidentally query too much data, the database itself will refuse to return rows the user doesn't own.
*   **SQL Injection Prevention:** By using the Supabase client library and parameterized queries natively, raw user input is never concatenated into SQL strings, entirely neutralizing SQL injection attacks.

---

## 4. API Hardening & Rate Limiting

**The Threat:** Denial of Service (DoS) attacks, brute-forcing, and Cross-Origin abuse.

**The Implementation:**
*   **CORS (Cross-Origin Resource Sharing):** The Express backend implements a strict CORS policy. It rejects HTTP requests that do not originate from our specific Next.js frontend domain, preventing malicious sites from making API requests on behalf of a user's browser.
*   **Graceful Degradation (Rate Limits):** To protect our system from external limits (like Google Gemini API 429 errors), the backend catches third-party timeouts and falls back to deterministic, local heuristic matching algorithms. This ensures a localized API failure does not crash the entire platform.

---

## 5. Financial Ledger Integrity (The Wealth Protocol)

**The Threat:** Users spoofing their credit balances or exploiting race conditions to get free credits.

**The Implementation:**
*   **Backend as the Source of Truth:** The React frontend is completely untrusted regarding financial data. If a user clicks "Buy Credits", the frontend cannot tell the backend "Set balance to 500". It only tells the backend what action occurred. The Express controller independently fetches the current balance from PostgreSQL, performs the math, and updates the database, neutralizing client-side manipulation.


---

