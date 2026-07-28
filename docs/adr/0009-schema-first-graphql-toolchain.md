# Use a schema-first GraphQL toolchain

The API runs on GraphQL Yoga and defines its contract explicitly in GraphQL Schema Definition Language. GraphQL Code Generator derives TypeScript resolver and client-operation types from that contract, while the React application uses Apollo Client for normalized caching and the limited optimistic updates chosen for low-risk interactions. This keeps the task-oriented API independently readable, preserves end-to-end type checking, and provides established optimistic rollback behavior without generating the public schema implicitly from application code.
