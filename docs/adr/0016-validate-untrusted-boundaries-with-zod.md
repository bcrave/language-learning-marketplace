# Validate untrusted boundaries with Zod

The application uses Zod 4 to validate data crossing untrusted runtime boundaries, including URL parameters, environment configuration, background-job payloads, CSV imports, and external adapter responses. Zod does not replace GraphQL Code Generator types or become the source of truth for domain types. Keeping it at boundaries provides runtime guarantees without coupling the entire domain model to a validation library.
