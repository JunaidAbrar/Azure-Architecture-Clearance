"""
Tests for Clearance API endpoints.
Run with: pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_blob_service():
    """Mock Azure Blob Storage service."""
    with patch("main.get_blob_service_client") as mock:
        mock_client = MagicMock()
        mock_container = MagicMock()
        mock_blob = MagicMock()

        mock_client.get_container_client.return_value = mock_container
        mock_container.get_blob_client.return_value = mock_blob
        mock_blob.upload_blob.return_value = None
        mock_blob.download_blob.return_value.readall.return_value = b"%PDF-1.4 mock"

        mock.return_value = mock_client
        yield mock


@pytest.fixture
def mock_doc_intelligence():
    """Mock Azure Document Intelligence service."""
    with patch("main.get_document_analysis_client") as mock:
        mock_client = MagicMock()
        mock_poller = MagicMock()
        mock_result = MagicMock()

        # Mock paragraphs
        mock_paragraph = MagicMock()
        mock_paragraph.content = "This is test content from the document."
        mock_paragraph.role = "body"
        mock_bounding_region = MagicMock()
        mock_bounding_region.page_number = 1
        mock_paragraph.bounding_regions = [mock_bounding_region]

        mock_result.paragraphs = [mock_paragraph]
        mock_result.pages = [MagicMock()]  # 1 page

        mock_poller.result.return_value = mock_result
        mock_client.begin_analyze_document.return_value = mock_poller

        mock.return_value = mock_client
        yield mock


@pytest.fixture
def mock_openai():
    """Mock Azure OpenAI service."""
    with patch("main.get_openai_client") as mock:
        mock_client = MagicMock()

        # Mock embeddings
        mock_embedding_response = MagicMock()
        mock_embedding_data = MagicMock()
        mock_embedding_data.embedding = [0.1] * 1536  # 1536-dim vector
        mock_embedding_response.data = [mock_embedding_data]
        mock_client.embeddings.create.return_value = mock_embedding_response

        # Mock chat completions
        mock_chat_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '{"requirement_id": "DISP-SG-001", "status": "fail", "confidence": 0.8, "evidence_quote": null, "page_reference": null, "gap_description": "No evidence found", "recommended_action": "Implement security policy", "risk_rating": "high"}'
        mock_chat_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_chat_response

        mock.return_value = mock_client
        yield mock


@pytest.fixture
def mock_cosmos():
    """Mock Cosmos DB service."""
    with patch("main.get_cosmos_client") as mock:
        mock_db = MagicMock()
        mock_container = MagicMock()

        mock_db.get_container_client.return_value = mock_container
        mock_container.upsert_item.return_value = None
        mock_container.query_items.return_value = []  # Empty results for vector search

        mock.return_value = mock_db
        yield mock


@pytest.fixture
def upload_id(client, mock_blob_service):
    """Create an upload and return its ID."""
    # Create a mock PDF file
    files = {"file": ("test_policy.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    response = client.post("/upload", files=files)
    return response.json()["upload_id"]


@pytest.fixture
def indexed_upload_id(client, upload_id, mock_doc_intelligence, mock_blob_service, mock_openai, mock_cosmos):
    """Create an upload and extract/index it."""
    # Extract the document
    response = client.post(f"/extract?upload_id={upload_id}")
    assert response.status_code == 200
    return upload_id


# ============================================================================
# Health Endpoint Tests
# ============================================================================

def test_health_returns_200(client):
    """GET /health returns 200 status."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_healthy_status(client):
    """GET /health returns healthy status."""
    response = client.get("/health")
    data = response.json()
    assert data["status"] == "healthy"
    assert "dependencies" in data
    assert "timestamp" in data


# ============================================================================
# Upload Endpoint Tests
# ============================================================================

def test_upload_pdf_returns_200(client, mock_blob_service):
    """POST /upload with PDF returns 200."""
    files = {"file": ("test.pdf", b"%PDF-1.4 test content", "application/pdf")}
    response = client.post("/upload", files=files)
    assert response.status_code == 200


