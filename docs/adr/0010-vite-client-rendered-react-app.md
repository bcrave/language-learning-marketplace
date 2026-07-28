# Build the web application as a Vite SPA

The React application is a client-rendered single-page app built with Vite rather than Next.js. Authenticated, interaction-heavy dashboards do not justify server rendering or React Server Components, and the separately deployed GraphQL Yoga API already owns the server boundary. This keeps browser data access in Apollo Client and avoids introducing a second full-stack framework with overlapping backend responsibilities.
