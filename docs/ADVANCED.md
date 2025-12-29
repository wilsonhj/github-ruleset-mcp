# Advanced Usage

## Custom Rulesets

Instead of templates, pass a custom ruleset:

```json
{
  "owner": "myorg",
  "repo": "myrepo",
  "custom_ruleset": {
    "name": "custom-protection",
    "target_branches": ["main", "release/*"],
    "enforcement": "active",
    "rules": [
      { "type": "block_force_pushes" },
      { "type": "require_pull_request", "parameters": { "required_approval_count": 3 } }
    ]
  }
}
```

### Available Rule Types

| Rule | Description |
|------|-------------|
| `restrict_deletions` | Prevent branch deletion |
| `block_force_pushes` | Prevent force pushes |
| `require_linear_history` | No merge commits |
| `require_pull_request` | Require PR with approvals |
| `require_status_checks` | Require CI to pass |
| `require_signed_commits` | Require GPG/SSH signatures |
| `require_code_scanning` | Require security scanning |
| `require_deployments` | Require deployment to environment |

## Multi-Agent Integration

### Orchestrator Pattern

```typescript
// Your orchestrator agent
if (task.type === 'protect-repo') {
  const result = await mcpClient.callTool('apply_ruleset', {
    owner: task.owner,
    repo: task.repo,
    template: 'standard'
  });
}
```

### Pre-Deployment Gate

```typescript
// QA agent validates before deploy
const protection = await mcpClient.callTool('check_protection', {
  owner: 'myorg',
  repo: 'api',
  branch: 'main'
});

if (!protection.protected) {
  throw new Error('Deployment blocked: branch unprotected');
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Verify Protection
  run: |
    gh api repos/${{ github.repository }}/rules/branches/main \
      --jq 'length > 0' || exit 1
```

### Direct API Usage

```typescript
import { GitHubClient } from 'github-ruleset-mcp';

const client = new GitHubClient(process.env.GITHUB_TOKEN);
const result = await client.applyRuleset('myorg', 'myrepo', ruleset);
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | Personal access token |
| `GITHUB_OWNER` | No | Default org/user |
| `GITHUB_REPO` | No | Default repository |
