name	brainstorming
description	You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design and get user approval.

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

Checklist

You MUST create a task for each of these items and complete them in order:

Explore project context — check files, docs, recent commits
Ask clarifying questions — one at a time, understand purpose/constraints/success criteria
Propose 2-3 approaches — with trade-offs and your recommendation
Present design — in sections scaled to their complexity, get user approval after each section
Write design doc — save to docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md and commit
Spec self-review — quick inline check for placeholders, contradictions, ambiguity, scope
User reviews written spec — ask user to review the spec file before proceeding
Transition to implementation — invoke writing-plans skill to create implementation plan

The Processes

Understanding the idea:
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Focus on understanding: purpose, constraints, success criteria

Exploring approaches:
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning

Presenting the design:
- Once you believe you understand what you're building, present the design
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

Documentation:
- Write the validated design (spec) to docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
- Commit the design document to git

Implementation:
- Invoke the writing-plans skill to create a detailed implementation plan
