import type { Policy, PolicyRule, Case } from '@/types';

export type PolicyEvaluationResult = {
  passed: boolean;
  checkedPolicies: { name: string; passed: boolean; rule: string; description: string }[];
  reason: string;
};

export function evaluatePolicy(
  action: { action_type: string; parameters: Record<string, unknown>; risk_level: string },
  caseData: Case,
  policies: Policy[]
): PolicyEvaluationResult {
  const results: { name: string; passed: boolean; rule: string; description: string }[] = [];
  let allPassed = true;

  for (const policy of policies.filter(p => p.is_active)) {
    for (const rule of policy.rules) {
      const result = checkRule(rule, action, caseData);
      results.push({
        name: policy.name,
        passed: result.passed,
        rule: rule.rule,
        description: rule.description ?? '',
      });
      if (!result.passed) allPassed = false;
    }
  }

  return {
    passed: allPassed,
    checkedPolicies: results,
    reason: allPassed ? 'All policy checks passed' : 'One or more policy checks failed',
  };
}

function checkRule(
  rule: PolicyRule,
  action: { action_type: string; parameters: Record<string, unknown>; risk_level: string },
  caseData: Case
): { passed: boolean } {
  const value = rule.value;

  switch (rule.rule) {
    case 'max_refund_amount': {
      const amount = action.parameters['amount'] as number ?? 0;
      const isVip = caseData.risk_level === 'low';
      const limit = isVip ? (value as number) * 2 : (value as number);
      return { passed: amount <= limit };
    }
    case 'refund_window_days': {
      return { passed: true };
    }
    case 'requires_delivery_proof': {
      return { passed: true };
    }
    case 'max_replacement_value': {
      const amount = action.parameters['amount'] as number ?? 0;
      return { passed: amount <= (value as number) };
    }
    case 'min_confidence_threshold': {
      return { passed: caseData.confidence_score >= (value as number) };
    }
    case 'max_refund_without_approval': {
      const amount = action.parameters['amount'] as number ?? 0;
      return { passed: amount <= (value as number) };
    }
    case 'auto_escalate_keywords': {
      const keywords = value as string[];
      const text = (caseData.subject + ' ' + (caseData.description ?? '')).toLowerCase();
      const hasKeyword = keywords.some(k => text.includes(k.toLowerCase()));
      return { passed: !hasKeyword };
    }
    case 'exception_timeout_hours': {
      return { passed: true };
    }
    case 'max_reship_attempts': {
      return { passed: true };
    }
    case 'vip_priority_boost': {
      return { passed: true };
    }
    case 'vip_refund_limit_multiplier': {
      return { passed: true };
    }
    case 'vip_auto_approve_threshold': {
      return { passed: true };
    }
    default:
      return { passed: true };
  }
}
