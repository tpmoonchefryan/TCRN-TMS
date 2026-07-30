# AGENTS.md

The canonical agent guidance for this repository lives in `CLAUDE.md`. Open it before
changing any source. This file is a deliberate pointer, not a copy — keeping one source
avoids two-file drift.

Three rules you must not miss:

1. **Use the code graph (`codegraph`) instead of grep for structural questions — but run
   `codegraph status` first.** A stale index is worse than grep: grep is slow and honest,
   a stale index is fast and confidently wrong.
2. **If your host is missing an instrument this repository has, say so at the start.**
   Silently falling back to a slower method raises no error and hides the gap from
   everyone.
3. **The platform's governed partitions are no longer all on one machine.** This
   repository's partition is still hosted locally, so ordinary local engine invocation
   applies — but check rather than assume (the recheck command is in `CLAUDE.md`), and do
   not copy a governance recipe from `TCRN-AOS`: its chain moved to another host and its
   ceremony wrapper would drive the wrong machine.

For everything else — host parity, verifying against the authority rather than a local
view, background-load reclaim, and the platform-wide conventions — see `CLAUDE.md`.
