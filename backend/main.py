"""
Clearance API - FastAPI Backend
Defence Compliance Assessment Platform
"""

import os
import json
import uuid
import time
import random
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from dotenv import load_dotenv

# Azure SDKs
from azure.storage.blob import BlobServiceClient
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import AzureError
from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import CosmosHttpResponseError

# OpenAI SDK (configured for Azure)
from openai import AzureOpenAI

# Email notifications
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

# Quality Engine v2.0
from quality_engine import (
    validate_finding,
    parse_structured_gap_response,
    get_cross_references,
    ENHANCED_SYSTEM_PROMPT,
    build_enhanced_user_prompt,
)

# Load environment variables
load_dotenv()

# Configure Resend for email notifications
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL")  # Your email to receive notifications

if RESEND_AVAILABLE and RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# DEMO MODE Configuration
# ============================================================================
# When DEMO_MODE=true, the API serves pre-computed seed data instead of
# calling Azure services. This enables offline demos and failsafe operation.

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

def load_demo_reports():
    """Load pre-computed demo reports from seed-data directory."""
    if not DEMO_MODE:
        return {}

    seed_dir = Path(__file__).parent.parent / "seed-data"
    demo_reports = {}

    seed_files = [
        "skynet_corporation.json",
        "adelaide_precision.json",
        "secureshield_defence.json"
    ]

    for filename in seed_files:
        filepath = seed_dir / filename
        if filepath.exists():
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    report = json.load(f)
                    demo_reports[report["report_id"]] = report
                    logger.info(f"DEMO_MODE: Loaded {report['company_name']}")
            except Exception as e:
                logger.warning(f"DEMO_MODE: Failed to load {filename}: {e}")

    return demo_reports

# Load demo data on startup if in DEMO_MODE
DEMO_REPORTS = load_demo_reports()
if DEMO_MODE:
    logger.info(f"DEMO_MODE ENABLED: Loaded {len(DEMO_REPORTS)} demo reports")


# ============================================================================
# ACCESS CONTROL & CREDIT PROTECTION
# ============================================================================
# Protect Azure credits during pilot phase with domain gating and usage limits.

# Kill switch - set to "false" to block all new assessments
CLEARANCE_ENABLED = os.getenv("CLEARANCE_ENABLED", "true").lower() == "true"

# Global daily assessment cap (resets at midnight UTC)
CLEARANCE_DAILY_CAP = int(os.getenv("CLEARANCE_DAILY_CAP", "10"))

# Maximum pages per document upload
CLEARANCE_PAGE_LIMIT = int(os.getenv("CLEARANCE_PAGE_LIMIT", "20"))

# Free assessments per domain before requiring pilot signup
CLEARANCE_FREE_SCANS_PER_DOMAIN = int(os.getenv("CLEARANCE_FREE_SCANS_PER_DOMAIN", "2"))

# Admin emails with unlimited access (bypass domain limits)
ADMIN_EMAILS = [
    "junaid.abrar.razeen@gmail.com",
]

# Personal email domains that are blocked (must use work email)
BLOCKED_PERSONAL_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "hotmail.co.uk",
    "outlook.com",
    "outlook.co.uk",
    "live.com",
    "live.co.uk",
    "msn.com",
    "yahoo.com",
    "yahoo.co.uk",
    "yahoo.com.au",
    "icloud.com",
    "me.com",
    "mac.com",
    "protonmail.com",
    "proton.me",
    "aol.com",
    "mail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "gmx.net",
]

def is_admin_user(email: str) -> bool:
    """Check if email is in admin allowlist."""
    return email.lower() in [e.lower() for e in ADMIN_EMAILS]

def is_personal_email(email: str) -> bool:
    """Check if email is from a blocked personal email domain."""
    domain = extract_domain_from_email(email)
    return domain.lower() in [d.lower() for d in BLOCKED_PERSONAL_DOMAINS]

# In-memory tracking for daily usage (resets on restart)
# In production, this would be stored in Cosmos DB
_daily_assessment_count = 0
_daily_reset_date = datetime.utcnow().date()


def check_daily_cap() -> tuple[bool, int]:
    """Check if daily assessment cap has been reached. Returns (allowed, remaining)."""
    global _daily_assessment_count, _daily_reset_date

    today = datetime.utcnow().date()
    if today > _daily_reset_date:
        _daily_assessment_count = 0
        _daily_reset_date = today

    remaining = CLEARANCE_DAILY_CAP - _daily_assessment_count
    return remaining > 0, remaining


def increment_daily_count():
    """Increment the daily assessment counter."""
    global _daily_assessment_count
    _daily_assessment_count += 1


def extract_domain_from_email(email: str) -> str:
    """Extract domain from email address."""
    if "@" in email:
        return email.split("@")[1].lower()
    return email.lower()


def get_domain_usage(domain: str) -> dict:
    """
    Get usage stats for a domain from Cosmos DB.
    Returns: {domain, assessment_count, first_scan_date, company_name}
    """
    try:
        cosmos_db = get_cosmos_client()
        domains_container = cosmos_db.get_container_client("pilot_domains")

        query = "SELECT * FROM c WHERE c.domain = @domain"
        params = [{"name": "@domain", "value": domain}]
        items = list(domains_container.query_items(query, parameters=params, enable_cross_partition_query=True))

        if items:
            return items[0]
        return None
    except Exception as e:
        logger.warning(f"Failed to get domain usage for {domain}: {e}")
        return None


def record_domain_usage(domain: str, user_email: str, company_name: str) -> dict:
    """
    Record or update domain usage in Cosmos DB.
    Returns updated domain record.
    """
    try:
        cosmos_db = get_cosmos_client()
        domains_container = cosmos_db.get_container_client("pilot_domains")

        existing = get_domain_usage(domain)

        if existing:
            # Update existing record
            existing["assessment_count"] = existing.get("assessment_count", 0) + 1
            existing["last_scan_date"] = datetime.utcnow().isoformat()
            existing["last_user_email"] = user_email
            domains_container.upsert_item(existing)
            return existing
        else:
            # Create new record
            new_record = {
                "id": domain,
                "domain": domain,
                "company_name": company_name,
                "assessment_count": 1,
                "first_scan_date": datetime.utcnow().isoformat(),
                "last_scan_date": datetime.utcnow().isoformat(),
                "first_user_email": user_email,
                "last_user_email": user_email,
                "pilot_status": "free_trial"  # free_trial, pilot_requested, pilot_active
            }
            domains_container.upsert_item(new_record)
            return new_record
    except Exception as e:
        logger.error(f"Failed to record domain usage for {domain}: {e}")
        return None


def check_domain_access(domain: str) -> tuple[bool, str, int]:
    """
    Check if domain has access to run assessments.
    Returns: (allowed, message, scans_remaining)
    """
    usage = get_domain_usage(domain)

    if not usage:
        # First time - allowed
        return True, "Welcome! You have 2 free assessments.", CLEARANCE_FREE_SCANS_PER_DOMAIN

    count = usage.get("assessment_count", 0)
    status = usage.get("pilot_status", "free_trial")

    # Pilot members have unlimited access
    if status == "pilot_active":
        return True, "Pilot member - unlimited access.", -1

    # Check free scan limit
    if count >= CLEARANCE_FREE_SCANS_PER_DOMAIN:
        return False, "You've used your free assessments. Join our founding pilot to continue.", 0

    remaining = CLEARANCE_FREE_SCANS_PER_DOMAIN - count
    return True, f"You have {remaining} free assessment(s) remaining.", remaining


