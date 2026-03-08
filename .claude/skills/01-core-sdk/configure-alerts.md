# Configure Alerts Skill

Set up alert and notification nodes for Teams, Slack, email, or PagerDuty.

## Usage

`/configure-alerts <provider>` -- Configure an alert node for the given provider

Examples:

- `/configure-alerts teams`
- `/configure-alerts slack`
- `/configure-alerts email`
- `/configure-alerts pagerduty`

## Steps

1. Ensure the required environment variables are set in `.env` (see Environment Variables table below).

2. Create or modify the workflow to include the appropriate alert node with the correct configuration.

3. Test the notification by running the workflow with a sample alert payload.

## Environment Variables

Each provider requires specific environment variables in `.env`:

| Provider    | Required Variables                                                      |
| ----------- | ----------------------------------------------------------------------- |
| `teams`     | `TEAMS_WEBHOOK_URL`                                                     |
| `slack`     | `SLACK_WEBHOOK_URL`                                                     |
| `email`     | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` |
| `pagerduty` | `PAGERDUTY_ROUTING_KEY`                                                 |

## Template

### Teams Alert

```python
import os
from dotenv import load_dotenv
from kailash import NodeRegistry, WorkflowBuilder, Runtime

load_dotenv()

# Read webhook URL from .env -- NEVER hardcode
webhook_url = os.environ["TEAMS_WEBHOOK_URL"]

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("TeamsAlertNode", "alert", {
    "webhook_url": webhook_url,
})

workflow = builder.build(registry)
runtime = Runtime(registry)

result = runtime.execute(workflow, {
    "title": "Deployment Alert",
    "message": "Service v2.1.0 deployed successfully",
    "severity": "info",
})
print(f"Alert sent: {result['run_id']}")
```

### Slack Alert

```python
import os
from dotenv import load_dotenv
from kailash import NodeRegistry, WorkflowBuilder, Runtime

load_dotenv()

webhook_url = os.environ["SLACK_WEBHOOK_URL"]

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("SlackAlertNode", "alert", {
    "webhook_url": webhook_url,
    "channel": "#alerts",
})

workflow = builder.build(registry)
runtime = Runtime(registry)

result = runtime.execute(workflow, {
    "title": "Build Failed",
    "message": "CI pipeline failed on main branch",
    "severity": "error",
})
print(f"Alert sent: {result['run_id']}")
```

### Email Alert

```python
import os
from dotenv import load_dotenv
from kailash import NodeRegistry, WorkflowBuilder, Runtime

load_dotenv()

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("EmailAlertNode", "alert", {
    "smtp_host": os.environ["SMTP_HOST"],
    "smtp_port": os.environ["SMTP_PORT"],
    "smtp_username": os.environ["SMTP_USERNAME"],
    "smtp_password": os.environ["SMTP_PASSWORD"],
    "from": os.environ["SMTP_FROM"],
})

workflow = builder.build(registry)
runtime = Runtime(registry)

result = runtime.execute(workflow, {
    "to": "ops@example.com",
    "subject": "Critical: Database CPU > 90%",
    "message": "Database server db-prod-01 CPU usage exceeded 90% threshold.",
    "severity": "critical",
})
print(f"Email alert sent: {result['run_id']}")
```

### PagerDuty Alert

```python
import os
from dotenv import load_dotenv
from kailash import NodeRegistry, WorkflowBuilder, Runtime

load_dotenv()

routing_key = os.environ["PAGERDUTY_ROUTING_KEY"]

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("PagerDutyAlertNode", "alert", {
    "routing_key": routing_key,
})

workflow = builder.build(registry)
runtime = Runtime(registry)

result = runtime.execute(workflow, {
    "title": "Production Outage",
    "message": "API gateway returning 503 for all requests",
    "severity": "critical",
    "source": "api-gateway-prod",
})
print(f"PagerDuty incident created: {result['run_id']}")
```

## Verify

```bash
python -c "
from kailash import NodeRegistry
registry = NodeRegistry()
for name in ['TeamsAlertNode', 'SlackAlertNode', 'EmailAlertNode', 'PagerDutyAlertNode']:
    assert registry.has_type(name), f'{name} not found'
    print(f'{name}: OK')
"
```
