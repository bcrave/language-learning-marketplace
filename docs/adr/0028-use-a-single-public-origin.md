# Use a single public origin

A Caddy service is the deployment's only public application origin. It serves the built Vite SPA, routes application paths to the SPA entry point, proxies `/graphql` through Railway private networking to the GraphQL API, and applies browser security headers. The API has no independent public address, while the worker remains non-HTTP. This removes cross-origin browser configuration, reduces the public network surface, and gives Auth0 one application callback origin at the cost of a small additional routing layer.
