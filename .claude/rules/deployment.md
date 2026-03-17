# Deployment Rules

## Scope

These rules apply to all deployment operations and deployment-related files.

## MUST Rules

### 1. CLI SSO Authentication Only

All cloud provider access MUST use CLI SSO authentication. No long-lived credentials.

**Correct**:

```bash
aws sso login --profile my-profile
az login
gcloud auth login
```

**Incorrect**:

```
❌ AWS_ACCESS_KEY_ID=AKIA...
❌ AZURE_CLIENT_SECRET=...
❌ GOOGLE_APPLICATION_CREDENTIALS pointing to committed JSON
```

**Enforced by**: validate-deployment.js hook, security-reviewer agent
**Violation**: BLOCK deployment

### 2. SSL Required for Production

All production endpoints MUST use HTTPS/TLS.

**Applies to**:

- API endpoints
- Web applications
- Webhook URLs
- Database connections (where supported)

### 3. Monitoring Before Go-Live

Production deployments MUST have monitoring configured before receiving traffic.

**Minimum requirements**:

- Health check endpoint responding
- Error alerting configured
- Basic metrics collection (CPU, memory, request rate)

### 4. Secrets via Provider's Secrets Manager

Production secrets MUST use the cloud provider's secrets management service, not environment variables on the host or committed files.

**Examples**:

- AWS: Secrets Manager or Parameter Store
- Azure: Key Vault
- GCP: Secret Manager

### 5. Deployment Config Documented

Every project that deploys MUST have `deploy/deployment-config.md` at the project root. Run `/deploy` to create it via the onboarding process.

### 6. Research Before Executing

Cloud provider CLIs and services change frequently. MUST verify current syntax via web search or `--help` before running deployment commands. Do NOT rely on memorized commands that may be outdated.

### 7. CI/CD GitHub Actions — ALWAYS ASK FIRST

MUST NOT auto-create `.github/workflows/` files without explicit human approval. GitHub Actions workflows consume CI minutes (a finite, paid resource) and can interfere with existing pipelines.

Before creating ANY workflow file:

1. Present the proposed workflow to the human
2. Explain compute cost implications (CI minutes, matrix size, build times)
3. Get explicit approval: "yes, create the workflow"
4. Only then create the file

**Existing workflows** may be MODIFIED with the standard code review process. Creating NEW workflows requires the approval gate above.

**Violation**: Unapproved CI workflow creation wastes compute resources and can break existing pipelines.

## MUST NOT Rules

### 1. No Long-Lived Cloud Credentials

MUST NOT store AWS access keys, Azure client secrets, or GCP service account JSON in:

- `.env` files
- Source code
- CI configuration (use CI's native secrets)
- Docker images

### 2. No Deployment Without Tests

MUST NOT deploy to production without a passing test suite.

### 3. No Unattended Destructive Operations

MUST NOT execute destructive cloud operations (delete resources, terminate instances, drop databases) without explicit human approval.

### 4. No Hardcoded Infrastructure

MUST NOT hardcode IP addresses, instance IDs, or resource ARNs in application code. Use service discovery, DNS, or configuration.

## Production Checklist

Before any production deployment:

- [ ] All tests pass
- [ ] Security review completed
- [ ] SSL/TLS configured
- [ ] Monitoring and alerting configured
- [ ] Secrets in provider's secrets manager
- [ ] Deployment runbook up to date in `deploy/deployment-config.md`
- [ ] Database migrations reviewed for destructive operations (DROP, ALTER DROP COLUMN)
- [ ] Rollback procedure documented and tested
- [ ] Right-sizing verified (check reserved instances / savings plans first)
- [ ] DNS configured
- [ ] Human approval obtained

## Exceptions

Deployment rule exceptions require:

1. Explicit human approval
2. Documentation in deployment-config.md
3. Time-limited (must be remediated)
