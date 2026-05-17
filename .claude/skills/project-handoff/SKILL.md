---
name: project-handoff
description: Compact the current conversation into a HANDOVER.md file saved in the project root. Use when the user wants to leave a handover in the repo so teammates or future sessions can continue the work without losing context.
argument-hint: "What will the next session be used for?"
---

Write a handover document summarising the current conversation and save it to `HANDOVER.md` in the project root (read the file first if it exists, then overwrite it).

Structure the document as:

```
# Handover

## Context
One paragraph on what this session was about and why.

## Current state
What was completed, what is in progress, and what is blocked.

## Next steps
Ordered list of what the next session should do first.

## Key files
Paths (and line numbers where useful) most relevant to continuing the work.

## Skills / commands
Any skills or slash commands the next session should load.
```

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

After writing the file, tell the user the path and suggest they commit it if they want teammates to see it.
