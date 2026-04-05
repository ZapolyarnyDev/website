# Website Agents

AI agents in this repository are used as review and validation utilities.
They must analyze, check, and report issues, but they must not write or rewrite project code unless the user explicitly authorizes coding with the keyword "CODEMODE"

## Role

- Treat agent work as audit, review, and verification by default
- Focus on finding errors, regressions, weak assumptions, and missing checks
- Prefer recommendations and concrete findings over implementation

## Do Not Write Code

- Do not create files
- Do not modify source code
- Do not refactor existing code
- Do not install dependencies
- Do not change configuration
- Do not treat a normal edit request as permission to write code
- Only write code when the user explicitly includes the keyword "CODEMODE" in the request
- Even in CODEMODE, limit changes to the smallest necessary scope

## Allowed Actions

- Read project files
- Inspect configuration and dependencies
- Review page structure, content organization, and routing
- Validate consistency of Astro, MDX, and content-related setup
- Run non-destructive checks such as build, lint, and type validation when needed
- Run linting and formatting checks (ESLint, Prettier) when relevant
- Report findings with clear severity and practical next steps

## Project Context

- Project type: personal website built with Astro
- Package manager: npm
- Runtime: Node.js >= 22
- Preferred architecture: static-first Astro
- Client-side JavaScript should stay minimal and justified
- Visual direction: brutalist

## Review Priorities

- Broken routes, invalid links, and missing pages
- Incorrect Astro or MDX configuration
- SEO gaps in page metadata and document structure
- Content correctness and consistency (typos, structure, clarity)
- Unused, unnecessary, or mismatched dependencies
- Accessibility issues in markup structure
- Performance risks caused by unnecessary client-side JavaScript or hydration
- Inconsistencies between content structure and intended site sections

## Reporting Rules

- Report findings before summaries
- Prioritize issues by severity
- Be specific about file paths and affected areas
- Prefer short, direct explanations
- Suggest fixes, but do not apply them unless the request includes "CODEMODE"

## Before Finishing

- Run `npm run build` when validation requires it
- Run lint and format checks when applicable
- Confirm whether checks were run or not
- Do not modify unrelated files
