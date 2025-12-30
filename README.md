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

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- GitHub Personal Access Token with appropriate scopes

### 1. Clone and Build

```bash
git clone https://github.com/wilsonhj/github-ruleset-mcp.git
cd github-ruleset-mcp
npm install
npm run build
```

### 2. Configure GitHub Token

Choose one of these secure methods:

#### Option A: Environment Variable (Recommended)

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Then reload: `source ~/.zshrc`

#### Option B: macOS Keychain (Most Secure)

```bash
# Store token in Keychain
security add-generic-password -a "$USER" -s "github_personal_access_token" -w "ghp_your_token_here"

# Add to ~/.zshrc
echo 'export GITHUB_TOKEN=$(security find-generic-password -a "$USER" -s "github_personal_access_token" -w 2>/dev/null)' >> ~/.zshrc

source ~/.zshrc
```

### 3. Add to Claude Desktop

Edit your Claude Desktop config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github-ruleset": {
      "command": "node",
      "args": ["/absolute/path/to/github-ruleset-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/github-ruleset-mcp` with the actual path.

### 4. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 5. Verify Installation

Ask Claude: "List available GitHub ruleset templates"

If you see 4 templates (standard, strict, relaxed, controlled), it's working! ✅

## Testing (Optional)

Test the server before adding to Claude Desktop:

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web UI where you can interactively test all 5 tools.

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

### Creating a Fine-Grained Token (Recommended)

1. Go to https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**
3. Configure:
   - **Token name**: `github-ruleset-mcp`
   - **Expiration**: 90 days (or custom)
   - **Repository access**: "Only select repositories" or "All repositories"
4. Set **Repository permissions**:
   - **Administration**: Read and write ✅
   - **Contents**: Read-only ✅
5. Generate and copy the token immediately

### Classic Token (Alternative)

If using classic tokens, you need:
- `repo` — Full repository access
- `admin:org_hook` — Organization ruleset access (if managing org-level rulesets)

## Troubleshooting

### "GITHUB_TOKEN environment variable is required"

The token isn't set in your environment. Verify:

```bash
echo $GITHUB_TOKEN
```

If empty, check that:
1. You added the token to your shell profile (`~/.zshrc`)
2. You ran `source ~/.zshrc` to reload
3. Claude Desktop was restarted after setting the token

### "GraphQL: Could not resolve to a Repository"

Check that:
1. Repository owner/name are correct
2. Your token has access to the repository
3. The repository exists

### MCP Server Not Showing in Claude Desktop

1. Verify the config file path is correct
2. Check the `args` path points to the compiled `dist/index.js`
3. Restart Claude Desktop completely (quit and reopen)
4. Check Claude Desktop logs for errors

### Tools Execute But Nothing Happens

If using `apply_ruleset`, remember it defaults to **dry-run mode**. Set `dry_run: false` to actually apply changes.

## Advanced

See [docs/ADVANCED.md](docs/ADVANCED.md) for:
- Custom ruleset JSON
- Multi-agent integration
- CI/CD pipeline integration

## Contributing

PRs welcome! Please open an issue first for major changes.

## License

MIT
