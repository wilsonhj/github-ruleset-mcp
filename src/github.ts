/**
 * GitHub API client for ruleset operations
 *
 * Uses type assertions at API boundaries since our internal Ruleset type
 * is intentionally generic. Validation happens via MCP schema + runtime checks.
 */

import { Octokit } from '@octokit/rest';
import type { Ruleset } from './templates.js';

// Internal types for Octokit responses (loosely typed to avoid strict union issues)
type OctokitRulesetResponse = {
  id: number;
  name: string;
  enforcement: string;
  conditions?: {
    ref_name?: { include?: string[]; exclude?: string[] };
  } | null;
};

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    if (!token) {
      throw new Error('GITHUB_TOKEN required');
    }
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Apply a ruleset to a repository
   */
  async applyRuleset(
    owner: string,
    repo: string,
    ruleset: Ruleset,
    dryRun = true
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    const validation = this.validateRuleset(ruleset);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (dryRun) {
      return { success: true };
    }

    try {
      // Build the request payload with explicit typing at the boundary
      const payload = {
        owner,
        repo,
        name: ruleset.name,
        target: 'branch' as const,
        enforcement: ruleset.enforcement as 'active' | 'disabled' | 'evaluate',
        conditions: {
          ref_name: { include: ruleset.target_branches, exclude: [] as string[] }
        },
        rules: ruleset.rules.map(r => ({
          type: r.type,
          ...(r.parameters && { parameters: r.parameters })
        })),
        bypass_actors: ruleset.bypass_actors?.map(a => ({
          actor_type: a.actor_type,
          bypass_mode: a.bypass_mode
        })) || []
      };

      // Use type assertion at the API call boundary
      const response = await this.octokit.request(
        'POST /repos/{owner}/{repo}/rulesets',
        payload as unknown as Parameters<typeof this.octokit.request<'POST /repos/{owner}/{repo}/rulesets'>>[1]
      );

      return { success: true, id: (response.data as OctokitRulesetResponse).id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Check if branch is protected
   */
  async checkProtection(
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<{ protected: boolean; rules: string[]; error?: string }> {
    try {
      const response = await this.octokit.request(
        'GET /repos/{owner}/{repo}/rules/branches/{branch}',
        { owner, repo, branch }
      );

      const rules = (response.data || []).map((r: { type: string }) => r.type);
      return { protected: rules.length > 0, rules };
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 404) {
        return { protected: false, rules: [] };
      }
      return { protected: false, rules: [], error: error.message || 'Unknown error' };
    }
  }

  /**
   * List all rulesets in a repository
   */
  async listRulesets(
    owner: string,
    repo: string
  ): Promise<Array<{ id: number; name: string; enforcement: string; branches: string[] }>> {
    try {
      const response = await this.octokit.request(
        'GET /repos/{owner}/{repo}/rulesets',
        { owner, repo }
      );

      // Cast response.data to our loose internal type
      const rulesets = response.data as OctokitRulesetResponse[];

      return rulesets.map(rs => ({
        id: rs.id,
        name: rs.name,
        enforcement: rs.enforcement,
        branches: rs.conditions?.ref_name?.include || []
      }));
    } catch {
      return [];
    }
  }

  /**
   * Delete a ruleset
   */
  async deleteRuleset(
    owner: string,
    repo: string,
    rulesetId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.octokit.request(
        'DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}',
        { owner, repo, ruleset_id: rulesetId }
      );
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  private validateRuleset(ruleset: Ruleset): { valid: boolean; error?: string } {
    if (!ruleset.name) {
      return { valid: false, error: 'Missing ruleset name' };
    }
    if (!ruleset.target_branches?.length) {
      return { valid: false, error: 'Missing target branches' };
    }
    if (!ruleset.rules?.length) {
      return { valid: false, error: 'Missing rules' };
    }
    return { valid: true };
  }
}
