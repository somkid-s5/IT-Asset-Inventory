---
name: real-user-journey-qa
description: Evaluate an existing product by tracing realistic end-to-end journeys across supported roles and scenarios when asked for journey QA, a usability walkthrough, or role-based flow review.
---
# Real User Journey QA

1. Define each journey's role, goal, start state, steps, expected outcome, and evidence source using only roles and scenarios supported by the product or supplied by the user.
2. Prefer a test environment and seeded data. In live systems, avoid actions that create, send, delete, purchase, or irreversibly change data unless explicitly authorized.
3. Walk each step using available browser, screenshot, accessibility, or code evidence. Separate expected from actual outcomes; mark unreachable steps blocked.
4. Check navigation, feedback, empty/error/loading states, permissions, recovery, and consistency across relevant screens.
5. Report outcomes, evidence, friction, severity, confidence, and next actions. Distinguish usability observations from functional defects.

Do not claim user research or measured UX scores from an agent walkthrough. If qualitative scores are requested, state the rubric and evidence. Do not modify product code unless asked.
