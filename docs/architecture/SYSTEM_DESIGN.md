# System Design

## Overview

Clearance is an AI-powered compliance assessment platform that analyses security documentation against DISP (Defence Industry Security Programme) and ASD Essential Eight requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUSTRALIA EAST REGION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │    Users     │───▶│  Static Web App  │───▶│    Azure Functions       │  │
│  │  (M365 SSO)  │    │  (React + Auth)  │    │    (FastAPI Backend)     │  │
│  └──────────────┘    └──────────────────┘    └───────────┬──────────────┘  │
│                                                          │                  │
│                      ┌───────────────────────────────────┼──────────────┐  │
│                      │                                   │              │  │
│                      ▼                                   ▼              ▼  │
│  ┌──────────────────────────┐  ┌─────────────────┐  ┌────────────────┐    │
│  │      Azure OpenAI        │  │   Cosmos DB     │  │  Blob Storage  │    │
│  │  ┌─────────┐ ┌────────┐  │  │  ┌───────────┐  │  │  ┌──────────┐  │    │
│  │  │ GPT-4o  │ │Embed   │  │  │  │assessments│  │  │  │documents │  │    │
│  │  │         │ │-3-small│  │  │  │chunks     │  │  │  │          │  │    │
│  │  └─────────┘ └────────┘  │  │  └───────────┘  │  │  └──────────┘  │    │
│  └──────────────────────────┘  └─────────────────┘  └────────────────┘    │
│                                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  Document Intelligence   │  │          Application Insights          │ │
│  │      (PDF → Text)        │  │         (Monitoring + Telemetry)        │ │
│  └──────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend — Azure Static Web Apps

| Aspect | Detail |
|--------|--------|
| Framework | React 18 + Vite |
| Styling | TailwindCSS (dark utility theme) |
| Auth | Entra ID via built-in SWA authentication |
| Hosting | Azure Static Web Apps Free tier |
| CDN | Azure CDN (included with SWA) |

**Responsibilities:**
- User authentication flow
- Document upload interface
- Real-time analysis progress display
- Report visualization and interaction
- Remediation Kanban tracker
- PDF report generation (client-side)

### Backend — Azure Functions

| Aspect | Detail |
|--------|--------|
| Runtime | Python 3.11 |
| Framework | FastAPI wrapped via ASGI |
| Hosting | Azure Functions Consumption plan |
| Auth | Receives verified identity via x-ms-client-principal |

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | /health | Liveness + dependency status |
| GET | /frameworks | List available compliance frameworks |
| POST | /upload | Store PDF in Blob, extract text |
| POST | /analyse | Run compliance analysis pipeline |
| GET | /reports/{user_id} | List user's assessments |
| GET | /report/{report_id} | Full report detail |
| PATCH | /report/{id}/gap/{gap_id} | Update gap status |

### AI Layer — Azure OpenAI

| Model | Purpose | Dimensions |
|-------|---------|------------|
| gpt-4o | Compliance analysis, gap identification | — |
| text-embedding-3-small | Semantic search embeddings | 1536 |

**Analysis Pattern:**
1. Embed requirement text
2. Vector search for relevant document chunks
3. GPT-4o evaluates evidence against requirement
4. Structured JSON output with citations

### Database — Cosmos DB (Serverless)

**Containers:**

| Container | Partition Key | Purpose |
|-----------|---------------|---------|
| assessments | /user_id | Reports, gaps, remediation status |
| chunks | /upload_id | Document text with vector embeddings |
| pilot_domains | /domain | Access control allowlist |
| leads | /domain | Customer discovery data |

**Vector Search Configuration:**
- Index type: quantizedFlat
- Dimensions: 1536
- Distance function: cosine

### Document Processing — Document Intelligence

| Aspect | Detail |
|--------|--------|
| Model | prebuilt-read |
| Tier | F0 (free: 500 pages/month) |
| Output | Paragraphs with page numbers, section roles |

### Storage — Blob Storage

| Container | Purpose |
|-----------|---------|
| documents | Uploaded PDFs (retained for re-analysis) |
| reports | Generated PDF exports (cached) |

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Security Boundaries                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Internet ──▶ [Static Web Apps Edge Auth]                      │
│                        │                                       │
│                        ▼                                       │
│               Authenticated requests only                      │
│                        │                                       │
│                        ▼                                       │
│              [Azure Functions (private)]                       │
│                        │                                       │
│           ┌───────────┼───────────┬──────────────┐            │
│           ▼           ▼           ▼              ▼            │
│       [OpenAI]    [Cosmos]    [Blob]    [Doc Intel]           │
│                                                                │
│  All internal services: no public endpoints                    │
│  Managed identity for service-to-service auth                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Security Controls:**
- Entra ID authentication required for all routes except landing page
- Cosmos DB firewall: Azure services only
- Blob Storage: private containers, SAS tokens for upload
- OpenAI: API key in Key Vault (production) / env vars (dev)
- All traffic encrypted in transit (TLS 1.2+)

## Scalability Considerations

### Current State (MVP)

| Component | Capacity | Bottleneck |
|-----------|----------|------------|
| Functions Consumption | 200 concurrent | Cold start latency |
| Cosmos Serverless | 50 RU/s baseline | Burstable to 5000 |
| OpenAI GPT-4o | TPM quota | Rate limiting (retry logic) |
| Doc Intelligence F0 | 500 pages/month | Hard limit |

### Growth Path

| Trigger | Action |
|---------|--------|
| >50 concurrent users | Functions Premium for warm instances |
| >500 pages/month | Doc Intelligence S0 ($1.50/1K pages) |
| >1000 assessments/month | Cosmos provisioned throughput |
| Multi-region demand | Azure Front Door + regional Functions |

## Cost Model

### Fixed Costs

**$0/month** — All services consumption-based.

### Variable Costs (per assessment)

| Service | Usage | Cost |
|---------|-------|------|
| GPT-4o | ~80K tokens | $0.40 |
| Embeddings | ~20K tokens | $0.01 |
| Cosmos DB | ~50 RUs | $0.01 |
| Functions | ~10 executions | $0.00 |
| Doc Intel F0 | 10 pages | $0.00 |
| **Total** | | **~$0.50** |

### Monthly Projections

| Assessments | Cost |
|-------------|------|
| 10 (testing) | $5 |
| 50 (pilot) | $25 |
| 200 (early customers) | $100 |
| 1000 (growth) | $500 |

## Monitoring

### Application Insights

- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- Dependency call success/failure
- Custom events: assessment_started, assessment_completed, pdf_exported

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >5% | Investigate immediately |
| P95 latency | >30s | Check OpenAI quotas |
| Failed dependencies | Any | Check service health |
| Daily cost | >$5 | Review usage patterns |

### Logs

Structured JSON logging to Application Insights:
```json
{
  "event": "analysis_complete",
  "user_id": "...",
  "report_id": "...",
  "duration_ms": 45000,
  "requirements_analysed": 36,
  "gaps_found": 18
}
```
