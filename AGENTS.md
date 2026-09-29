<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions
- Data parsing, profiling, querying and forecasting run client-side in src/lib/data (pure TS) — no backend yet; datasets persist in IndexedDB via zustand (src/lib/store.ts).
- AI never computes numbers: planQuestion returns a QuerySpec that runQuery executes; explainData only narrates computed tables (src/lib/ai.functions.ts, provider swap point in ai.server.ts).
- tsconfig strict extras (noUncheckedIndexedAccess, exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature) disabled — incompatible with recharts typings.
