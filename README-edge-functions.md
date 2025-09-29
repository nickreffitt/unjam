# Supabase Edge Functions Setup

This project includes a "Hello World" Supabase edge function that can run both locally with Deno and in production with Supabase.

## Project Structure

```
supabase/
└── functions/
    └── hello-world/
        └── index.ts          # The edge function

local-edge-server.ts          # Standalone Deno server for local development
```

## Local Development

### Prerequisites

- Deno installed (automatically installed via `curl -fsSL https://deno.land/install.sh | sh`)
- Add Deno to your PATH: `export PATH="$HOME/.deno/bin:$PATH"`

### Running Locally

Start the local edge function server:

```bash
npm run dev:edge
# or
deno run --allow-net --allow-env --allow-read local-edge-server.ts
```

The server will start on `http://localhost:8001` and provide:
- Root endpoint: `http://localhost:8001/` (server info)
- Hello World function: `http://localhost:8001/hello-world`

### Testing Locally

```bash
# Test with a name
curl -X POST http://localhost:8001/hello-world \
  -H "Content-Type: application/json" \
  -d '{"name": "Developer"}'

# Test without a name (defaults to "World")
curl -X POST http://localhost:8001/hello-world \
  -H "Content-Type: application/json" \
  -d '{}'

# Check server info
curl http://localhost:8001/
```

Expected response:
```json
{
  "message": "Hello Developer!",
  "timestamp": "2025-09-29T08:16:47.504Z",
  "environment": "local"
}
```

## Production Deployment

### Prerequisites

- Supabase CLI installed: `npm install -g @supabase/cli`
- Authenticated with Supabase: `supabase login`
- Linked to your Supabase project: `supabase link --project-ref your-project-ref`

### Deploy to Supabase

```bash
# Deploy the function
supabase functions deploy hello-world

# Test the deployed function
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/hello-world' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Production"}'
```

Expected response:
```json
{
  "message": "Hello Production!",
  "timestamp": "2025-09-29T08:16:47.504Z",
  "environment": "supabase"
}
```

## Function Details

The `hello-world` function:

- **Input**: JSON with optional `name` field
- **Output**: JSON with `message`, `timestamp`, and `environment` fields
- **Methods**: POST (main functionality), OPTIONS (CORS)
- **CORS**: Enabled for all origins
- **Environment Detection**: Returns "local" when running via Deno server, "supabase" when deployed

## Code Architecture

The edge function is designed to work in both environments:

1. **Shared Handler**: The core logic is in an exported `handler` function
2. **Local Server**: Imports the handler and wraps it in routing logic
3. **Supabase Deployment**: Uses the handler directly with Supabase's `serve()` function

This pattern allows you to:
- Develop and test functions locally without deploying
- Share the exact same code between local and production
- Maintain fast development cycles with immediate feedback