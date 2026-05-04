# ADR-005: Microsoft Entra ID Authentication

## Status

Accepted

## Context

Clearance needs authentication that:
1. Target customers (defence SMEs) already use
2. Requires zero registration friction
3. Projects enterprise credibility
4. Enables future multi-tenant features

### Options Evaluated

| Option | Friction | Enterprise Signal | SME Compatibility |
|--------|----------|-------------------|-------------------|
| Email/Password | High (new account) | Low | Universal |
| GitHub OAuth | Medium (many don't have) | Low | Developer-only |
| Google OAuth | Medium | Medium | Consumer association |
| Microsoft Entra ID | Zero (existing M365) | High | 95%+ of target market |

## Decision

Microsoft Entra ID authentication via Azure Static Web Apps built-in auth.

Users sign in with existing Microsoft 365 corporate credentials (user@company.com.au). No registration form. No password to remember.

## Rationale

### Target Market Alignment

Australian defence SMEs universally use Microsoft 365:
- Outlook for email
- Teams for communication
- SharePoint for document management
- OneDrive for file storage

"Sign in with Microsoft" uses credentials they type daily. Zero cognitive overhead.

### Enterprise Credibility

GitHub/Google OAuth signals "developer tool" or "consumer product." Microsoft Entra ID signals "enterprise platform." First impressions matter for B2B sales.

### Zero Friction Path

Traditional flow:
1. Enter email
2. Create password
3. Verify email
4. Complete profile
5. Finally access product

Entra ID flow:
1. Click "Sign in with Microsoft"
2. (Already logged into M365) → Auto-authenticated
3. Access product

One click. Existing credentials. Immediate value.

### Built-in Static Web Apps Support

Azure Static Web Apps provides Entra ID integration without custom code:

```json
// staticwebapp.config.json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/dashboard/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

Authentication handled at edge. Backend receives verified identity via `x-ms-client-principal` header.

### Future Multi-Tenant Features

Entra ID provides:
- Tenant ID (company identifier)
- User email domain (company grouping)
- Group memberships (role-based access)

Enables future features without auth re-architecture:
- Per-company assessment isolation
- Admin/viewer role separation
- SSO with customer's existing Entra ID tenant

## Consequences

### Positive

- Zero registration friction for 95%+ of target market
- Enterprise-grade perception
- Automatic session management
- Future multi-tenant path clear
- No password storage liability

### Trade-offs Accepted

**Personal Microsoft Accounts**

Users with personal Microsoft accounts (outlook.com, hotmail.com) can authenticate but aren't the target market. This is acceptable — if someone's testing with a personal account, they're evaluating for their company.

**Non-Microsoft Users Excluded**

The ~5% of SMEs using Google Workspace cannot sign in.

Mitigation:
- They are not the primary target market
- Can add Google OAuth later if demand materializes
- Better to optimize for 95% than accommodate 100%

**App Registration Required**

Must configure Entra ID application registration with:
- Redirect URIs
- Client secret
- API permissions

Mitigation: One-time setup. Well-documented process.

## Implementation

### Entra ID App Registration

1. Azure Portal → Microsoft Entra ID → App registrations → New
2. Name: "Clearance"
3. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
4. Redirect URI: `https://<swa-url>/.auth/login/aad/callback`
5. Create client secret (note: expires, set reminder)

### Static Web Apps Configuration

```json
{
  "routes": [
    { "route": "/login", "redirect": "/.auth/login/aad" },
    { "route": "/logout", "redirect": "/.auth/logout" },
    { "route": "/dashboard/*", "allowedRoles": ["authenticated"] },
    { "route": "/api/*", "allowedRoles": ["authenticated"] }
  ],
  "responseOverrides": {
    "401": { "redirect": "/login" }
  }
}
```

### Backend User Identity

```python
# api/dependencies.py
from fastapi import Request, HTTPException
import base64
import json

def get_current_user(request: Request) -> dict:
    principal = request.headers.get("x-ms-client-principal")
    if not principal:
        raise HTTPException(401, "Not authenticated")
    
    decoded = base64.b64decode(principal)
    return json.loads(decoded)
```

User object includes:
- `userId`: Unique identifier
- `userDetails`: Email address
- `identityProvider`: "aad"
- `claims`: Additional profile data

## References

- [Static Web Apps Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Entra ID App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Client Principal Header](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information)
