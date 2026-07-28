# Restrict production to persisted GraphQL operations

GraphQL Code Generator produces a hash-to-document manifest from the client operations during the build, and the production Yoga server accepts only those persisted operations. Arbitrary documents and GraphiQL remain available in local development but are disabled in the public deployment; the repository still exposes the SDL and representative operations. Persisted operations reduce the public query-language attack surface but do not replace resolver authorization, variable validation, pagination bounds, or resource controls.
