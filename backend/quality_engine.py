"""
Quality Engine for Clearance Assessment v2.0
Implements confidence scoring, evidence validation, and structured gap analysis.
"""

import re
from typing import Optional
from difflib import SequenceMatcher
from dataclasses import dataclass, field
from enum import Enum


class ConfidenceTier(str, Enum):
    """Confidence tier classification for assessment findings."""
    HIGH = "high"           # >= 0.90 - Strong evidence, high reliability
    MODERATE = "moderate"   # >= 0.70 - Reasonable evidence, some uncertainty
    LOW = "low"            # >= 0.50 - Weak evidence, significant uncertainty
    REVIEW = "review"      # < 0.50 - Requires manual review


class ValidationFlag(str, Enum):
    """Flags indicating potential issues with a finding."""
    QUOTE_NOT_FOUND = "quote_not_found"           # Evidence quote not in source
    QUOTE_PARTIAL_MATCH = "quote_partial_match"   # Quote only partially matches
    NO_PAGE_REFERENCE = "no_page_reference"       # Missing page citation
    GENERIC_LANGUAGE = "generic_language"         # Gap description is too vague
    CONFLICTING_STATUS = "conflicting_status"     # Confidence doesn't match status
    LOW_SEMANTIC_MATCH = "low_semantic_match"     # Evidence chunks poorly matched


@dataclass
class ValidationResult:
    """Result of evidence validation."""
    is_valid: bool
    similarity_score: float
    flags: list[ValidationFlag] = field(default_factory=list)
    matched_text: Optional[str] = None
    matched_page: Optional[int] = None


def get_confidence_tier(confidence: float) -> ConfidenceTier:
    """Convert numeric confidence to tier classification."""
    if confidence >= 0.90:
        return ConfidenceTier.HIGH
    elif confidence >= 0.70:
        return ConfidenceTier.MODERATE
    elif confidence >= 0.50:
        return ConfidenceTier.LOW
    else:
        return ConfidenceTier.REVIEW


