# Project Steering Rules

## Code Quality

1. **Ask "how would this be used in a real app?" before writing.** Not just make it pass a test.
2. **Look at the AngularJS reference** to understand what the original actually did. Don't approximate — understand, then implement properly.
3. **Consider locale, edge cases, real data.** Not just the happy path with hardcoded values.
4. **No shortcuts.** Every function must work as if it's going into production. If it's not production-ready, don't ship it.
5. **If unsure about a design choice, ask.** Don't guess with a minimal implementation.

## Git

1. **Never run git commands.** No commit, no branch, no checkout, no push, no merge, no rebase, no stash. No exceptions. The user manages git.

## Workflow

1. **One task at a time.** "continue" means "next task". Complete it, show the result, stop and wait.
2. **Don't batch multiple tasks** unless explicitly told to.

## Implementation Standards

1. **Use Intl APIs** for anything locale-sensitive (numbers, dates, currency, lists, plurals).
2. **Validators must work like AngularJS $validators** — object format with boolean return is the primary API for migration compatibility.
3. **Formatters must handle real-world data** — thousand separators, locale-aware, edge cases (null, empty, NaN).
4. **No trivial wrappers.** If a function just calls `String(v)` or does something JavaScript already does implicitly, it shouldn't exist.
