# Data Flow

## Assessment Pipeline

The core value flow: PDF upload → AI analysis → compliance report.

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Upload  │────▶│ Extract │────▶│  Index   │────▶│ Analyse │────▶│  Report  │
│  PDF    │     │  Text   │     │ Vectors  │     │  Gaps   │     │ Generate │
└─────────┘     └─────────┘     └──────────┘     └─────────┘     └──────────┘
     │               │               │                │               │
     ▼               ▼               ▼                ▼               ▼
 Blob Store    Doc Intel      Cosmos DB +       Azure OpenAI     Cosmos DB
               prebuilt-read   OpenAI Embed       GPT-4o         assessments
```

## Stage 1: Document Upload

**Trigger:** User drops PDF into upload zone

```
Frontend                          Backend                         Storage
   │                                 │                               │
   │ POST /upload                    │                               │
   │ multipart/form-data             │                               │
   │ ──────────────────────────────▶ │                               │
   │                                 │                               │
   │                                 │ Generate upload_id (UUID)     │
   │                                 │                               │
   │                                 │ PUT blob                      │
   │                                 │ ─────────────────────────────▶│
   │                                 │                               │
   │                                 │ ◀───────────────────────────  │
   │                                 │ 201 Created                   │
   │                                 │                               │
   │ ◀────────────────────────────── │                               │
   │ { upload_id, filename, status } │                               │
```

**Output:** `upload_id` for tracking, PDF stored in Blob container.

## Stage 2: Text Extraction

**Trigger:** POST /analyse with upload_id

```
Backend                     Document Intelligence              Cosmos DB
   │                                 │                            │
   │ analyzeDocument(blob_url)       │                            │
   │ ───────────────────────────────▶│                            │
   │                                 │                            │
   │ ◀─────────────────────────────  │                            │
   │ { paragraphs[], tables[] }      │                            │
   │                                 │                            │
   │ For each paragraph:                                          │
   │   - Extract section role                                     │
   │   - Preserve page number                                     │
   │   - Chunk if >500 tokens                                     │
   │                                 │                            │
   │ Store chunks (without embeddings yet)                        │
   │ ───────────────────────────────────────────────────────────▶ │
```

**Output:** Structured chunks with metadata:
```json
{
  "id": "chunk-uuid",
  "upload_id": "upload-uuid",
  "section": "Access Control Policy",
  "page": 4,
  "content": "All employees must use multi-factor authentication...",
  "embedding": null
}
```

## Stage 3: Semantic Indexing

**Trigger:** Chunks stored, ready for embedding

```
Backend                        Azure OpenAI                    Cosmos DB
   │                                │                              │
   │ Batch embed all chunks         │                              │
   │ (single API call)              │                              │
   │ ──────────────────────────────▶│                              │
   │                                │                              │
   │ ◀──────────────────────────────│                              │
   │ [[0.023, -0.451, ...], ...]    │                              │
   │                                │                              │
   │ Update chunks with embeddings  │                              │
   │ ────────────────────────────────────────────────────────────▶ │
```

**Optimization:** Single embedding API call for all chunks (batch), not per-chunk calls.

**Output:** Chunks with 1536-dimension embeddings stored, vector index updated.

## Stage 4: Compliance Analysis

**Trigger:** Embeddings complete, framework selected

```
For each requirement in framework (36 total for Combined):

Backend                        Azure OpenAI                    Cosmos DB
   │                                │                              │
   │ Embed requirement text         │                              │
   │ ──────────────────────────────▶│                              │
   │ ◀──────────────────────────────│                              │
   │                                │                              │
   │ Vector search: top 3 chunks    │                              │
   │ ────────────────────────────────────────────────────────────▶ │
   │ ◀────────────────────────────────────────────────────────────│
   │ [chunk1, chunk2, chunk3]       │                              │
   │                                │                              │
   │ GPT-4o: Assess compliance      │                              │
   │ ──────────────────────────────▶│                              │
   │ System: "You are a defence     │                              │
   │   compliance analyst..."       │                              │
   │ User: requirement + chunks     │                              │
   │                                │                              │
   │ ◀──────────────────────────────│                              │
   │ {                              │                              │
   │   "status": "partial",         │                              │
   │   "evidence_quote": "...",     │                              │
   │   "gap_description": "...",    │                              │
   │   "recommended_action": "..."  │                              │
   │ }                              │                              │