def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate similarity ratio between two text strings."""
    if not text1 or not text2:
        return 0.0
    # Normalize texts
    t1 = text1.lower().strip()
    t2 = text2.lower().strip()
    return SequenceMatcher(None, t1, t2).ratio()


def validate_evidence_quote(
    quote: Optional[str],
    chunks: list[dict],
    min_similarity: float = 0.75
) -> ValidationResult:
    """
    Validate that an evidence quote exists in the source chunks.
    Uses fuzzy matching to handle minor variations.
    """
    if not quote:
        return ValidationResult(
            is_valid=False,
            similarity_score=0.0,
            flags=[ValidationFlag.QUOTE_NOT_FOUND]
        )

    best_match = 0.0
    best_text = None
    best_page = None

    for chunk in chunks:
        content = chunk.get("content", "")
        page = chunk.get("page")

        # Check if quote is a substring (exact match)
        if quote.lower() in content.lower():
            return ValidationResult(
                is_valid=True,
                similarity_score=1.0,
                flags=[],
                matched_text=quote,
                matched_page=page
            )

        # Try fuzzy matching on sentences
        sentences = re.split(r'[.!?]\s+', content)
        for sentence in sentences:
            similarity = calculate_similarity(quote, sentence)
            if similarity > best_match:
                best_match = similarity
                best_text = sentence
                best_page = page

    # Determine validation result
    flags = []
    if best_match < min_similarity:
        flags.append(ValidationFlag.QUOTE_NOT_FOUND)
    elif best_match < 0.90:
        flags.append(ValidationFlag.QUOTE_PARTIAL_MATCH)

    return ValidationResult(
        is_valid=best_match >= min_similarity,
        similarity_score=best_match,
        flags=flags,
        matched_text=best_text,
        matched_page=best_page
    )


def detect_generic_language(text: str) -> bool:
    """Detect if gap description uses overly generic language."""
    generic_patterns = [
        r"^no evidence",
        r"^not found",
        r"^missing",
        r"^none",
        r"documentation (is )?required",
        r"should be implemented",
        r"needs to be",
        r"must be established",
    ]

    text_lower = text.lower().strip()
    for pattern in generic_patterns:
        if re.search(pattern, text_lower):
            return True
    return False


def check_status_confidence_alignment(status: str, confidence: float) -> bool:
    """Check if status and confidence are logically aligned."""
    if status == "pass" and confidence < 0.70:
        return False  # Pass with low confidence is suspicious
    if status == "fail" and confidence > 0.80:
        return False  # Fail with high confidence is contradictory
    return True


def validate_finding(
    finding: dict,
    evidence_chunks: list[dict]
) -> dict:
    """
    Comprehensive validation of a finding.
    Returns enhanced finding with validation metadata.
    """
    flags = []

    # 1. Validate evidence quote
    quote_validation = validate_evidence_quote(
        finding.get("evidence_quote"),
        evidence_chunks
    )
    flags.extend(quote_validation.flags)

    # 2. Check page reference
    if not finding.get("page_reference"):
        flags.append(ValidationFlag.NO_PAGE_REFERENCE)

    # 3. Check for generic language
    gap_desc = finding.get("gap_description", "")
    if detect_generic_language(gap_desc):
        flags.append(ValidationFlag.GENERIC_LANGUAGE)

    # 4. Check status-confidence alignment
    if not check_status_confidence_alignment(
        finding.get("status", "fail"),
        finding.get("confidence", 0.0)
    ):
        flags.append(ValidationFlag.CONFLICTING_STATUS)

    # Calculate confidence tier
    raw_confidence = finding.get("confidence", 0.0)
    confidence_tier = get_confidence_tier(raw_confidence)

    # Determine if manual review is needed
    needs_review = (
        confidence_tier == ConfidenceTier.REVIEW or
        ValidationFlag.QUOTE_NOT_FOUND in flags or
        ValidationFlag.CONFLICTING_STATUS in flags
    )

    return {
        **finding,
        "confidence_tier": confidence_tier.value,
        "evidence_validated": quote_validation.is_valid,
        "evidence_similarity": quote_validation.similarity_score,
        "validation_flags": [f.value for f in flags],
        "needs_manual_review": needs_review
    }


# ============================================================================
# Structured Gap Description Parser
# ============================================================================

@dataclass
class StructuredGap:
    """Structured representation of a compliance gap."""
    whats_missing: str
    whats_found: Optional[str]
    requirement_reference: str
    compliance_delta: str
    completion_percentage: int  # 0-100
    missing_elements: list[str]


def parse_structured_gap_response(gpt_response: dict, requirement: dict) -> dict:
    """
    Parse GPT response into structured gap format.
    Extracts detailed gap information for better remediation guidance.
    """
    status = gpt_response.get("status", "fail")
    gap_desc = gpt_response.get("gap_description", "")
    evidence = gpt_response.get("evidence_quote", "")

    # Estimate completion percentage based on status
    if status == "pass":
        completion = 100
    elif status == "partial":
        completion = 50  # Default for partial
        # Try to extract more specific percentage if mentioned
        pct_match = re.search(r'(\d+)%', gap_desc)
        if pct_match:
            completion = min(int(pct_match.group(1)), 99)
    else:
        completion = 0

    # Extract missing elements from gap description
    missing_elements = []
    if status != "pass":
        # Look for bullet points or listed items
        bullets = re.findall(r'[-*]\s*([^-*\n]+)', gap_desc)
        if bullets:
            missing_elements = [b.strip() for b in bullets]
        else:
            # Try to extract key missing components
            missing_patterns = [
                r"missing[:\s]+([^.]+)",
                r"no[t]?\s+(?:found|documented|implemented)[:\s]+([^.]+)",
                r"lacks?\s+([^.]+)",
                r"absence of\s+([^.]+)",
            ]
            for pattern in missing_patterns:
                matches = re.findall(pattern, gap_desc, re.IGNORECASE)
                missing_elements.extend([m.strip() for m in matches])

    # Build structured gap
    structured = {
        "whats_missing": gap_desc if status != "pass" else "",
        "whats_found": evidence if evidence else None,
        "requirement_reference": requirement.get("id", ""),
        "requirement_domain": requirement.get("domain", ""),
        "compliance_delta": _calculate_compliance_delta(status, gap_desc),
        "completion_percentage": completion,
        "missing_elements": missing_elements[:5]  # Limit to 5 elements
    }

    return structured


def _calculate_compliance_delta(status: str, gap_desc: str) -> str:
    """Calculate a human-readable compliance delta description."""
    if status == "pass":
        return "Requirement fully satisfied"
    elif status == "partial":
        return "Partial compliance - requires completion"
    else:
        if "no evidence" in gap_desc.lower():
            return "No compliance evidence - full implementation required"
        elif "draft" in gap_desc.lower():
            return "Draft documentation exists - requires formalization"
        else:
            return "Non-compliant - remediation required"


# ============================================================================
# Control Mapping for Cross-References
# ============================================================================

# DISP to ASD E8 control mapping
CONTROL_MAPPING = {
    # Information & Cybersecurity maps to E8
    "DISP-IC-001": ["E8-AC", "E8-RAP"],      # Access controls
    "DISP-IC-002": ["E8-AC", "E8-PA"],        # Encryption/patching
    "DISP-IC-003": ["E8-AC", "E8-PA", "E8-PO"],  # Malware protection
    "DISP-IC-004": ["E8-RAP"],                # Audit logs

    # Security Governance overlaps
    "DISP-SG-006": ["E8-UAH"],  # Security awareness
    "DISP-SG-013": ["E8-AC", "E8-ROM"],  # Information handling

    # Personnel Security
    "DISP-PS-003": ["E8-RAP", "E8-MFA"],  # Clearances/access
}

# Reverse mapping: E8 to DISP
E8_TO_DISP_MAPPING = {}
for disp_id, e8_ids in CONTROL_MAPPING.items():
    for e8_id in e8_ids:
        if e8_id not in E8_TO_DISP_MAPPING:
            E8_TO_DISP_MAPPING[e8_id] = []
        E8_TO_DISP_MAPPING[e8_id].append(disp_id)


def get_cross_references(requirement_id: str) -> dict:
    """Get cross-references to related controls in other frameworks."""
    result = {
        "related_controls": [],
        "efficiency_note": None
    }

    if requirement_id.startswith("DISP-"):
        related = CONTROL_MAPPING.get(requirement_id, [])
        if related:
            result["related_controls"] = related
            result["efficiency_note"] = (
                f"Addressing this gap may also satisfy {len(related)} "
                f"ASD Essential Eight control(s): {', '.join(related)}"
            )
    elif requirement_id.startswith("E8-"):
        related = E8_TO_DISP_MAPPING.get(requirement_id, [])
        if related:
            result["related_controls"] = related
            result["efficiency_note"] = (
                f"This control overlaps with {len(related)} DISP requirement(s)"
            )

    return result


# ============================================================================
# Enhanced GPT Prompt for Structured Output
# ============================================================================

ENHANCED_SYSTEM_PROMPT = """You are a defence compliance analyst specialising in the Australian Defence Industry Security Programme (DISP) and ASD Essential Eight. Your task is to assess whether the provided document evidence satisfies a specific compliance requirement.