if not CLEARANCE_ENABLED:
    logger.warning("CLEARANCE_ENABLED=false - All new assessments are blocked")
else:
    logger.info(f"Access Control: daily_cap={CLEARANCE_DAILY_CAP}, page_limit={CLEARANCE_PAGE_LIMIT}, free_scans={CLEARANCE_FREE_SCANS_PER_DOMAIN}")


# ============================================================================
# Azure Service Clients
# ============================================================================

def get_blob_service_client():
    """Initialize Azure Blob Storage client."""
    connection_string = os.getenv("STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise ValueError("STORAGE_CONNECTION_STRING not configured")
    return BlobServiceClient.from_connection_string(connection_string)


def get_document_analysis_client():
    """Initialize Azure Document Intelligence client."""
    endpoint = os.getenv("DOCUMENT_INTELLIGENCE_ENDPOINT")
    key = os.getenv("DOCUMENT_INTELLIGENCE_KEY")
    if not endpoint or not key:
        raise ValueError("Document Intelligence credentials not configured")
    return DocumentAnalysisClient(endpoint=endpoint, credential=AzureKeyCredential(key))


def get_openai_client():
    """Initialize Azure OpenAI client."""
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    key = os.getenv("AZURE_OPENAI_API_KEY")
    if not endpoint or not key:
        raise ValueError("Azure OpenAI credentials not configured")

    # Ensure endpoint ends with /
    if not endpoint.endswith('/'):
        endpoint = endpoint + '/'

    return AzureOpenAI(
        api_key=key,
        api_version="2024-10-21",  # Latest stable API version
        azure_endpoint=endpoint
    )


def get_cosmos_client():
    """Initialize Cosmos DB client and return database reference."""
    endpoint = os.getenv("COSMOS_ENDPOINT")
    key = os.getenv("COSMOS_KEY")
    database_name = os.getenv("COSMOS_DATABASE", "clearance-db")
    if not endpoint or not key:
        raise ValueError("Cosmos DB credentials not configured")
    client = CosmosClient(endpoint, credential=key)
    return client.get_database_client(database_name)


# ============================================================================
# AI Helper Functions
# ============================================================================

def generate_embedding(text: str, client: AzureOpenAI) -> list[float]:
    """Generate embedding for text using text-embedding-3-small."""
    deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
    response = client.embeddings.create(
        input=text,
        model=deployment
    )
    return response.data[0].embedding


def exponential_backoff_retry(func, max_retries=5, initial_delay=1.0):
    """Execute function with exponential backoff retry for rate limits."""
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if "429" in str(e) or "rate" in str(e).lower():
                if attempt < max_retries - 1:
                    jitter = random.uniform(0, 0.5)
                    sleep_time = min(delay + jitter, 30)
                    logger.warning(f"Rate limited, retrying in {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(sleep_time)
                    delay *= 2
                else:
                    raise
            else:
                raise


def analyze_requirement_with_gpt4o(
    requirement: dict,
    evidence_chunks: list[dict],
    client: AzureOpenAI
) -> dict:
    """
    Analyze a single requirement against evidence chunks using GPT-4o.
    Returns structured finding with v2.0 quality fields.
    """
    deployment = os.getenv("AZURE_OPENAI_GPT4O_DEPLOYMENT", "gpt-4o")

    # Build evidence context
    evidence_text = "\n\n".join([
        f"[Page {chunk.get('page', 'N/A')}] {chunk.get('content', '')}"
        for chunk in evidence_chunks
    ])

    # Use enhanced prompt from quality engine
    user_prompt = build_enhanced_user_prompt(requirement, evidence_text)

    def call_gpt4o():
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": ENHANCED_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=700,  # Increased for structured response
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

    # Call with retry logic
    result_json = exponential_backoff_retry(call_gpt4o)

    try:
        result = json.loads(result_json)
        # Ensure requirement_id matches
        result["requirement_id"] = requirement["id"]
        result["domain"] = requirement.get("domain", "")

        # Parse structured gap if not already present
        if "missing_elements" not in result:
            structured_gap = parse_structured_gap_response(result, requirement)
            result.update(structured_gap)

        # Validate evidence and add quality metadata
        validated_result = validate_finding(result, evidence_chunks)

        # Add cross-references
        cross_refs = get_cross_references(requirement["id"])
        validated_result["cross_references"] = cross_refs.get("related_controls", [])
        validated_result["efficiency_note"] = cross_refs.get("efficiency_note")

        # Check if template exists
        template_id = requirement.get("remediation_template")
        if template_id:
            validated_result["has_template"] = True
            validated_result["template_id"] = template_id

        return validated_result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse GPT-4o response: {e}")
        return {
            "requirement_id": requirement["id"],
            "domain": requirement.get("domain", ""),
            "status": "fail",
            "confidence": 0.0,
            "confidence_tier": "review",
            "evidence_quote": None,
            "page_reference": None,
            "gap_description": "Analysis failed - could not process requirement",
            "recommended_action": "Manual review required",
            "risk_rating": "high",
            "evidence_validated": False,
            "validation_flags": ["analysis_failed"],
            "needs_manual_review": True,
            "whats_found": None,
            "missing_elements": [],
            "completion_percentage": 0,
            "estimated_effort": "unknown",
            "cross_references": [],
            "efficiency_note": None,
            "has_template": False,
            "template_id": None
        }


def generate_executive_summary(
    company_name: str,
    framework: str,
    domain_summaries: list[dict],
    findings: list[dict],
    client: AzureOpenAI
) -> str:
    """Generate executive summary using GPT-4o."""
    deployment = os.getenv("AZURE_OPENAI_GPT4O_DEPLOYMENT", "gpt-4o")

    # Count statistics
    total_pass = sum(d.get("passed", 0) for d in domain_summaries)
    total_partial = sum(d.get("partial", 0) for d in domain_summaries)
    total_fail = sum(d.get("fail", 0) for d in domain_summaries)
    high_risk_gaps = len([f for f in findings if f.get("risk_rating") == "high" and f.get("status") != "pass"])

    prompt = f"""Write a 3-paragraph executive summary for a DISP compliance assessment report.

Company: {company_name}
Framework: {framework}
Results: {total_pass} requirements passed, {total_partial} partial, {total_fail} failed
High-risk gaps: {high_risk_gaps}

Domain breakdown:
{json.dumps(domain_summaries, indent=2)}

Top 5 critical findings:
{json.dumps([f for f in findings if f.get("status") != "pass"][:5], indent=2)}

Write a professional executive summary that:
1. Opens with overall compliance posture
2. Highlights critical gaps requiring immediate attention
3. Concludes with recommended next steps

Keep it concise (under 200 words), professional, and suitable for senior management."""

    response = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=400
    )

    return response.choices[0].message.content

# Initialize FastAPI app
app = FastAPI(
    title="Clearance API",
    description="AI-powered Defence Compliance Assessment Platform",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
    os.getenv("SWA_URL", ""),
]
# Filter out empty strings
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Models
# ============================================================================

class HealthResponse(BaseModel):
    status: str
    dependencies: dict
    timestamp: str


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    status: str


class AnalyseRequest(BaseModel):
    upload_id: str
    company_name: str
    framework: str  # "disp-entry-level", "asd-e8-ml2", or "combined"
    user_id: str = "demo-user"  # User ID from frontend auth


class GapUpdateRequest(BaseModel):
    status: str  # "in_progress" or "resolved"


class DomainSummary(BaseModel):
    domain: str
    passed: int
    partial: int
    fail: int


class Finding(BaseModel):
    model_config = ConfigDict(extra="allow", validate_assignment=True)

    requirement_id: str
    domain: str = ""  # Domain name for grouping
    status: str  # pass, partial, fail (compliance status)
    confidence: float
    evidence_quote: Optional[str]
    page_reference: Optional[int]
    gap_description: str
    recommended_action: str
    risk_rating: str
    priority_score: int
    remediation_status: str = "todo"  # todo, in_progress, resolved (tracker status)

    # v2.0 Quality Engine Fields
    confidence_tier: str = "review"  # high, moderate, low, review
    evidence_validated: bool = False
    evidence_similarity: float = 0.0
    validation_flags: list[str] = []  # List of validation flag strings
    needs_manual_review: bool = True

    # v2.0 Structured Gap Fields
    whats_found: Optional[str] = None
    missing_elements: list[str] = []
    completion_percentage: int = 0
    estimated_effort: str = "unknown"  # hours, days, weeks

    # v2.0 Cross-Reference Fields
    cross_references: list[str] = []  # Related control IDs
    efficiency_note: Optional[str] = None

    # v2.0 Remediation Template
    has_template: bool = False
    template_id: Optional[str] = None


class ConfidenceSummary(BaseModel):
    """Summary of confidence levels across all findings."""
    high_confidence: int = 0      # Count of findings with confidence >= 0.90
    moderate_confidence: int = 0  # Count of findings with confidence 0.70-0.89
    low_confidence: int = 0       # Count of findings with confidence 0.50-0.69
    needs_review: int = 0         # Count of findings with confidence < 0.50
    average_confidence: float = 0.0
    evidence_validation_rate: float = 0.0  # Percentage of quotes validated


class AssessmentDelta(BaseModel):
    """Comparison with previous assessment (if available)."""
    previous_report_id: Optional[str] = None
    previous_date: Optional[str] = None
    previous_score: Optional[int] = None
    score_change: int = 0  # +/- change from previous
    gaps_closed: int = 0
    new_gaps: int = 0
    trend: str = "first_assessment"  # improving, declining, stable, first_assessment


class ReportResponse(BaseModel):
    report_id: str
    user_id: str
    company_name: str
    framework: str
    assessment_date: str
    overall_score: int
    domain_summary: list[DomainSummary]
    findings: list[Finding]
    status: str
    executive_summary: Optional[str] = None

    # v2.0 Quality Fields
    version: str = "2.0"
    confidence_summary: Optional[ConfidenceSummary] = None
    assessment_delta: Optional[AssessmentDelta] = None
    total_findings: int = 0
    findings_needing_review: int = 0
    disclaimer: str = "This assessment is AI-generated and should be verified by qualified personnel."


class FrameworkInfo(BaseModel):
    framework_id: str
    framework_name: str
    total_requirements: int
    description: str


class DocumentChunk(BaseModel):
    """Represents an extracted text chunk from a document."""
    chunk_id: str
    upload_id: str
    section: str
    page: int
    content: str


class ExtractionResponse(BaseModel):
    """Response from document extraction (Phase 3 output)."""
    upload_id: str
    filename: str
    total_pages: int
    total_chunks: int
    chunks: list[DocumentChunk]
    status: str


# ============================================================================
# Helper Functions
# ============================================================================

def load_frameworks():
    """Load compliance framework JSON files."""
    # Look in backend/frameworks for deployed environment
    frameworks_dir = Path(__file__).parent / "frameworks"
    frameworks = {}

    disp_path = frameworks_dir / "disp_entry_level.json"
    e8_path = frameworks_dir / "asd_essential_eight.json"

    if disp_path.exists():
        with open(disp_path, "r") as f:
            frameworks["disp-entry-level"] = json.load(f)

    if e8_path.exists():
        with open(e8_path, "r") as f:
            frameworks["asd-e8-ml2"] = json.load(f)

    return frameworks


# Mock data store (replaced with Cosmos DB in Phase 4)
MOCK_REPORTS = {}
MOCK_UPLOADS = {}


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for monitoring.
    Returns service status and dependency health.
    """
    if DEMO_MODE:
        return HealthResponse(
            status="healthy (DEMO_MODE)",
            dependencies={
                "demo_mode": "enabled",
                "demo_reports_loaded": str(len(DEMO_REPORTS)),
                "cosmos_db": "bypassed",
                "blob_storage": "bypassed",
                "openai": "bypassed",
                "document_intelligence": "bypassed",
            },
            timestamp=datetime.utcnow().isoformat(),
        )

    return HealthResponse(
        status="healthy",
        dependencies={
            "cosmos_db": "connected",
            "blob_storage": "connected",
            "openai": "connected",
            "document_intelligence": "connected",
            "resend_available": str(RESEND_AVAILABLE),
        },
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF document for compliance assessment.
    Saves the file to Azure Blob Storage.
    Returns an upload_id to track the document.
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Generate upload ID
    upload_id = str(uuid.uuid4())
    blob_name = f"{upload_id}/{file.filename}"

    try:
        # Read file content
        file_content = await file.read()

        # Check file size (limit to 10MB for F0 tier efficiency)
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > 10:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 10MB limit"
            )

        # Upload to Azure Blob Storage
        blob_service = get_blob_service_client()
        container_client = blob_service.get_container_client("documents")
        blob_client = container_client.get_blob_client(blob_name)

        blob_client.upload_blob(file_content, overwrite=True)
        logger.info(f"Uploaded blob: {blob_name}")

        # Store upload metadata in memory (will move to Cosmos DB in Phase 4)
        MOCK_UPLOADS[upload_id] = {
            "filename": file.filename,
            "blob_name": blob_name,
            "status": "received",
            "uploaded_at": datetime.utcnow().isoformat(),
        }

        return UploadResponse(
            upload_id=upload_id,
            filename=file.filename,
            status="received",
        )

    except AzureError as e:
        logger.error(f"Azure Blob upload error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload document: {str(e)}"
        )
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Storage service not configured"
        )


@app.post("/extract", response_model=ExtractionResponse)
async def extract_document(upload_id: str):
    """
    Extract text from an uploaded PDF using Azure Document Intelligence.
    Generates embeddings and stores chunks in Cosmos DB for vector search.
    """
    # Validate upload exists
    if upload_id not in MOCK_UPLOADS:
        raise HTTPException(
            status_code=404,
            detail=f"Upload {upload_id} not found"
        )

    upload_info = MOCK_UPLOADS[upload_id]
    blob_name = upload_info.get("blob_name")

    if not blob_name:
        raise HTTPException(
            status_code=400,
            detail="Upload metadata incomplete"
        )

    try:
        # Get blob URL for Document Intelligence
        blob_service = get_blob_service_client()
        container_client = blob_service.get_container_client("documents")
        blob_client = container_client.get_blob_client(blob_name)

        # Download blob content for Document Intelligence
        blob_data = blob_client.download_blob().readall()

        # Call Azure Document Intelligence
        doc_client = get_document_analysis_client()
        poller = doc_client.begin_analyze_document("prebuilt-read", document=blob_data)
        result = poller.result()

        # Check page limit
        page_count = len(result.pages) if result.pages else 0
        if page_count > CLEARANCE_PAGE_LIMIT:
            logger.warning(f"Document rejected: {page_count} pages exceeds limit of {CLEARANCE_PAGE_LIMIT}")
            raise HTTPException(
                status_code=400,
                detail=f"Document has {page_count} pages, which exceeds the limit of {CLEARANCE_PAGE_LIMIT} pages. Please upload a shorter document or split into multiple files."
            )

        # Initialize OpenAI and Cosmos DB clients
        openai_client = get_openai_client()
        cosmos_db = get_cosmos_client()
        chunks_container = cosmos_db.get_container_client("chunks")

        # Parse paragraphs into structured chunks with embeddings
        chunks = []
        for idx, paragraph in enumerate(result.paragraphs or []):
            # Get page number from bounding regions
            page_num = 1
            if paragraph.bounding_regions:
                page_num = paragraph.bounding_regions[0].page_number

            # Determine section type from role or default to "body"
            section = paragraph.role if paragraph.role else "body"
            content = paragraph.content

            # Skip very short chunks (less than 10 chars)
            if len(content.strip()) < 10:
                continue

            chunk_id = str(uuid.uuid4())

            # Generate embedding with rate limit handling
            try:
                embedding = exponential_backoff_retry(
                    lambda c=content: generate_embedding(c, openai_client)
                )
            except Exception as e:
                logger.warning(f"Failed to generate embedding for chunk {idx}: {e}")
                embedding = [0.0] * 1536  # Fallback zero vector

            # Create chunk document for Cosmos DB
            chunk_doc = {
                "id": chunk_id,
                "upload_id": upload_id,
                "section": section,
                "page": page_num,
                "content": content,
                "embedding": embedding
            }

            # Store in Cosmos DB
            try:
                chunks_container.upsert_item(chunk_doc)
            except CosmosHttpResponseError as e:
                logger.error(f"Failed to store chunk in Cosmos DB: {e}")

            # Add to response (without embedding for API response)
            chunk = DocumentChunk(
                chunk_id=chunk_id,
                upload_id=upload_id,
                section=section,
                page=page_num,
                content=content,
            )
            chunks.append(chunk)

            # Small delay to avoid rate limits
            if idx > 0 and idx % 10 == 0:
                time.sleep(0.2)

        # Update upload status
        MOCK_UPLOADS[upload_id]["status"] = "indexed"
        MOCK_UPLOADS[upload_id]["total_pages"] = len(result.pages) if result.pages else 0
        MOCK_UPLOADS[upload_id]["total_chunks"] = len(chunks)

        logger.info(f"Extracted and indexed {len(chunks)} chunks from {upload_info['filename']}")

        return ExtractionResponse(
            upload_id=upload_id,
            filename=upload_info["filename"],
            total_pages=len(result.pages) if result.pages else 0,
            total_chunks=len(chunks),
            chunks=chunks,
            status="indexed",
        )

    except AzureError as e:
        logger.error(f"Document Intelligence error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Document extraction failed: {str(e)}"
        )
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Service not configured: {str(e)}"
        )


@app.post("/analyse", response_model=ReportResponse)
async def analyse_document(request: AnalyseRequest):
    """
    Analyse an uploaded document against a compliance framework.
    Uses GPT-4o with Cosmos DB vector search for semantic matching.
    Returns a full assessment report with findings.
    """
    # =========================================
    # ACCESS CONTROL CHECKS
    # =========================================

    # Check kill switch
    if not CLEARANCE_ENABLED:
        logger.warning("Assessment blocked: CLEARANCE_ENABLED=false")
        raise HTTPException(
            status_code=503,
            detail="Clearance is temporarily unavailable for maintenance. Please try again later."
        )

    # Check daily cap
    allowed, remaining = check_daily_cap()
    if not allowed:
        logger.warning(f"Assessment blocked: Daily cap reached ({CLEARANCE_DAILY_CAP})")
        raise HTTPException(
            status_code=429,
            detail="Daily assessment limit reached. Please try again tomorrow."
        )

    # Check domain access (extract domain from user_id which should be email)
    user_email = request.user_id
    domain = extract_domain_from_email(user_email)

    # Skip all checks for admin users
    if is_admin_user(user_email):
        logger.info(f"Admin user {user_email}: unlimited access")
    elif domain not in ["demo-user", "localhost", "demo"]:
        # Block personal email domains (gmail, hotmail, yahoo, etc.)
        if is_personal_email(user_email):
            logger.info(f"Assessment blocked: personal email {domain}")
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Please use your work email address. Personal email addresses (Gmail, Hotmail, Yahoo, etc.) are not accepted.",
                    "action": "use_work_email",
                    "domain": domain
                }
            )

        # Check domain scan limits
        domain_allowed, domain_message, scans_remaining = check_domain_access(domain)
        if not domain_allowed:
            logger.info(f"Assessment blocked for {domain}: {domain_message}")
            raise HTTPException(
                status_code=403,
                detail={
                    "message": domain_message,
                    "action": "pilot_signup",
                    "scans_used": CLEARANCE_FREE_SCANS_PER_DOMAIN,
                    "domain": domain
                }
            )
        logger.info(f"Domain {domain}: {scans_remaining} scans remaining")

    # =========================================
    # VALIDATION
    # =========================================

    # Validate upload exists
    if request.upload_id not in MOCK_UPLOADS:
        raise HTTPException(
            status_code=404,
            detail=f"Upload {request.upload_id} not found"
        )

    # Validate framework
    valid_frameworks = ["disp-entry-level", "asd-e8-ml2", "combined"]
    if request.framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {valid_frameworks}"
        )

    # Check document is indexed
    upload_info = MOCK_UPLOADS[request.upload_id]
    if upload_info.get("status") != "indexed":
        raise HTTPException(
            status_code=400,
            detail="Document must be extracted first. Call /extract endpoint."
        )

    try:
        # Initialize clients
        openai_client = get_openai_client()
        cosmos_db = get_cosmos_client()
        chunks_container = cosmos_db.get_container_client("chunks")
        assessments_container = cosmos_db.get_container_client("assessments")

        # Load framework requirements
        frameworks = load_frameworks()
        requirements = []

        if request.framework == "combined":
            # Load both DISP and E8
            if "disp-entry-level" in frameworks:
                requirements.extend(frameworks["disp-entry-level"].get("requirements", []))
            if "asd-e8-ml2" in frameworks:
                requirements.extend(frameworks["asd-e8-ml2"].get("requirements", []))
        elif request.framework in frameworks:
            requirements = frameworks[request.framework].get("requirements", [])

        if not requirements:
            raise HTTPException(
                status_code=500,
                detail=f"Framework {request.framework} has no requirements loaded"
            )

        report_id = str(uuid.uuid4())
        user_id = request.user_id  # From frontend auth

        findings = []
        domain_stats = {}  # Track pass/partial/fail per domain

        logger.info(f"Starting analysis of {len(requirements)} requirements for {request.company_name}")

        for idx, requirement in enumerate(requirements):
            # Generate embedding for requirement text
            req_embedding = exponential_backoff_retry(
                lambda r=requirement: generate_embedding(r["requirement_text"], openai_client)
            )

            # Vector search in Cosmos DB for top 3 similar chunks
            # Using Cosmos DB vector search with VectorDistance
            query = """
            SELECT TOP 3 c.id, c.section, c.page, c.content
            FROM c
            WHERE c.upload_id = @upload_id
            ORDER BY VectorDistance(c.embedding, @embedding)
            """

            try:
                evidence_chunks = list(chunks_container.query_items(
                    query=query,
                    parameters=[
                        {"name": "@upload_id", "value": request.upload_id},
                        {"name": "@embedding", "value": req_embedding}
                    ],
                    enable_cross_partition_query=True
                ))
            except CosmosHttpResponseError as e:
                logger.warning(f"Vector search failed for {requirement['id']}: {e}")
                evidence_chunks = []

            # Call GPT-4o for analysis
            gpt_result = analyze_requirement_with_gpt4o(
                requirement=requirement,
                evidence_chunks=evidence_chunks,
                client=openai_client
            )

            # Calculate priority score
            risk_weight = requirement.get("risk_weight", 5)
            effort_to_fix = requirement.get("effort_to_fix", 5)
            priority_score = (risk_weight * 10) - (effort_to_fix * 3)

            finding = Finding(
                requirement_id=gpt_result.get("requirement_id", requirement["id"]),
                domain=gpt_result.get("domain", requirement.get("domain", "")),
                status=gpt_result.get("status", "fail"),
                confidence=float(gpt_result.get("confidence", 0.0)),
                evidence_quote=gpt_result.get("evidence_quote"),
                page_reference=gpt_result.get("page_reference"),
                gap_description=gpt_result.get("gap_description", ""),
                recommended_action=gpt_result.get("recommended_action", ""),
                risk_rating=gpt_result.get("risk_rating", "medium"),
                priority_score=priority_score,
                remediation_status="todo",
                # v2.0 Quality fields
                confidence_tier=gpt_result.get("confidence_tier", "review"),
                evidence_validated=gpt_result.get("evidence_validated", False),
                evidence_similarity=gpt_result.get("evidence_similarity", 0.0),
                validation_flags=gpt_result.get("validation_flags", []),
                needs_manual_review=gpt_result.get("needs_manual_review", True),
                # v2.0 Structured gap fields
                whats_found=gpt_result.get("whats_found"),
                missing_elements=gpt_result.get("missing_elements", []),
                completion_percentage=gpt_result.get("completion_percentage", 0),
                estimated_effort=gpt_result.get("estimated_effort", "unknown"),
                # v2.0 Cross-reference fields
                cross_references=gpt_result.get("cross_references", []),
                efficiency_note=gpt_result.get("efficiency_note"),
                # v2.0 Template fields
                has_template=gpt_result.get("has_template", False),
                template_id=gpt_result.get("template_id")
            )
            findings.append(finding)

            # Track domain statistics
            domain = requirement.get("domain", "Unknown")
            if domain not in domain_stats:
                domain_stats[domain] = {"passed": 0, "partial": 0, "fail": 0}

            status = gpt_result.get("status", "fail")
            if status == "pass":
                domain_stats[domain]["passed"] += 1
            elif status == "partial":
                domain_stats[domain]["partial"] += 1
            else:
                domain_stats[domain]["fail"] += 1

            # Progress logging
            if (idx + 1) % 5 == 0:
                logger.info(f"Analyzed {idx + 1}/{len(requirements)} requirements")

            # Rate limit delay between requirements
            time.sleep(0.2)

        # Build domain summary
        domain_summary = [
            DomainSummary(
                domain=domain,
                passed=stats["passed"],
                partial=stats["partial"],
                fail=stats["fail"]
            )
            for domain, stats in domain_stats.items()
        ]

        # Calculate overall score (percentage of passed + half of partial)
        total_reqs = len(requirements)
        total_pass = sum(s["passed"] for s in domain_stats.values())
        total_partial = sum(s["partial"] for s in domain_stats.values())
        overall_score = int(((total_pass + (total_partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0

        # Generate executive summary
        exec_summary = generate_executive_summary(
            company_name=request.company_name,
            framework=request.framework,
            domain_summaries=[d.model_dump() for d in domain_summary],
            findings=[f.model_dump() for f in findings],
            client=openai_client
        )

        # Sort findings by priority score (highest first)
        findings.sort(key=lambda f: f.priority_score, reverse=True)

        # Calculate confidence summary (v2.0)
        high_conf = sum(1 for f in findings if f.confidence >= 0.90)
        mod_conf = sum(1 for f in findings if 0.70 <= f.confidence < 0.90)
        low_conf = sum(1 for f in findings if 0.50 <= f.confidence < 0.70)
        review_conf = sum(1 for f in findings if f.confidence < 0.50)
        avg_conf = sum(f.confidence for f in findings) / len(findings) if findings else 0.0
        validated_count = sum(1 for f in findings if f.evidence_validated)
        validation_rate = (validated_count / len(findings) * 100) if findings else 0.0

        confidence_summary = ConfidenceSummary(
            high_confidence=high_conf,
            moderate_confidence=mod_conf,
            low_confidence=low_conf,
            needs_review=review_conf,
            average_confidence=round(avg_conf, 2),
            evidence_validation_rate=round(validation_rate, 1)
        )

        # Check for previous assessment (delta reporting v2.0)
        assessment_delta = None
        try:
            # Query for previous assessments of the same company
            prev_query = """
            SELECT TOP 1 c.report_id, c.assessment_date, c.overall_score, c.findings
            FROM c
            WHERE c.company_name = @company_name
            AND c.report_id != @current_id
            ORDER BY c.assessment_date DESC
            """
            prev_results = list(assessments_container.query_items(
                query=prev_query,
                parameters=[
                    {"name": "@company_name", "value": request.company_name},
                    {"name": "@current_id", "value": report_id}
                ],
                enable_cross_partition_query=True
            ))

            if prev_results:
                prev = prev_results[0]
                prev_findings = prev.get("findings", [])
                prev_failed = set(f["requirement_id"] for f in prev_findings if f.get("status") != "pass")
                curr_failed = set(f.requirement_id for f in findings if f.status != "pass")

                gaps_closed = len(prev_failed - curr_failed)
                new_gaps = len(curr_failed - prev_failed)
                score_change = overall_score - prev.get("overall_score", 0)

                # Determine trend
                if score_change > 5:
                    trend = "improving"
                elif score_change < -5:
                    trend = "declining"
                else:
                    trend = "stable"

                assessment_delta = AssessmentDelta(
                    previous_report_id=prev.get("report_id"),
                    previous_date=prev.get("assessment_date"),
                    previous_score=prev.get("overall_score"),
                    score_change=score_change,
                    gaps_closed=gaps_closed,
                    new_gaps=new_gaps,
                    trend=trend
                )
        except Exception as e:
            logger.warning(f"Could not calculate assessment delta: {e}")
            assessment_delta = AssessmentDelta(trend="first_assessment")

        # Count findings needing review
        findings_needing_review = sum(1 for f in findings if f.needs_manual_review)

        report = ReportResponse(
            report_id=report_id,
            user_id=user_id,
            company_name=request.company_name,
            framework=request.framework,
            assessment_date=datetime.utcnow().isoformat(),
            overall_score=overall_score,
            domain_summary=domain_summary,
            findings=findings,
            status="complete",
            executive_summary=exec_summary,
            # v2.0 Quality fields
            version="2.0",
            confidence_summary=confidence_summary,
            assessment_delta=assessment_delta,
            total_findings=len(findings),
            findings_needing_review=findings_needing_review,
            disclaimer="This AI-generated assessment should be verified by qualified security personnel. Evidence quotes and gap analyses are based on automated document analysis."
        )

        # Store report in Cosmos DB
        report_doc = report.model_dump()
        report_doc["id"] = report_id
        try:
            assessments_container.upsert_item(report_doc)
            logger.info(f"Stored report {report_id} in Cosmos DB")
        except CosmosHttpResponseError as e:
            logger.error(f"Failed to store report in Cosmos DB: {e}")

        # Also store in memory for quick access
        MOCK_REPORTS[report_id] = report

        # =========================================
        # RECORD USAGE FOR ACCESS CONTROL
        # =========================================
        increment_daily_count()

        # Record domain usage (skip for demo users)
        if domain not in ["demo-user", "localhost", "demo"]:
            record_domain_usage(domain, user_email, request.company_name)
            logger.info(f"Recorded usage for domain {domain}")

        logger.info(f"Analysis complete: {request.company_name} scored {overall_score}%")

        return report

    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Service configuration error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.get("/reports/{user_id}")
async def get_user_reports(user_id: str):
    """
    Get all assessment reports for a user.
    In DEMO_MODE, returns pre-loaded demo reports.
    Otherwise queries Cosmos DB for persistent storage.
    """
    user_reports = []

    # DEMO_MODE: Return pre-loaded demo reports
    if DEMO_MODE:
        logger.info(f"DEMO_MODE: Returning {len(DEMO_REPORTS)} demo reports")
        for report in DEMO_REPORTS.values():
            user_reports.append({
                "report_id": report.get("report_id"),
                "company_name": report.get("company_name"),
                "framework": report.get("framework"),
                "assessment_date": report.get("assessment_date"),
                "overall_score": report.get("overall_score"),
                "status": report.get("status"),
            })
        return {"reports": user_reports}

    try:
        cosmos_db = get_cosmos_client()
        assessments_container = cosmos_db.get_container_client("assessments")

        # Query reports for this user
        query = "SELECT * FROM c WHERE c.user_id = @user_id"
        params = [{"name": "@user_id", "value": user_id}]
        items = list(assessments_container.query_items(query, parameters=params))

        for item in items:
            user_reports.append({
                "report_id": item.get("report_id"),
                "company_name": item.get("company_name"),
                "framework": item.get("framework"),
                "assessment_date": item.get("assessment_date"),
                "overall_score": item.get("overall_score"),
                "status": item.get("status"),
            })

            # Also cache in memory for faster access
            if item.get("report_id") not in MOCK_REPORTS:
                try:
                    MOCK_REPORTS[item.get("report_id")] = ReportResponse(**item)
                except Exception:
                    pass  # Skip if model validation fails

    except Exception as e:
        logger.warning(f"Cosmos DB query failed, falling back to memory: {e}")
        # Fall back to in-memory cache
        user_reports = [
            {
                "report_id": report.report_id,
                "company_name": report.company_name,
                "framework": report.framework,
                "assessment_date": report.assessment_date,
                "overall_score": report.overall_score,
                "status": report.status,
            }
            for report in MOCK_REPORTS.values()
            if report.user_id == user_id
        ]

    return {"reports": user_reports}


@app.get("/report/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    """
    Get a single assessment report by ID.
    In DEMO_MODE, returns pre-loaded demo report.
    Otherwise returns the full report with all findings from Cosmos DB.
    """
    # DEMO_MODE: Return pre-loaded demo report
    if DEMO_MODE and report_id in DEMO_REPORTS:
        logger.info(f"DEMO_MODE: Returning demo report {report_id}")
        return ReportResponse(**DEMO_REPORTS[report_id])

    # Try in-memory cache first
    if report_id in MOCK_REPORTS:
        return MOCK_REPORTS[report_id]

    # Fall back to Cosmos DB
    try:
        cosmos_db = get_cosmos_client()
        assessments_container = cosmos_db.get_container_client("assessments")

        # Query for the report (cross-partition since we query by report_id, not user_id)
        query = "SELECT * FROM c WHERE c.report_id = @report_id"
        params = [{"name": "@report_id", "value": report_id}]
        items = list(assessments_container.query_items(
            query,
            parameters=params,
            enable_cross_partition_query=True
        ))

        if not items:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )

        report_doc = items[0]
        # Cache it for future requests
        report = ReportResponse(**report_doc)
        MOCK_REPORTS[report_id] = report
        return report

    except CosmosHttpResponseError as e:
        logger.error(f"Cosmos DB error fetching report: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.patch("/report/{report_id}/gap/{gap_id}")
async def update_gap_status(report_id: str, gap_id: str, request: GapUpdateRequest):
    """
    Update the remediation status of a compliance gap.
    Checks in-memory cache first, then Cosmos DB.
    Persists to both for consistency.
    """
    valid_statuses = ["in_progress", "resolved", "todo"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    # Check in-memory cache first
    if report_id in MOCK_REPORTS:
        report = MOCK_REPORTS[report_id]
        gap_found = False
        for finding in report.findings:
            if finding.requirement_id == gap_id:
                finding.remediation_status = request.status
                gap_found = True
                break

        if not gap_found:
            raise HTTPException(
                status_code=404,
                detail=f"Gap {gap_id} not found in report {report_id}"
            )

        # Also persist to Cosmos DB in background
        try:
            cosmos_db = get_cosmos_client()
            assessments_container = cosmos_db.get_container_client("assessments")
            report_doc = report.model_dump()
            report_doc["id"] = report_id
            assessments_container.upsert_item(report_doc)
            logger.info(f"Updated gap {gap_id} status to {request.status}")
        except Exception as e:
            logger.warning(f"Failed to persist to Cosmos DB: {e}")

        return {
            "requirement_id": gap_id,
            "status": request.status,
            "updated_at": datetime.utcnow().isoformat(),
        }

    # Fall back to Cosmos DB
    try:
        cosmos_db = get_cosmos_client()
        assessments_container = cosmos_db.get_container_client("assessments")

        # Fetch the report from Cosmos DB (cross-partition query)
        query = "SELECT * FROM c WHERE c.report_id = @report_id"
        params = [{"name": "@report_id", "value": report_id}]
        items = list(assessments_container.query_items(
            query,
            parameters=params,
            enable_cross_partition_query=True
        ))

        if not items:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )

        report_doc = items[0]

        # Find and update the gap
        gap_found = False
        for finding in report_doc.get("findings", []):
            if finding.get("requirement_id") == gap_id:
                finding["remediation_status"] = request.status
                finding["updated_at"] = datetime.utcnow().isoformat()
                gap_found = True
                break

        if not gap_found:
            raise HTTPException(
                status_code=404,
                detail=f"Gap {gap_id} not found in report {report_id}"
            )

        # Upsert the updated report back to Cosmos DB
        assessments_container.upsert_item(report_doc)
        logger.info(f"Updated gap {gap_id} status to {request.status}")

        return {
            "requirement_id": gap_id,
            "status": request.status,
            "updated_at": datetime.utcnow().isoformat(),
        }

    except CosmosHttpResponseError as e:
        logger.error(f"Cosmos DB error updating gap: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/frameworks")
async def list_frameworks():
    """
    List all available compliance frameworks.
    Returns framework metadata without full requirement details.
    """
    frameworks = load_frameworks()

    framework_list = []
    for framework_id, data in frameworks.items():
        framework_list.append(FrameworkInfo(
            framework_id=data.get("framework_id", framework_id),
            framework_name=data.get("framework_name", "Unknown"),
            total_requirements=data.get("total_requirements", 0),
            description=data.get("description", ""),
        ))

    # Add combined option
    framework_list.append(FrameworkInfo(
        framework_id="combined",
        framework_name="Combined Assessment",
        total_requirements=36,
        description="Full assessment against DISP Entry Level and ASD Essential Eight",
    ))

    return {"frameworks": framework_list}


# ============================================================================
# Tracker Aggregation Endpoint (v2.0)
# ============================================================================

@app.get("/tracker/gaps/{user_id}")
async def get_tracker_gaps(user_id: str):
    """
    Get all gaps aggregated by company for the remediation tracker.
    Single API call replaces N+1 pattern of fetching each report individually.
    Returns gaps organized by company with stats.
    """
    companies = []
    totals = {"total": 0, "todo": 0, "in_progress": 0, "resolved": 0}

    # DEMO_MODE: Return pre-loaded demo data
    if DEMO_MODE:
        for report in DEMO_REPORTS.values():
            company_gaps = {"todo": [], "in_progress": [], "resolved": []}
            findings = report.get("findings", [])

            for finding in findings:
                if finding.get("status") == "pass":
                    continue

                gap = {
                    **finding,
                    "report_id": report.get("report_id"),
                    "company_name": report.get("company_name"),
                }

                remediation_status = finding.get("remediation_status", "todo")
                if remediation_status == "resolved":
                    company_gaps["resolved"].append(gap)
                    totals["resolved"] += 1
                elif remediation_status == "in_progress":
                    company_gaps["in_progress"].append(gap)
                    totals["in_progress"] += 1
                else:
                    company_gaps["todo"].append(gap)
                    totals["todo"] += 1
                totals["total"] += 1

            # Sort by priority
            for key in company_gaps:
                company_gaps[key].sort(key=lambda x: x.get("priority_score", 0), reverse=True)

            companies.append({
                "company_name": report.get("company_name"),
                "report_id": report.get("report_id"),
                "assessment_date": report.get("assessment_date"),
                "overall_score": report.get("overall_score"),
                "framework": report.get("framework"),
                "gaps": company_gaps,
                "stats": {
                    "total": len(company_gaps["todo"]) + len(company_gaps["in_progress"]) + len(company_gaps["resolved"]),
                    "todo": len(company_gaps["todo"]),
                    "in_progress": len(company_gaps["in_progress"]),
                    "resolved": len(company_gaps["resolved"]),
                }
            })

        return {"companies": companies, "totals": totals}

    # Production: Query Cosmos DB
    try:
        cosmos_db = get_cosmos_client()
        assessments_container = cosmos_db.get_container_client("assessments")

        # Query all reports for this user
        query = "SELECT * FROM c WHERE c.user_id = @user_id"
        params = [{"name": "@user_id", "value": user_id}]
        reports = list(assessments_container.query_items(query, parameters=params))

        for report in reports:
            company_gaps = {"todo": [], "in_progress": [], "resolved": []}
            findings = report.get("findings", [])

            for finding in findings:
                if finding.get("status") == "pass":
                    continue

                gap = {
                    **finding,
                    "report_id": report.get("report_id"),
                    "company_name": report.get("company_name"),
                }

                remediation_status = finding.get("remediation_status", "todo")
                if remediation_status == "resolved":
                    company_gaps["resolved"].append(gap)
                    totals["resolved"] += 1
                elif remediation_status == "in_progress":
                    company_gaps["in_progress"].append(gap)
                    totals["in_progress"] += 1
                else:
                    company_gaps["todo"].append(gap)
                    totals["todo"] += 1
                totals["total"] += 1

            # Sort by priority
            for key in company_gaps:
                company_gaps[key].sort(key=lambda x: x.get("priority_score", 0), reverse=True)

            companies.append({
                "company_name": report.get("company_name"),
                "report_id": report.get("report_id"),
                "assessment_date": report.get("assessment_date"),
                "overall_score": report.get("overall_score"),
                "framework": report.get("framework"),
                "gaps": company_gaps,
                "stats": {
                    "total": len(company_gaps["todo"]) + len(company_gaps["in_progress"]) + len(company_gaps["resolved"]),
                    "todo": len(company_gaps["todo"]),
                    "in_progress": len(company_gaps["in_progress"]),
                    "resolved": len(company_gaps["resolved"]),
                }
            })

        # Sort companies by assessment date (most recent first)
        companies.sort(key=lambda x: x.get("assessment_date", ""), reverse=True)

        return {"companies": companies, "totals": totals}

    except Exception as e:
        logger.error(f"Failed to fetch tracker gaps: {e}")
        raise HTTPException(status_code=500, detail="Failed to load tracker data")


# ============================================================================
# Access Control Endpoints
# ============================================================================

@app.get("/access-status/{user_email}")
async def get_access_status(user_email: str):
    """
    Get access status for a user/domain.
    Returns remaining scans and whether pilot signup is needed.
    """
    domain = extract_domain_from_email(user_email)

    # Check service status
    if not CLEARANCE_ENABLED:
        return {
            "service_available": False,
            "message": "Clearance is temporarily unavailable for maintenance.",
            "domain": domain
        }

    # Check daily cap
    daily_allowed, daily_remaining = check_daily_cap()

    # Admin users have unlimited access
    if is_admin_user(user_email):
        return {
            "service_available": True,
            "domain": domain,
            "access_granted": True,
            "scans_remaining": -1,  # Unlimited for admin
            "pilot_status": "admin",
            "daily_remaining": daily_remaining,
            "message": "Admin user - unlimited access"
        }

    # Demo users always have access
    if domain in ["demo-user", "localhost", "demo"]:
        return {
            "service_available": True,
            "domain": domain,
            "access_granted": True,
            "scans_remaining": -1,  # Unlimited for demo
            "pilot_status": "demo",
            "daily_remaining": daily_remaining,
            "message": "Demo mode - unlimited access"
        }

    # Block personal email domains
    if is_personal_email(user_email):
        return {
            "service_available": True,
            "domain": domain,
            "access_granted": False,
            "scans_remaining": 0,
            "pilot_status": "personal_email_blocked",
            "daily_remaining": daily_remaining,
            "message": "Please use your work email address. Personal email addresses (Gmail, Hotmail, Yahoo, etc.) are not accepted."
        }

    # Check domain access
    domain_allowed, domain_message, scans_remaining = check_domain_access(domain)
    usage = get_domain_usage(domain)

    return {
        "service_available": True,
        "domain": domain,
        "access_granted": domain_allowed,
        "scans_remaining": scans_remaining,
        "scans_used": usage.get("assessment_count", 0) if usage else 0,
        "free_scan_limit": CLEARANCE_FREE_SCANS_PER_DOMAIN,
        "pilot_status": usage.get("pilot_status", "new") if usage else "new",
        "daily_remaining": daily_remaining,
        "message": domain_message
    }


@app.post("/request-pilot-access")
async def request_pilot_access(user_email: str, company_name: str, message: str = ""):
    """
    Request to join the founding pilot program.
    Updates domain status and notifies founder.
    """
    domain = extract_domain_from_email(user_email)

    try:
        cosmos_db = get_cosmos_client()
        domains_container = cosmos_db.get_container_client("pilot_domains")

        existing = get_domain_usage(domain)

        if existing:
            existing["pilot_status"] = "pilot_requested"
            existing["pilot_request_date"] = datetime.utcnow().isoformat()
            existing["pilot_request_email"] = user_email
            existing["pilot_request_company"] = company_name
            existing["pilot_request_message"] = message
            domains_container.upsert_item(existing)
        else:
            new_record = {
                "id": domain,
                "domain": domain,
                "company_name": company_name,
                "assessment_count": 0,
                "pilot_status": "pilot_requested",
                "pilot_request_date": datetime.utcnow().isoformat(),
                "pilot_request_email": user_email,
                "pilot_request_message": message
            }
            domains_container.upsert_item(new_record)

        logger.info(f"Pilot access requested: {domain} ({company_name})")

        # Send email notification to founder
        logger.info(f"Email config: RESEND_AVAILABLE={RESEND_AVAILABLE}, API_KEY_SET={bool(RESEND_API_KEY)}, NOTIFICATION_EMAIL={NOTIFICATION_EMAIL}")
        if RESEND_AVAILABLE and RESEND_API_KEY and NOTIFICATION_EMAIL:
            try:
                resend.Emails.send({
                    "from": "Clearance <notifications@projectclearance.com.au>",
                    "to": [NOTIFICATION_EMAIL],
                    "subject": f"New Pilot Access Request: {company_name}",
                    "html": f"""
                    <h2>New Pilot Access Request</h2>
                    <p><strong>Company:</strong> {company_name}</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Domain:</strong> {domain}</p>
                    <p><strong>Message:</strong> {message or 'No message provided'}</p>
                    <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <hr>
                    <p><a href="https://portal.azure.com">View in Azure Portal → Cosmos DB → pilot_domains</a></p>
                    """
                })
                logger.info(f"Notification email sent for {domain}")
            except Exception as email_err:
                logger.warning(f"Failed to send notification email: {email_err}")
                # Don't fail the request if email fails

        return {
            "success": True,
            "message": "Your pilot access request has been submitted. We'll be in touch within 24 hours.",
            "domain": domain
        }

    except Exception as e:
        logger.error(f"Failed to record pilot request for {domain}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to submit request. Please try again or contact support."
        )


class SurveySubmission(BaseModel):
    """Survey response from post-scan feedback."""
    report_id: str
    user_email: str
    source: str  # How they heard about Clearance
    challenge: str  # Biggest compliance challenge
    nps: int  # Net Promoter Score (1-10)


@app.post("/survey")
async def submit_survey(survey: SurveySubmission):
    """
    Submit post-scan feedback survey.
    Stores responses in the leads container for customer discovery.
    """
    domain = extract_domain_from_email(survey.user_email)

    try:
        cosmos_db = get_cosmos_client()
        leads_container = cosmos_db.get_container_client("leads")

        lead_record = {
            "id": f"survey-{survey.report_id}",
            "type": "survey_response",
            "domain": domain,
            "email": survey.user_email,
            "report_id": survey.report_id,
            "source": survey.source,
            "challenge": survey.challenge,
            "nps": survey.nps,
            "submitted_at": datetime.utcnow().isoformat()
        }

        leads_container.upsert_item(lead_record)
        logger.info(f"Survey submitted: {domain}, NPS={survey.nps}, source={survey.source}")

        return {
            "success": True,
            "message": "Thank you for your feedback!"
        }

    except Exception as e:
        logger.error(f"Failed to save survey for {domain}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to save survey. Thank you for trying!"
        )


# ============================================================================
# Remediation Templates Endpoint (v2.0)
# ============================================================================

@app.get("/templates/{template_id}")
async def get_remediation_template(template_id: str):
    """
    Get a remediation template by ID.
    Returns step-by-step guidance for closing a compliance gap.
    """
    # Look for template in templates directory
    templates_dir = Path(__file__).parent.parent / "src" / "templates" / "remediation"
    template_file = templates_dir / f"{template_id}.json"

    if not template_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Template {template_id} not found"
        )

    try:
        with open(template_file, "r", encoding="utf-8") as f:
            template = json.load(f)
        return template
    except Exception as e:
        logger.error(f"Failed to load template {template_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to load template"
        )


@app.get("/templates")
async def list_templates():
    """
    List all available remediation templates.
    Returns template index with quick-win recommendations.
    """
    templates_dir = Path(__file__).parent.parent / "src" / "templates" / "remediation"
    index_file = templates_dir / "templates_index.json"

    if not index_file.exists():
        return {"templates": {}, "quick_wins": []}

    try:
        with open(index_file, "r", encoding="utf-8") as f:
            index = json.load(f)
        return index
    except Exception as e:
        logger.error(f"Failed to load templates index: {e}")
        return {"templates": {}, "quick_wins": []}


@app.get("/control-mapping")
async def get_control_mapping():
    """
    Get the DISP-to-E8 control mapping for cross-reference analysis.
    Returns efficiency opportunities and control relationships.
    """
    mapping_file = Path(__file__).parent.parent / "src" / "frameworks" / "control_mapping.json"

    if not mapping_file.exists():
        return {"mappings": {}, "efficiency_opportunities": []}

    try:
        with open(mapping_file, "r", encoding="utf-8") as f:
            mapping = json.load(f)
        return mapping
    except Exception as e:
        logger.error(f"Failed to load control mapping: {e}")
        return {"mappings": {}, "efficiency_opportunities": []}


# ============================================================================
# Root endpoint
# ============================================================================

@app.get("/")
async def root():
    """API root - returns basic info."""
    return {
        "name": "Clearance API",
        "version": "2.0.0",
        "status": "running",
        "clearance_enabled": CLEARANCE_ENABLED,
        "docs": "/docs",
        "features": [
            "confidence_scoring",
            "evidence_validation",
            "structured_gaps",
            "remediation_templates",
            "control_mapping",
            "delta_reporting"
        ]
    }
