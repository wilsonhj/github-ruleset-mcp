# github-ruleset-mcp

> Branch protection as code. 4 templates, 5 tools, 2-minute setup.

An MCP server that lets Claude (or any MCP client) manage GitHub branch protection rulesets programmatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why?

Setting up branch protection manually is tedious. This MCP server lets you say:

```
Protect myorg/api with standard rules
```

And Claude handles the rest—validating, previewing, and applying the ruleset via GitHub's API.

## Quick Start

```bash
# Clone and install
git clone https://github.com/wilsonhj/github-ruleset-mcp.git
cd github-ruleset-mcp
npm install && npm run build

# Set your GitHub token (needs repo + admin:org_hook scopes)
export GITHUB_TOKEN="ghp_your_token"
```

Add to Claude Desktop config (`~/.config/claude/claude_desktop_config.json` on Linux, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "github-rulesets": {
      "command": "node",
      "args": ["/absolute/path/to/github-ruleset-mcp/dist/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_your_token" }
    }
  }
}
```

Restart Claude Desktop. Done.

## Templates

| Template | When to Use | What It Does |
|----------|-------------|--------------|
| `standard` | Most repos | 1 approval, CI required, no force push |
| `strict` | Production | 2 approvals, signed commits, code scanning |
| `relaxed` | Dev branches | PR required, no approval needed |
| `controlled` | Releases | Team-gated, staging deploy required |

## Tools

| Tool | Description |
|------|-------------|
| `apply_ruleset` | Apply branch protection (dry-run by default) |
| `check_protection` | Verify a branch is protected |
| `list_rulesets` | Show all rulesets in a repo |
| `delete_ruleset` | Remove a ruleset (requires confirmation) |
| `list_templates` | Show available templates |

## Examples

**Protect a new repo:**
```
Apply standard branch protection to myorg/new-service
```

**Pre-deployment check:**
```
Verify myorg/api has branch protection before I deploy
```

**Custom ruleset:**
```
Protect myorg/api main branch requiring 3 approvals and signed commits
```

## Token Scopes

Your GitHub Personal Access Token needs:
- `repo` — Repository access
- `admin:org_hook` — Organization ruleset access

## Advanced

See [docs/ADVANCED.md](docs/ADVANCED.md) for:
- Custom ruleset JSON
- Multi-agent integration
- CI/CD pipeline integration

## Contributing

PRs welcome! Please open an issue first for major changes.

## License

MIT