You will receive:
1. A compliance requirement with its ID, domain, and full text
2. Relevant excerpts from the company's security documentation with page references

Respond ONLY with a valid JSON object in this exact schema. No preamble, no explanation, no markdown:
{
  "requirement_id": "string",
  "status": "pass" | "partial" | "fail",
  "confidence": 0.0-1.0,
  "evidence_quote": "direct quote from document (verbatim, under 50 words) or null",
  "page_reference": integer or null,
  "gap_description": "specific description with structure: what is missing AND what DISP requires",
  "whats_found": "brief description of what evidence exists (if any)",
  "missing_elements": ["list", "of", "specific", "missing", "items"],
  "completion_percentage": 0-100,
  "recommended_action": "specific, actionable step with role assignment (e.g., 'Security Officer should...')",
  "estimated_effort": "hours" | "days" | "weeks",
  "risk_rating": "high" | "medium" | "low"
}

CRITICAL RULES:
- Confidence scoring:
  * 0.90-1.0: Clear, specific, verifiable evidence with exact policy/procedure references
  * 0.70-0.89: Good evidence but missing some verification or specificity
  * 0.50-0.69: Weak evidence, generic statements, or outdated documentation
  * Below 0.50: No meaningful evidence or conflicting information

- Status definitions:
  * "pass" = Clear, specific, verifiable evidence exists (confidence should be >= 0.80)
  * "partial" = Some evidence exists but incomplete, draft, or lacks verification (confidence 0.50-0.79)
  * "fail" = No evidence found, or only generic statements (confidence < 0.50)

- Evidence quotes MUST be verbatim from the provided excerpts
- Gap descriptions must be specific, referencing what DISP requires vs what was found
- Never invent evidence that is not in the provided excerpts
- Always assign a responsible role in recommended_action (Security Officer, IT Manager, HR Manager, etc.)
- completion_percentage: 100 for pass, estimate partial completion, 0 for no evidence"""


def build_enhanced_user_prompt(requirement: dict, evidence_text: str) -> str:
    """Build enhanced user prompt with full requirement context."""
    return f"""Requirement ID: {requirement.get('id', 'N/A')}
Domain: {requirement.get('domain', 'N/A')}
Requirement: {requirement.get('requirement_text', 'N/A')}

Document Evidence:
{evidence_text if evidence_text.strip() else "No relevant evidence found in the uploaded documents."}

Analyze this requirement thoroughly and provide your assessment as JSON.
Be specific about what evidence exists vs what is missing.
Assign clear responsibility in your recommended action."""
