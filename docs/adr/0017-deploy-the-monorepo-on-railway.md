# Deploy the monorepo on Railway

The public portfolio demonstration deploys from the pnpm monorepo to Railway as a Vite frontend, GraphQL API, Graphile Worker process, and PostgreSQL service. The services use standard Node.js processes and PostgreSQL interfaces so the application remains portable. Internal traffic uses Railway private networking. The deployment targets a $10–15 monthly operating range, with an $8 alert and a $15 hard usage limit; one week of measured usage is required before accepting the deployment configuration.
