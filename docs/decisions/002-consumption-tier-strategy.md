# ADR-002: Consumption-Based Tier Strategy

## Status

Accepted

## Context

Clearance is an MVP built on Azure student credits ($100). The product must:
- Survive indefinitely on limited credits during development
- Support 100+ test assessments before demo day
- Scale to paid customers without re-architecture

Traditional "always-on" Azure services (App Service, Cosmos DB provisioned throughput, AI Search) consume credits continuously regardless of usage.

## Decision

Every Azure service uses consumption, serverless, or free tier exclusively.

| Service | Tier | Billing Model |
|---------|------|---------------|
| Azure Functions | Consumption | Per execution (1M/month free) |
| Cosmos DB | Serverless | Per RU consumed |
| Azure OpenAI | Pay-per-token | Per 1K tokens |
| Document Intelligence | F0 Free | 500 pages/month free |
| Static Web Apps | Free | 100GB bandwidth/month |
| Application Insights | Free | 5GB/month |

## Rationale

### Zero Fixed Costs

Monthly burn rate at zero usage: **$0.00**

This is critical for:
- Student credit preservation during development pauses
- No deadline pressure from depleting credits
- Freedom to iterate without cost anxiety

### Per-Assessment Economics

| Component | Cost per Assessment |
|-----------|---------------------|
| GPT-4o (36 requirements × ~2K tokens) | ~$0.40 |
| text-embedding-3-small | ~$0.01 |
| Document Intelligence | $0 (within free tier) |
| Cosmos DB RUs | ~$0.01 |
| Functions execution | $0 (within free tier) |
| **Total** | **~$0.50** |

$100 credits ÷ $0.50/assessment = **200 assessments** — more than enough for development, testing, demos, and initial customer pilots.

### Production Path

Consumption tiers scale automatically. No re-architecture required when customer load increases:
- Functions Consumption handles bursty traffic
- Cosmos DB serverless scales to 50K RU/s automatically
- OpenAI quotas can be increased via Azure portal

The only upgrade needed: Document Intelligence F0 → S0 when exceeding 500 pages/month.

## Consequences

### Positive

- Unlimited development runway on student credits
- Cost directly proportional to value delivered (assessments completed)
- No wasted spend during inactive periods
- Simple cost forecasting: customers × assessments × $0.50

### Trade-offs Accepted

**Cold Starts**

Functions Consumption plan has cold start latency (~2-3 seconds after idle). Mitigation:
- First page load triggers backend warm-up
- Analysis pipeline runs async — user sees progress indicator
- Demo day: pre-warm with test request 30 minutes before

**Document Intelligence Limits**

F0 tier: 500 pages/month, 2 pages/request, 10 calls/minute. Mitigation:
- Sufficient for MVP (50 assessments × 10 pages average)
- Upgrade to S0 ($1.50/1000 pages) when approaching limit
- Rate limiting in API prevents accidental exhaustion

**Cosmos DB Serverless Constraints**

- Maximum 50 RU/s per partition (burstable to 5000)
- No global distribution
- No autoscale (fixed at serverless pricing)

These are acceptable: MVP is single-region, single-tenant, low concurrency.

## Validation

Weekly cost check: Azure Portal → Cost Management → Cost Analysis → Filter by clearance-rg

Alert threshold: If weekly spend exceeds $5, investigate immediately.

## References

- [Azure Functions Consumption Plan](https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan)
- [Cosmos DB Serverless](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless)
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
