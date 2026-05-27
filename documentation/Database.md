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
With RLS, we pass the user's context (e.g., their JWT claims) directly to PostgreSQL. We can write a policy like: `CREATE POLICY update_intent ON intents FOR UPDATE USING (auth.uid() = owner_id);`. This acts as a final layer of defense; the database simply refuses to update the row if the user isn't the owner, regardless of the API's behavior.

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

## 5. Transactions and ACID Properties
**Question: When processing a payment or forming a Tribe, how do you ensure data doesn't get into an inconsistent state?**

**Detailed Answer:**
We use Database Transactions to uphold ACID properties (Atomicity, Consistency, Isolation, Durability). 
Atomicity guarantees that a series of operations either *all* succeed or *all* fail.
For example, when a user buys credits:
1. `BEGIN` transaction.
2. Insert a record into the `credit_ledger` (history).
3. Update the `users` table to increase the balance.
4. `COMMIT` transaction.
If the Node.js server crashes between steps 2 and 3, or if step 3 violates a constraint, the database automatically rolls back the entire transaction. The ledger entry disappears, ensuring the user's balance and the ledger remain perfectly in sync.
