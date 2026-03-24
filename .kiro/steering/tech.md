# Tech Stack & Build

## Stack

- **Runtime**: Browser (SPA)
- **Language**: TypeScript (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- **UI**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS (loaded via CDN `cdn.tailwindcss.com`) + custom CSS variables in `index.css` (iOS "Liquid Glass" design system)
- **Build**: Vite 5 with `@vitejs/plugin-react`
- **Backend**: Supabase (direct client connection via `@supabase/supabase-js`)
- **Module**: ESNext modules (`"type": "module"`)

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (Vite, port 5173, host 0.0.0.0) |
| Production build | `npm run build` |
| Preview build | `npm run preview` |

There is no test runner, linter, or formatter configured in the project.

## Environment Variables

Defined via Vite's `import.meta.env`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

Fallback defaults are hardcoded in `services/supabaseClient.ts`.

## Key Libraries

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `@supabase/supabase-js` | Database client |
| `vite` | Build tooling |

## TypeScript Config

- Target: ES2020, JSX: react-jsx
- Module resolution: bundler
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
