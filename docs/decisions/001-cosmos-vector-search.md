# ADR-001: Cosmos DB Vector Search Over Azure AI Search

## Status

Accepted

## Context

Clearance requires semantic search to match uploaded security policy documents against DISP compliance requirements. When a user uploads a PDF describing their "two-step login process," the system must recognize this as evidence for the "multi-factor authentication" requirement — even though the exact phrase never appears.

This requires vector embeddings and similarity search.

### Options Evaluated

| Option | Fixed Cost | Data Sovereignty | Complexity |
|--------|------------|------------------|------------|
| Azure AI Search (Basic) | $73/month | Australia East available | Separate service to manage |
| Azure AI Search (Free) | $0 | Limited to 50MB, 3 indexes | Not production-viable |
| Cosmos DB Vector Search | $0 fixed, ~$0.01/assessment | Australia East | Single database for all data |
| Pinecone / Weaviate | $0–$70/month | Data leaves Australia | External dependency |

## Decision

Use Cosmos DB with native vector search capability.

## Rationale

### Cost Elimination

Azure AI Search Basic tier costs $73/month regardless of usage. For a pre-revenue MVP with uncertain usage patterns, this is unacceptable. Cosmos DB serverless charges only for consumed RUs — estimated $0.01 per assessment for vector operations.

**Annual savings: $876**

### Architectural Simplicity

Storing document chunks and their embeddings in the same database as assessment reports eliminates:
- Cross-service data synchronization
- Additional connection strings and secrets
- Separate scaling considerations

One database. One billing meter. One failure domain.

### Data Sovereignty

Defence SMEs require assurance that their security documentation never leaves Australian jurisdiction. Cosmos DB Australia East meets this requirement. External vector databases (Pinecone, Weaviate) cannot guarantee Australian data residency.

### Technical Capability

Cosmos DB vector search (GA 2024) supports:
- Cosine similarity distance metric
- Up to 4096 dimensions per vector
- Integrated with existing Cosmos DB indexing
- No additional service provisioning

For 1536-dimension embeddings from text-embedding-3-small, this is sufficient.

## Consequences

### Positive

- $0 fixed monthly infrastructure cost
- Single database for entire application
- Data residency guarantee maintained
- Simpler deployment and monitoring

### Trade-offs Accepted

- Limited to cosine similarity (euclidean, dot product not available)
- Maximum 4096 dimensions constrains future embedding model choices
- Newer feature with less community documentation than AI Search

### Future Considerations

If query patterns require hybrid search (vector + full-text), Azure AI Search may become necessary. Current requirements are pure semantic matching — this trade-off is acceptable.

## References

- [Cosmos DB Vector Search Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/vector-search)
- [Azure AI Search Pricing](https://azure.microsoft.com/en-us/pricing/details/search/)
- [text-embedding-3-small Specifications](https://platform.openai.com/docs/guides/embeddings)
