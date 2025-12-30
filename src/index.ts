#!/usr/bin/env node
/**
 * GitHub Ruleset MCP Server
 *
 * Exposes 5 tools for managing GitHub branch protection rulesets:
 * - apply_ruleset: Apply a protection template to a repository
 * - check_protection: Check if a branch is protected
 * - list_rulesets: List all rulesets in a repository
 * - delete_ruleset: Delete a ruleset by ID
 * - list_templates: Show available protection templates
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolResult
} from '@modelcontextprotocol/sdk/types.js';

import { GitHubClient } from './github.js';
import { getTemplate, listTemplates, TEMPLATES } from './templates.js';
import type { Ruleset } from './templates.js';

// Initialize server
const server = new Server(
  { name: 'github-ruleset-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Get GitHub client (lazily initialized)
let githubClient: GitHubClient | null = null;

function getGitHubClient(): GitHubClient {
  if (!githubClient) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    githubClient = new GitHubClient(token);
  }
  return githubClient;
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'apply_ruleset',
        description: 'Apply a branch protection ruleset to a GitHub repository. Use dry_run=true (default) to preview changes.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner (user or org)' },
            repo: { type: 'string', description: 'Repository name' },
            template: {
              type: 'string',
              description: 'Template name: standard, strict, relaxed, or controlled',
              enum: Object.keys(TEMPLATES)
            },
            dry_run: {
              type: 'boolean',
              description: 'Preview changes without applying (default: true)',
              default: true
            },
            custom_ruleset: {
              type: 'object',
              description: 'Custom ruleset JSON (overrides template if provided)',
              properties: {
                name: { type: 'string' },
                target_branches: { type: 'array', items: { type: 'string' } },
                enforcement: { type: 'string', enum: ['active', 'disabled'] },
                rules: { type: 'array' }
              }
            }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'check_protection',
        description: 'Check if a branch has protection rules applied',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            branch: { type: 'string', description: 'Branch name (default: main)', default: 'main' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'list_rulesets',
        description: 'List all rulesets configured for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'delete_ruleset',
        description: 'Delete a ruleset from a repository by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            ruleset_id: { type: 'number', description: 'Ruleset ID to delete' }
          },
          required: ['owner', 'repo', 'ruleset_id']
        }
      },
      {
        name: 'list_templates',
        description: 'List available branch protection templates with descriptions',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'apply_ruleset': {
        const { owner, repo, template, dry_run = true, custom_ruleset } = args as {
          owner: string;
          repo: string;
          template?: string;
          dry_run?: boolean;
          custom_ruleset?: Ruleset;
        };

        let ruleset: Ruleset;

        if (custom_ruleset) {
          ruleset = custom_ruleset;
        } else if (template) {
          const templateData = getTemplate(template);
          if (!templateData) {
            return {
              content: [{ type: 'text', text: `Unknown template: ${template}\n\nAvailable templates:\n${listTemplates()}` }],
              isError: true
            };
          }
          ruleset = templateData.ruleset;
        } else {
          return {
            content: [{ type: 'text', text: 'Either template or custom_ruleset is required' }],
            isError: true
          };
        }

        const client = getGitHubClient();
        const result = await client.applyRuleset(owner, repo, ruleset, dry_run);

        if (result.success) {
          const message = dry_run
            ? `✅ Dry run successful. Ruleset "${ruleset.name}" would be applied to ${owner}/${repo}.\n\nBranches: ${ruleset.target_branches.join(', ')}\nRules: ${ruleset.rules.map(r => r.type).join(', ')}\n\nRun with dry_run=false to apply.`
            : `✅ Ruleset "${ruleset.name}" applied to ${owner}/${repo} (ID: ${result.id})`;
          return { content: [{ type: 'text', text: message }] };
        } else {
          return { content: [{ type: 'text', text: `❌ Failed: ${result.error}` }], isError: true };
        }
      }

      case 'check_protection': {
        const { owner, repo, branch = 'main' } = args as {
          owner: string;
          repo: string;
          branch?: string;
        };

        const client = getGitHubClient();
        const result = await client.checkProtection(owner, repo, branch);

        if (result.error) {
          return { content: [{ type: 'text', text: `❌ Error: ${result.error}` }], isError: true };
        }

        const status = result.protected ? '🔒 Protected' : '🔓 Unprotected';
        const rulesText = result.rules.length > 0
          ? `\n\nActive rules:\n${result.rules.map(r => `• ${r}`).join('\n')}`
          : '';

        return { content: [{ type: 'text', text: `${status}: ${owner}/${repo}@${branch}${rulesText}` }] };
      }

      case 'list_rulesets': {
        const { owner, repo } = args as { owner: string; repo: string };

        const client = getGitHubClient();
        const rulesets = await client.listRulesets(owner, repo);

        if (rulesets.length === 0) {
          return { content: [{ type: 'text', text: `No rulesets found for ${owner}/${repo}` }] };
        }

        const list = rulesets.map(rs =>
          `• ${rs.name} (ID: ${rs.id})\n  Enforcement: ${rs.enforcement}\n  Branches: ${rs.branches.join(', ') || 'all'}`
        ).join('\n\n');

        return { content: [{ type: 'text', text: `Rulesets for ${owner}/${repo}:\n\n${list}` }] };
      }

      case 'delete_ruleset': {
        const { owner, repo, ruleset_id } = args as {
          owner: string;
          repo: string;
          ruleset_id: number;
        };

        const client = getGitHubClient();
        const result = await client.deleteRuleset(owner, repo, ruleset_id);

        if (result.success) {
          return { content: [{ type: 'text', text: `✅ Ruleset ${ruleset_id} deleted from ${owner}/${repo}` }] };
        } else {
          return { content: [{ type: 'text', text: `❌ Failed: ${result.error}` }], isError: true };
        }
      }

      case 'list_templates': {
        const templateList = Object.entries(TEMPLATES).map(([key, t]) => {
          const rules = t.ruleset.rules.map(r => r.type).join(', ');
          return `## ${key}\n${t.description}\n\nBranches: ${t.ruleset.target_branches.join(', ')}\nRules: ${rules}`;
        }).join('\n\n---\n\n');

        return { content: [{ type: 'text', text: `# Available Templates\n\n${templateList}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { content: [{ type: 'text', text: `❌ Error: ${message}` }], isError: true };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub Ruleset MCP Server running');
}

main().catch(console.error);
