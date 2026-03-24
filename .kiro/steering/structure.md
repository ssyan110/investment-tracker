# Project Structure

```
├── index.html            # Entry HTML (loads Tailwind CDN + index.tsx)
├── index.tsx             # React root mount
├── index.css             # Global CSS design system (variables, glass components, animations)
├── App.tsx               # Root component — routing, state management, all handlers
├── types.ts              # Shared TypeScript types and enums (Asset, Transaction, InventoryState, etc.)
├── engine.ts             # Pure calculation engine (inventory state, golden test)
├── utils.ts              # Formatting helpers (round, formatCurrency, formatUnit)
├── components/
│   ├── AddAssetForm.tsx       # Modal form for creating new assets
│   ├── DataManagement.tsx     # Export/Import/Reset controls
│   ├── InventoryTable.tsx     # Audit trail view of inventory state history
│   ├── LedgerTable.tsx        # Sortable/searchable transaction list
│   ├── PortfolioDashboard.tsx # Summary cards + holdings list
│   └── TransactionForm.tsx    # BUY/SELL transaction entry/edit form
├── services/
│   ├── supabaseClient.ts      # Supabase client initialization
│   ├── storage.ts             # CRUD operations + localStorage cache layer
│   └── marketData.ts          # Deprecated — manual price entry only
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Architecture Patterns

- **Flat structure**: No deep nesting. Root-level files for core logic, `components/` for UI, `services/` for data access.
- **State lives in App.tsx**: All application state and handlers are in the root `App` component. Child components receive data and callbacks via props.
- **Pure engine**: `engine.ts` has zero side effects. It takes transactions + asset and returns derived inventory state.
- **DB ↔ App mapping**: Supabase uses `snake_case` columns. `services/storage.ts` converts to/from `camelCase` TypeScript interfaces.
- **Components are exported as named exports** (e.g., `export const LedgerTable`), not default exports.
- **No routing library**: View switching is handled via a `ViewState` union type (`'HOME' | 'ASSET_DETAIL'`) in App.tsx.
- **Modals/sheets**: Rendered inline in App.tsx, toggled by boolean state flags.
