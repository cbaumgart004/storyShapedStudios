---
id: 38
type: Issue
title: UV mode opens in daylight for returning visitors
state: New
tags: needs-info
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "Currently it is defaulting to daylight. Can you make it default to
blacklight?"

**The code already defaults to blacklight.** `frontend/src/context/UvMode.jsx:12-14`
returns `'blacklight'` unless localStorage holds a valid saved mode, so what she
is seeing is her own persisted preference from an earlier session, not a wrong
default. Changing the default constant would fix nothing.

Two real options, and it is a product call, not a bug fix:

1. She clears site data once and the problem goes away for her alone.
2. Drop the persistence, so every visit opens in blacklight regardless of what
   the visitor last chose.

BLOCKED on Whitney picking one. Option 2 means a returning visitor who prefers
daylight gets overridden on every load.

## Discussion
