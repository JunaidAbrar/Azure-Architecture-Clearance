# ADR-003: Australia East Data Sovereignty

## Status

Accepted

## Context

Clearance processes sensitive security documentation from Australian defence supply chain SMEs. This includes:
- Information Security Management System (ISMS) documents
- Security governance policies
- Personnel security procedures
- Access control configurations

These documents describe how companies protect classified and sensitive information. Customers require absolute assurance that this data never leaves Australian jurisdiction.

## Decision

All Azure services deployed exclusively to **Australia East (Sydney)** region. No data transmitted to overseas regions, third-party services, or OpenAI's US infrastructure.

## Rationale

### Customer Requirement

Defence SMEs operate under the Protective Security Policy Framework (PSPF) and Defence Industry Security Programme (DISP). While Clearance operates on unclassified documents only, customers expect enterprise-grade data handling. "Where is my data stored?" is the first question every enterprise security team asks.

Answer: Sydney. Only Sydney. Verifiable in Azure Portal.

### Azure OpenAI Australia East

Unlike OpenAI's consumer API (US-hosted), Azure OpenAI can be provisioned in Australia East with explicit data residency guarantees:

> "Your data remains within the geography you selected during resource creation."
> — Microsoft Azure Data Residency Documentation

This is a **competitive differentiator** versus tools using direct OpenAI API integration.

### Regulatory Alignment

| Framework | Requirement | Clearance Compliance |
|-----------|-------------|----------------------|
| PSPF | Data sovereignty for sensitive information | Australia East only |
| DISP | Information security controls | Data never leaves jurisdiction |
| Privacy Act 1988 | Cross-border data transfer restrictions | No overseas transfer |
| Future IRAP | Australian hosting requirement | Met from day one |

### Enabling Future Certification

IRAP (Infosec Registered Assessors Program) assessment of the Clearance platform itself requires Australian data residency. By architecting for this from MVP, the certification path is clear:

1. ThincSeed funding secured
2. Customer traction demonstrated
3. IRAP assessment engaged (12-18 months post-funding)
4. Government and Defence prime contractor sales enabled

## Implementation

### Resource Deployment

All `az` CLI commands specify `--location australiaeast`:

```bash
az group create --name clearance-rg --location australiaeast
az cognitiveservices account create --location australiaeast ...
az cosmosdb create --locations regionName=australiaeast ...
```

### Azure OpenAI Model Availability

Verified available in Australia East (as of 2024):
- ✅ gpt-4o
- ✅ gpt-4o-mini
- ✅ text-embedding-3-small
- ✅ text-embedding-3-large

### Validation

Azure Portal → Resource Group → Each resource → Overview → Location = "Australia East"

## Consequences

### Positive

- Clear customer answer: "Your data stays in Sydney"
- Regulatory compliance from day one
- IRAP certification path unblocked
- Competitive advantage versus US-hosted alternatives

### Trade-offs Accepted

**Feature Availability**

Some Azure preview features arrive in US regions first. Mitigation:
- Core features (GPT-4o, embeddings, Cosmos vector search) are GA in Australia East
- No preview dependencies in MVP architecture

**Latency**

Users in Perth/Brisbane experience ~20-50ms additional latency versus local regions. Mitigation:
- Assessment pipeline is async (seconds, not milliseconds)
- Latency imperceptible for document upload/analysis workflows
- 95%+ of defence SMEs are in Sydney/Melbourne/Adelaide corridor

### Monitoring

Application Insights tracks request origin. If significant user base emerges in other regions, evaluate Azure Front Door for edge caching of static assets (without moving data processing).

## References

- [Azure Data Residency](https://azure.microsoft.com/en-us/explore/global-infrastructure/data-residency/)
- [Azure OpenAI Data Privacy](https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy)
- [IRAP Assessment Framework](https://www.cyber.gov.au/resources-business-and-government/assessment-and-evaluation-programs/infosec-registered-assessors-program)