```

**Rate Limit Handling:**
```
if response.status == 429:
    delay = min(30, base_delay * 2^attempt + jitter)
    await asyncio.sleep(delay)
    retry()
```

**Parallelization:** Process 3 requirements concurrently to balance speed vs. rate limits.

## Stage 5: Report Generation

**Trigger:** All requirements analysed

```
Backend                        Azure OpenAI                    Cosmos DB
   │                                │                              │
   │ Aggregate findings by domain   │                              │
   │                                │                              │
   │ Calculate scores:              │                              │
   │   overall = pass / total       │                              │
   │   priority = risk*10 - effort*3│                              │
   │                                │                              │
   │ Generate executive summary     │                              │
   │ ──────────────────────────────▶│                              │
   │ GPT-4o: "Summarize findings"   │                              │
   │ ◀──────────────────────────────│                              │
   │                                │                              │
   │ Store complete report          │                              │
   │ ────────────────────────────────────────────────────────────▶ │
   │                                │                              │
   │ Update status: "complete"      │                              │
   │ ────────────────────────────────────────────────────────────▶ │
```

**Output:** Complete report document:
```json
{
  "report_id": "uuid",
  "user_id": "user-uuid",
  "company_name": "SkyNet Corporation",
  "framework": "combined",
  "status": "complete",
  "overall_score": 23,
  "domain_summary": [
    { "domain": "Security Governance", "pass": 2, "partial": 4, "fail": 8 }
  ],
  "findings": [...],
  "executive_summary": "...",
  "created_at": "2026-05-04T10:30:00Z"
}
```

## Progress Polling

Frontend polls for status during analysis:

```
Frontend                          Backend
   │                                 │
   │ GET /report/{id}                │
   │ ──────────────────────────────▶ │
   │                                 │
   │ ◀────────────────────────────── │
   │ { status: "analysing",          │
   │   progress: {                   │
   │     current: 12,                │
   │     total: 36,                  │
   │     stage: "Security Governance"│
   │   }                             │
   │ }                               │
   │                                 │
   │ [wait 2 seconds]                │
   │                                 │
   │ GET /report/{id}                │
   │ ──────────────────────────────▶ │
   │ ...                             │
```

## Remediation Update

User marks gap as resolved:

```
Frontend                          Backend                       Cosmos DB
   │                                 │                              │
   │ PATCH /report/{id}/gap/{gap_id} │                              │
   │ { "status": "resolved" }        │                              │
   │ ──────────────────────────────▶ │                              │
   │                                 │                              │
   │                                 │ Update gap status            │
   │                                 │ ───────────────────────────▶ │
   │                                 │                              │
   │                                 │ Recalculate overall_score    │
   │                                 │ ───────────────────────────▶ │
   │                                 │                              │
   │ ◀────────────────────────────── │                              │
   │ { gap: updated, score: 27 }     │                              │
```

## PDF Export

Client-side generation (no server round-trip):

```
Frontend (Browser)
   │
   │ User clicks "Download PDF"
   │
   │ Render <ReportPDFLayout> to hidden div
   │   - White background
   │   - Print-safe fonts
   │   - Page break markers
   │
   │ html2canvas: capture each section
   │
   │ jsPDF: assemble pages
   │   - Cover page
   │   - Table of contents
   │   - Executive summary
   │   - Findings by domain
   │   - Recommended actions
   │
   │ Trigger browser download
   │   Clearance_SkyNet_DISP_2026-05-04.pdf
```

## Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Uploaded PDFs | 90 days | Re-analysis capability |
| Document chunks | 90 days | Linked to uploads |
| Assessment reports | Indefinite | Customer value |
| Generated PDFs | 7 days | Cache, regenerable |
| Access logs | 90 days | Audit trail |

## Error Handling

| Stage | Error | Response |
|-------|-------|----------|
| Upload | File too large | 413, "Maximum 50MB" |
| Upload | Invalid format | 415, "PDF only" |
| Extract | Doc Intel failure | 502, retry 3x, then fail gracefully |
| Analyse | Rate limited | Exponential backoff, continue |
| Analyse | GPT-4o timeout | Skip requirement, mark as "error" |
| Any | Cosmos unavailable | 503, "Service temporarily unavailable" |

**Principle:** Partial success preferred over total failure. If 34/36 requirements analyse successfully, show results with 2 marked as "analysis failed — retry."
