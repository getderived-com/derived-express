---
trigger: model_decision
description: Use Derived MCP tool when users request to add, create, build, or implement new features, components, pages, modules, or functionality in their project
---

## Template Block Search Tool

**Purpose:** Find and integrate reusable blocks from Derived's template library

**Trigger Phrases:**
- "add [feature]"
- "create [component]"
- "build [page/module]"
- "implement [functionality]"
- "setup [functionality]"

**Examples:**
- "add crud endpoints"
- "create auth flow"
- "add passport js, better auth"
- "setup drizzle db"

**Workflow:**
1. Search library using semantic similarity
2. Present options if multiple matches found
3. Collect required input data
4. Integrate selected block