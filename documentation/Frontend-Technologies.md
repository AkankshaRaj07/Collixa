# Frontend Technologies - Complete Interview Preparation

This document covers all probable interview questions related to the frontend tech stack (React, Next.js 14, Tailwind, Framer Motion), including detailed cross-questions.

---

## 1. Next.js App Router vs. Traditional React
**Question: Why did you choose Next.js 14 with the App Router over a traditional Create React App (CRA) or Vite SPA?**

**Detailed Answer:**
A traditional Single Page Application (SPA) sends a nearly empty HTML file and a massive JavaScript bundle to the browser. The browser must download and execute this bundle before the user sees anything, resulting in poor SEO and a slow First Contentful Paint (FCP).
Next.js 14 with the App Router solves this using Server-Side Rendering (SSR) and React Server Components (RSC) by default. It pre-renders the HTML on the server. When search engine bots crawl Collixa, they see fully populated HTML (crucial for an Intent marketplace). Additionally, the App Router allows for nested layouts and streaming UI, significantly improving perceived performance.

**Cross-Questions:**
- *Interviewer:* "What is the difference between a Server Component and a Client Component in the App Router?"
  - *Response:* "Server Components run only on the server, have direct access to backend resources (like databases), and their JS is never sent to the client, reducing bundle size. Client Components (`"use client"`) run on both the server (for initial HTML) and the client (hydration), and they can use state, effects, and event listeners."

---

## 2. State Management
**Question: How do you manage state across a complex application like Collixa? Did you use Redux?**

**Detailed Answer:**
We heavily rely on React Server Components, which naturally eliminates a large portion of traditional client-side state management (like fetching and storing data in Redux).
For the state we do need:
- **Server State:** We use Next.js `fetch` with caching and revalidation, or a library like SWR/React Query for dynamic client-side fetching.
- **Client/UI State:** For UI toggles (modals, dropdowns), we use standard React `useState`. For complex local states (like multi-step Intent creation forms), we use `useReducer` or React Context.
We avoid Redux as it introduces unnecessary boilerplate for an app that already leverages Next.js Server Components.

**Cross-Questions:**
- *Interviewer:* "If you don't use Redux, how do you handle global state like the current User's profile or Theme?"
  - *Response:* "For the Theme, we use a lightweight Context provider. For the User Profile, we can fetch it securely via a Server Component at the layout level and pass it down, or use a React Context provider wrapped around the application that fetches the user session on mount."

---

## 3. Tailwind CSS vs. Traditional CSS
**Question: What are the trade-offs of using Tailwind CSS for Collixa's design system?**

**Detailed Answer:**
**Pros:** 
- **Velocity:** It allows us to style components rapidly without leaving the JSX file or inventing class names.
- **Consistency:** The `tailwind.config.js` enforces a strict design system (colors, spacing), preventing arbitrary "magic numbers."
- **Performance:** Tailwind purges unused styles, resulting in a tiny CSS bundle (often <10kb).
**Cons:**
- **Markup Clutter:** JSX files can become very long and hard to read with many utility classes.

**Cross-Questions:**
- *Interviewer:* "How do you mitigate the issue of long, cluttered class strings in your components?"
  - *Response:* "We extract heavily reused combinations into standard React components (e.g., creating a `<PrimaryButton>` component instead of repeating the classes everywhere). We can also use libraries like `clsx` or `tailwind-merge` to handle conditional class application cleanly."

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
If we store it in memory or a secure cookie accessible to the client, we use Axios interceptors or a custom wrapper around `fetch`. Before every request, the interceptor grabs the token and injects it into the `Authorization: Bearer <token>` header.

**Cross-Questions:**
- *Interviewer:* "How do you protect specific Next.js pages (like the Dashboard) from unauthenticated users?"
  - *Response:* "We use Next.js `middleware.ts`. It intercepts the request before it reaches the page, checks the request cookies for the auth token, and if it's missing or invalid, issues an immediate `NextResponse.redirect` to the login page. This prevents the protected page from even rendering."