def test_upload_returns_upload_id(client, mock_blob_service):
    """POST /upload returns upload_id."""
    files = {"file": ("test.pdf", b"%PDF-1.4 test content", "application/pdf")}
    response = client.post("/upload", files=files)
    data = response.json()
    assert "upload_id" in data
    assert "filename" in data
    assert data["status"] == "received"


def test_upload_non_pdf_returns_400(client):
    """POST /upload with non-PDF returns 400."""
    files = {"file": ("test.txt", b"plain text content", "text/plain")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400


def test_upload_invalid_file_extension_returns_400(client):
    """POST /upload with wrong extension returns 400."""
    files = {"file": ("test.docx", b"word content", "application/vnd.openxmlformats")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400


# ============================================================================
# Extract Endpoint Tests (Phase 3/4 - Document Intelligence + Embeddings)
# ============================================================================

def test_extract_returns_200(client, upload_id, mock_doc_intelligence, mock_blob_service, mock_openai, mock_cosmos):
    """POST /extract returns 200 with valid upload_id."""
    response = client.post(f"/extract?upload_id={upload_id}")
    assert response.status_code == 200


def test_extract_returns_chunks(client, upload_id, mock_doc_intelligence, mock_blob_service, mock_openai, mock_cosmos):
    """POST /extract returns document chunks."""
    response = client.post(f"/extract?upload_id={upload_id}")
    data = response.json()
    assert "upload_id" in data
    assert "total_pages" in data
    assert "total_chunks" in data
    assert "chunks" in data
    assert data["status"] == "indexed"  # Changed from "extracted" to "indexed"


def test_extract_invalid_upload_returns_404(client):
    """POST /extract with invalid upload_id returns 404."""
    response = client.post("/extract?upload_id=non-existent-id")
    assert response.status_code == 404


def test_extract_chunks_have_required_fields(client, upload_id, mock_doc_intelligence, mock_blob_service, mock_openai, mock_cosmos):
    """POST /extract returns chunks with required fields."""
    response = client.post(f"/extract?upload_id={upload_id}")
    data = response.json()
    for chunk in data["chunks"]:
        assert "chunk_id" in chunk
        assert "upload_id" in chunk
        assert "section" in chunk
        assert "page" in chunk
        assert "content" in chunk


# ============================================================================
# Analyse Endpoint Tests (Phase 4 - GPT-4o Analysis)
# ============================================================================

def test_analyse_returns_200(client, indexed_upload_id, mock_openai, mock_cosmos):
    """POST /analyse returns 200 with valid input."""
    response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    assert response.status_code == 200


def test_analyse_returns_report(client, indexed_upload_id, mock_openai, mock_cosmos):
    """POST /analyse returns complete report structure."""
    response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    data = response.json()
    assert "report_id" in data
    assert "company_name" in data
    assert "overall_score" in data
    assert "domain_summary" in data
    assert "findings" in data
    assert data["status"] == "complete"


def test_analyse_uses_provided_user_id(client, indexed_upload_id, mock_openai, mock_cosmos):
    """POST /analyse stores report with provided user_id (multi-tenancy)."""
    custom_user_id = "user-12345@company.com"
    response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level",
        "user_id": custom_user_id
    })
    data = response.json()
    assert response.status_code == 200
    assert data["user_id"] == custom_user_id


def test_analyse_defaults_to_demo_user(client, indexed_upload_id, mock_openai, mock_cosmos):
    """POST /analyse uses demo-user when user_id not provided."""
    response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    data = response.json()
    assert response.status_code == 200
    assert data["user_id"] == "demo-user"


def test_analyse_invalid_upload_returns_404(client):
    """POST /analyse with invalid upload_id returns 404."""
    response = client.post("/analyse", json={
        "upload_id": "non-existent-id",
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    assert response.status_code == 404


def test_analyse_invalid_framework_returns_400(client, indexed_upload_id):
    """POST /analyse with invalid framework returns 400."""
    response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "invalid-framework"
    })
    assert response.status_code == 400


