name	writing-plans
description	Use when you have a spec or requirements for a multi-step task, before touching code
Writing Plans

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Announce at start: "I'm using the writing-plans skill to create the implementation plan."

Save plans to: docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md

Bite-Sized Task Granularity
Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

Plan Document Header
# [Feature Name] Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers/executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]

---

Task Structure
### Task N: [Component Name]
**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

No Placeholders
Every step must contain the actual content an engineer needs.
- No "TBD", "TODO", "implement later"
- No "Add appropriate error handling" (show the code)
- No "Write tests for the above" (show the code)

Execution Handoff
After saving the plan, announce completion and start executing.
