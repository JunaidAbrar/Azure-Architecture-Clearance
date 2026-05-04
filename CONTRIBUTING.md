# Contributing

This project is a portfolio demonstration. While not actively seeking contributions, the guidelines below document the development standards followed.

## Development Standards

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body - optional>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `refactor` — Code change without feature/fix
- `test` — Adding or fixing tests
- `chore` — Build, config, dependencies
- `perf` — Performance improvement

**Examples:**
```
feat(api): add compliance analysis endpoint with GPT-4o
fix(pdf): prevent blank pages in exported reports
docs(adr): add decision record for vector search choice
```

### Code Style

**Python:**
- Black formatter (line length 100)
- isort for imports
- Type hints required
- Pydantic for data validation

**TypeScript/React:**
- ESLint + Prettier
- Functional components only
- Custom hooks for reusable logic
- TailwindCSS utility classes

### Testing

- pytest for backend
- Tests required for new endpoints
- Mock external services (OpenAI, Cosmos)
- Coverage target: 80%+

### Pull Request Process

1. Branch from `main` with descriptive name: `feat/add-kanban-tracker`
2. Write tests for new functionality
3. Ensure CI passes (lint, type check, tests)
4. Update relevant documentation
5. Request review

### Architecture Decisions

Significant technical decisions require an ADR in `docs/decisions/`:

1. Copy template from existing ADR
2. Document context, options, decision, rationale
3. Include quantitative data where possible
4. Reference in README if user-facing

## Local Setup

See [README.md](README.md#local-development) for environment setup.

## Questions

Open an issue for questions or suggestions.
