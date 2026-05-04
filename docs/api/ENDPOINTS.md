# API Reference

Base URL: `https://clearance-api-dev.azurewebsites.net`

## Authentication

All endpoints (except `/health` and `/`) require authentication via Azure Static Web Apps.
User identity is passed via the `x-ms-client-principal` header, automatically injected by the SWA proxy.

---

## Core Endpoints

### Health Check

```
GET /health
```

Returns service status and dependency health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-04T10:30:00Z",
  "version": "2.0.0",
  "dependencies": {
    "cosmos_db": true,
    "blob_storage": true,
    "openai": true,
    "document_intelligence": true
  },
  "demo_mode": false
}
```

---

### Upload Document

```
POST /upload
Content-Type: multipart/form-data
```

Upload a PDF document for compliance assessment.

**Request:**
- `file`: PDF file (max 50MB, 20 pages)

**Response:**
```json
{
  "upload_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "security-policy.pdf",
  "status": "uploaded",
  "size_bytes": 245678,
  "timestamp": "2026-05-04T10:30:00Z"
}
```

**Errors:**
- `415` - Invalid file type (PDF only)
- `413` - File too large

---

### Extract Text

```
POST /extract?upload_id={upload_id}
```

Extract text from uploaded PDF using Azure Document Intelligence.
Generates embeddings and stores chunks in Cosmos DB.

**Parameters:**
- `upload_id` (required): UUID from upload response

**Response:**
```json
{
  "upload_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "extracted",
  "chunk_count": 24,
  "page_count": 12,
  "sections": ["Introduction", "Access Control", "Incident Response"]
}
```

---

### Analyse Document

```
POST /analyse
Content-Type: application/json
```

Run compliance analysis against selected framework.

**Request:**
```json
{
  "upload_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_name": "SkyNet Corporation",
  "framework": "combined",
  "user_id": "user@company.com.au"
}
```

**Framework Options:**
- `disp` - DISP Entry Level (28 requirements)
- `e8` - ASD Essential Eight ML2 (8 controls)
- `combined` - Both frameworks (36 requirements)

**Response:**
```json
{
  "report_id": "report-uuid",
  "company_name": "SkyNet Corporation",
  "framework": "combined",
  "status": "complete",
  "overall_score": 23,
  "assessment_date": "2026-05-04T10:35:00Z",
  "domain_summary": [
    {
      "domain": "Security Governance",
      "pass": 2,
      "partial": 4,
      "fail": 8,
      "total": 14
    }
  ],
  "findings": [...],
  "executive_summary": "..."
}
```

**Processing Time:** 30-90 seconds depending on document size.

---

### Get User Reports

```
GET /reports/{user_id}
```

List all assessment reports for a user.

**Response:**
```json
{
  "user_id": "user@company.com.au",
  "reports": [
    {
      "report_id": "report-uuid",
      "company_name": "SkyNet Corporation",
      "framework": "combined",
      "overall_score": 23,
      "status": "complete",
      "assessment_date": "2026-05-04T10:35:00Z"
    }
  ],
  "total_count": 1
}
```

---

### Get Report Detail

```
GET /report/{report_id}
```

Get full assessment report with all findings.

**Response:** Full report object (see `/analyse` response).

---

### Update Gap Status

```
PATCH /report/{report_id}/gap/{gap_id}
Content-Type: application/json
```

Update remediation status of a compliance gap.

**Request:**
```json
{
  "status": "in_progress"
}
```

**Status Options:**
- `open` - Not started
- `in_progress` - Being addressed
- `resolved` - Remediation complete

**Response:**
```json
{
  "gap_id": "DISP-SG-001",
  "status": "in_progress",
  "updated_at": "2026-05-04T11:00:00Z",
  "overall_score": 27
}
```

---

## Framework Endpoints

### List Frameworks

```
GET /frameworks
```

List available compliance frameworks.

**Response:**
```json
{
  "frameworks": [
    {
      "id": "disp",
      "name": "DISP Entry Level",
      "description": "Defence Industry Security Programme",
      "requirement_count": 28,
      "domains": ["Security Governance", "Personnel Security", "Physical Security", "Information & Cybersecurity"]
    },
    {
      "id": "e8",
      "name": "ASD Essential Eight",
      "description": "Maturity Level 2",
      "requirement_count": 8,
      "domains": ["Application Control", "Patch Applications", ...]
    }
  ]
}
```

---

### Get Control Mapping

```
GET /control-mapping
```

Get DISP-to-E8 control mapping for cross-reference analysis.

**Response:**
```json
{
  "mappings": [
    {
      "disp_id": "DISP-IC-002",
      "e8_controls": ["E8-MFA", "E8-RAP"],
      "efficiency_note": "Single MFA implementation satisfies both requirements"
    }
  ]
}
```

---

## Tracker Endpoints

### Get Tracker Gaps

```
GET /tracker/gaps/{user_id}
```

Get all gaps aggregated by company for remediation tracker.

**Response:**
```json
{
  "companies": [
    {
      "company_name": "SkyNet Corporation",
      "report_id": "report-uuid",
      "gaps": {
        "open": [...],
        "in_progress": [...],
        "resolved": [...]
      },
      "stats": {
        "total": 28,
        "open": 18,
        "in_progress": 5,
        "resolved": 5
      }
    }
  ]
}
```

---

## Template Endpoints

### List Templates

```
GET /templates
```

List available remediation templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "template_sg_001",
      "requirement_id": "DISP-SG-001",
      "title": "Security Governance Policy",
      "quick_win": true,
      "estimated_hours": 4
    }
  ]
}
```

