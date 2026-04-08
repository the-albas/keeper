## Tech Stack

- C# with Dotnet 10 hosted on Azure
  - Linq & Entity Framework Core for DB querying
  - Identity for auth and user management
- React + Vite hosted on Vercel
  - Tanstack Router
  - Tanstack Query
  - Shadcn components
- SQLServer in Docker (dev) / AzureSQL (prod)
- FastAPI machine learning pipeline
- check ml-pipelines/requirements.txt for packages used in the pipeline

## Important notes

- All frontend styling must be desktop and mobile friendly
- The machine learning pipeline must be available via FastAPI
- Never trust frontend validation. Validate everything again in the .NET API
- Use [Authorize] on protected endpoints and check roles/ownership explicitly
- Never expose EF entities directly to the frontend. Use DTOs
- Use parameterized queries. EF Core/LINQ usually does this, but avoid raw SQL unless necessary
- Sanitize and validate all input models before saving to the database
- Hash passwords with ASP.NET Identity. Never store plain text
- Keep connection strings, JWT secrets, and API keys in environment variables or secret storage
- Do not return sensitive fields in API responses
- Use HTTPS in production
- Lock down CORS to your actual frontend domain, use open CORS for development
- Add in-memory rate limiting for login, signup, and public endpoints
- Check authorization on every mutation and sensitive read, not just in the UI
- With TanStack Query, do not assume cached data means authorized access
- On the client, store tokens securely and avoid exposing secrets in local storage if possible
- Disable detailed error messages in production
- You must keep all implementations simple and elegant.
