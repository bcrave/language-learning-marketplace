# Use React Router for the Vite SPA

The web application uses React Router in Data Mode and validates search parameters at the route boundary rather than adopting TanStack Router. TanStack Router's type-safe URL state was attractive, but malicious npm releases in the May 2026 TanStack supply-chain incident created an unnecessary trust concern for the project's modest routing needs. React Router works cleanly with the separately owned Apollo data layer; exact dependency versions remain locked and routing concerns stay isolated so a later migration is possible if its benefits become material.
