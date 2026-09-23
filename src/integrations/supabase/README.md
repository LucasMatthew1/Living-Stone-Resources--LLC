# Supabase (generated apps)

Webura generates **`client.ts`** in this folder when your app is linked to a Supabase project. It uses **`@supabase/supabase-js`** `createClient` with your project URL and publishable (anon) key.

## Imports

Use the Vite alias:

```ts
import { supabase } from "@/integrations/supabase/client";
```

## Environment variables

For hand-written client code (or splitting config), prefer **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** in `.env.local` — see the root **`.env.example`**.

## Schema changes

Apply DDL with Webura’s **execute SQL** tooling against your linked project. **Do not** hand-edit `supabase/migrations/*` in generated apps unless you fully own that workflow — Webura’s agent guidance treats those as externally managed.