def test_analyse_malformed_json_returns_422(client):
    """POST /analyse with malformed JSON returns 422."""
    response = client.post(
        "/analyse",
        content='{"invalid": json}',
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


def test_analyse_requires_indexed_document(client, upload_id):
    """POST /analyse returns 400 if document not extracted."""
    response = client.post("/analyse", json={
        "upload_id": upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    assert response.status_code == 400
    assert "extracted" in response.json()["detail"].lower()


# ============================================================================
# Reports Endpoint Tests
# ============================================================================

def test_get_user_reports_returns_200(client):
    """GET /reports/{user_id} returns 200."""
    response = client.get("/reports/demo-user")
    assert response.status_code == 200


def test_get_user_reports_returns_list(client):
    """GET /reports/{user_id} returns reports array."""
    response = client.get("/reports/demo-user")
    data = response.json()
    assert "reports" in data
    assert isinstance(data["reports"], list)


# ============================================================================
# Single Report Endpoint Tests
# ============================================================================

def test_get_report_returns_200(client, indexed_upload_id, mock_openai, mock_cosmos):
    """GET /report/{report_id} returns 200 for existing report."""
    # First create a report
    analyse_response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    report_id = analyse_response.json()["report_id"]

    # Then fetch it
    response = client.get(f"/report/{report_id}")
    assert response.status_code == 200


def test_get_missing_report_returns_404(client, mock_cosmos):
    """GET /report/{report_id} returns 404 for missing report."""
    response = client.get("/report/non-existent-report-id")
    assert response.status_code == 404


# ============================================================================
# Gap Update Endpoint Tests
# ============================================================================

def test_update_gap_returns_200(client, indexed_upload_id, mock_openai, mock_cosmos):
    """PATCH /report/{id}/gap/{gap_id} returns 200."""
    # Create a report first
    analyse_response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    report_id = analyse_response.json()["report_id"]
    findings = analyse_response.json()["findings"]

    # Update the first finding
    if findings:
        gap_id = findings[0]["requirement_id"]
        response = client.patch(
            f"/report/{report_id}/gap/{gap_id}",
            json={"status": "in_progress"}
        )
        assert response.status_code == 200


def test_update_gap_invalid_status_returns_422(client, indexed_upload_id, mock_openai, mock_cosmos):
    """PATCH /report/{id}/gap/{gap_id} with invalid status returns 422."""
    # Create a report first
    analyse_response = client.post("/analyse", json={
        "upload_id": indexed_upload_id,
        "company_name": "Test Corp",
        "framework": "disp-entry-level"
    })
    report_id = analyse_response.json()["report_id"]
    findings = analyse_response.json()["findings"]

    # Try invalid status
    if findings:
        gap_id = findings[0]["requirement_id"]
        response = client.patch(
            f"/report/{report_id}/gap/{gap_id}",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 422


def test_update_gap_missing_report_returns_404(client, mock_cosmos):
    """PATCH /report/{id}/gap/{gap_id} with missing report returns 404."""
    response = client.patch(
        "/report/non-existent/gap/DISP-SG-001",
        json={"status": "resolved"}
    )
    assert response.status_code == 404


# ============================================================================
# Frameworks Endpoint Tests
# ============================================================================

def test_frameworks_returns_200(client):
    """GET /frameworks returns 200."""
    response = client.get("/frameworks")
    assert response.status_code == 200


def test_frameworks_returns_list(client):
    """GET /frameworks returns frameworks array."""
    response = client.get("/frameworks")
    data = response.json()
    assert "frameworks" in data
    assert isinstance(data["frameworks"], list)
    assert len(data["frameworks"]) >= 2  # At least DISP and E8


def test_frameworks_contain_required_fields(client):
    """GET /frameworks returns frameworks with required fields."""
    response = client.get("/frameworks")
    data = response.json()
    for framework in data["frameworks"]:
        assert "framework_id" in framework
        assert "framework_name" in framework
        assert "total_requirements" in framework


# ============================================================================
# Root Endpoint Tests
# ============================================================================

def test_root_returns_200(client):
    """GET / returns 200."""
    response = client.get("/")
    assert response.status_code == 200


def test_root_returns_api_info(client):
    """GET / returns API info."""
    response = client.get("/")
    data = response.json()
    assert data["name"] == "Clearance API"
    assert "version" in data
    assert data["status"] == "running"