---

### Get Template

```
GET /templates/{template_id}
```

Get step-by-step remediation guidance.

**Response:**
```json
{
  "id": "template_sg_001",
  "requirement_id": "DISP-SG-001",
  "title": "Security Governance Policy",
  "steps": [
    "Define security governance objectives aligned with DISP requirements",
    "Establish a Security Committee with defined roles",
    "..."
  ],
  "resources": [
    {
      "title": "DISP Security Governance Guide",
      "url": "https://..."
    }
  ]
}
```

---

## Access Control Endpoints

### Get Access Status

```
GET /access-status/{user_email}
```

Check remaining free assessments for a domain.

**Response:**
```json
{
  "email": "user@company.com.au",
  "domain": "company.com.au",
  "scans_used": 1,
  "scans_remaining": 1,
  "pilot_status": "eligible"
}
```

---

### Request Pilot Access

```
POST /request-pilot-access
Content-Type: application/json
```

Request to join the founding pilot program.

**Request:**
```json
{
  "user_email": "user@company.com.au",
  "company_name": "Company Pty Ltd",
  "message": "Interested in DISP compliance for upcoming tender"
}
```

---

## Survey Endpoint

### Submit Survey

```
POST /survey
Content-Type: application/json
```

Submit post-scan feedback survey.

**Request:**
```json
{
  "user_email": "user@company.com.au",
  "report_id": "report-uuid",
  "source": "LinkedIn",
  "challenge": "Understanding DISP requirements",
  "nps_score": 8
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing the issue"
}
```

**Common Status Codes:**
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing authentication)
- `403` - Forbidden (access denied)
- `404` - Not found
- `413` - Payload too large
- `415` - Unsupported media type
- `422` - Validation error
- `429` - Rate limited
- `500` - Internal server error
- `502` - Upstream service error (Azure)
- `503` - Service unavailable

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/analyse` | 10/day per domain (free tier) |
| `/upload` | 20/hour per user |
| All others | 100/minute per user |

Rate limit headers included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Demo Mode

When `DEMO_MODE=true`, the API serves pre-computed seed data instead of calling Azure services:

- `/reports/{user_id}` returns 3 demo companies
- `/report/{report_id}` returns full demo reports
- `/analyse` returns instantly with demo data
- No Azure credits consumed

Demo mode is enabled for offline demos and development.
