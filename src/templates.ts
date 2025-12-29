/**
 * Branch protection templates
 */

export interface Rule {
  type: string;
  parameters?: Record<string, unknown>;
}

export interface Ruleset {
  name: string;
  target_branches: string[];
  enforcement: 'active' | 'disabled';
  rules: Rule[];
  bypass_actors?: Array<{ actor_type: string; bypass_mode: string }>;
}

export interface Template {
  name: string;
  description: string;
  ruleset: Ruleset;
}

export const TEMPLATES: Record<string, Template> = {
  standard: {
    name: 'Standard',
    description: '1 approval, CI required, no force pushes',
    ruleset: {
      name: 'standard-protection',
      target_branches: ['main'],
      enforcement: 'active',
      rules: [
        { type: 'restrict_deletions' },
        { type: 'block_force_pushes' },
        { type: 'require_linear_history' },
        {
          type: 'require_pull_request',
          parameters: {
            required_approval_count: 1,
            dismiss_stale_reviews_on_push: true
          }
        },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [
              { context: 'ci/test' },
              { context: 'ci/lint' }
            ]
          }
        }
      ]
    }
  },

  strict: {
    name: 'Strict',
    description: '2 approvals, signed commits, code scanning',
    ruleset: {
      name: 'strict-protection',
      target_branches: ['main', 'production'],
      enforcement: 'active',
      rules: [
        { type: 'restrict_deletions' },
        { type: 'block_force_pushes' },
        { type: 'require_linear_history' },
        { type: 'require_signed_commits' },
        {
          type: 'require_pull_request',
          parameters: {
            required_approval_count: 2,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: true
          }
        },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [
              { context: 'ci/test' },
              { context: 'ci/lint' },
              { context: 'security/codeql' }
            ]
          }
        }
      ]
    }
  },

  relaxed: {
    name: 'Relaxed',
    description: 'PR required, no approval needed',
    ruleset: {
      name: 'relaxed-protection',
      target_branches: ['develop'],
      enforcement: 'active',
      rules: [
        { type: 'restrict_deletions' },
        {
          type: 'require_pull_request',
          parameters: { required_approval_count: 0 }
        }
      ]
    }
  },

  controlled: {
    name: 'Controlled',
    description: 'Team-gated, staging deploy required',
    ruleset: {
      name: 'controlled-protection',
      target_branches: ['release/*'],
      enforcement: 'active',
      rules: [
        { type: 'restrict_deletions' },
        { type: 'block_force_pushes' },
        { type: 'require_signed_commits' },
        {
          type: 'require_pull_request',
          parameters: {
            required_approval_count: 2,
            require_code_owner_review: true
          }
        },
        {
          type: 'required_deployments',
          parameters: {
            required_deployment_environments: ['staging']
          }
        }
      ]
    }
  }
};

export function getTemplate(name: string): Template | undefined {
  return TEMPLATES[name];
}

export function listTemplates(): string {
  return Object.entries(TEMPLATES)
    .map(([key, t]) => `• ${key}: ${t.description}`)
    .join('\n');
}
