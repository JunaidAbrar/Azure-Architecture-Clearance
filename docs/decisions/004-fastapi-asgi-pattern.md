# ADR-004: FastAPI with ASGI Wrapper Pattern

## Status

Accepted

## Context

Azure Functions Python v2 programming model offers two approaches for HTTP APIs:

1. **Individual HTTP Triggers** — One function per endpoint, decorated with `@app.route()`
2. **ASGI Wrapper** — Single function wrapping a full ASGI framework (FastAPI, Starlette)

Clearance requires 7+ endpoints with shared middleware, authentication, and validation logic.

## Decision

Use single Azure Function wrapping FastAPI via `azure.functions.AsgiMiddleware`.

```python
# function_app.py
import azure.functions as func
from api.main import app as fastapi_app

app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
```

## Rationale

### Developer Experience

FastAPI provides:
- Automatic OpenAPI/Swagger documentation
- Pydantic request/response validation
- Dependency injection via `Depends()`
- Middleware pipeline (CORS, auth, logging)
- Hot reload during local development (`uvicorn api.main:app --reload`)

Individual HTTP triggers would require reimplementing these patterns manually.

### Code Organization

```
backend/
├── function_app.py          # Azure Functions entry point (3 lines)
├── api/
│   ├── main.py              # FastAPI app, middleware, routers
│   ├── routers/
│   │   ├── health.py        # GET /health
│   │   ├── upload.py        # POST /upload
│   │   ├── analysis.py      # POST /analyse, GET /report/*
│   │   └── frameworks.py    # GET /frameworks
│   ├── services/
│   │   ├── document.py      # Document Intelligence integration
│   │   ├── analysis.py      # GPT-4o compliance engine
│   │   └── cosmos.py        # Database operations
│   └── models/
│       ├── requests.py      # Pydantic input schemas
│       └── responses.py     # Pydantic output schemas
```

Standard FastAPI project structure. Any Python developer can navigate immediately.

### Testing

FastAPI's `TestClient` enables testing without Azure Functions runtime:

```python
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
```

Tests run in milliseconds. No emulator required.

### Portability

If Azure Functions becomes unsuitable, the FastAPI app deploys unchanged to:
- Azure Container Apps
- Azure App Service
- Any Docker host

The Azure Functions wrapper is a 3-line entry point — not a lock-in.

## Consequences

### Positive

- Standard FastAPI patterns (widely documented, easy to hire for)
- Fast local development cycle
- Automatic API documentation
- Type-safe request/response handling
- Simple testing without Azure emulation

### Trade-offs Accepted

**Single Cold Start**

All endpoints share one function instance. Cold start affects all routes equally.

Mitigation: Pre-warm before demo. Acceptable for async analysis workloads.

**Route-Level Scaling**

Cannot scale individual endpoints independently (e.g., `/analyse` separate from `/health`).

Mitigation: Current scale requirements are uniform. If `/analyse` becomes bottleneck, extract to separate Function App.

**Authentication Configuration**

Must configure CORS and auth at FastAPI level, not via Azure Functions bindings.

Mitigation: FastAPI middleware is more flexible anyway. Static Web Apps handles auth at edge.

## Implementation

### Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 7071
```

### Azure Deployment

```bash
func azure functionapp publish clearance-api-dev
```

### CORS Configuration

```python
# api/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://clearance.azurestaticapps.net",
        "http://localhost:5173"  # Vite dev server
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## References

- [Azure Functions Python v2 ASGI](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python?tabs=asgi)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Validation](https://docs.pydantic.dev/)
