import type { Case, Evidence } from '@/types';

export type GuardrailResult = {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  reason: string;
};

export function checkGuardrails(
  action: { action_type: string; confidence: number; risk_level: string; parameters: Record<string, unknown> },
  caseData: Case,
  evidence: Evidence[]
): GuardrailResult {
  const checks: { name: string; passed: boolean; detail: string }[] = [];

  // Check 1: Evidence sufficiency
  const hasEvidence = evidence.length >= 2;
  checks.push({
    name: 'Evidence Sufficiency',
    passed: hasEvidence,
    detail: hasEvidence ? `${evidence.length} evidence items collected` : 'Insufficient evidence (need at least 2)',
  });

  // Check 2: Confidence threshold
  const confidenceOk = action.confidence >= 0.7;
  checks.push({
    name: 'Confidence Threshold',
    passed: confidenceOk,
    detail: confidenceOk ? `Confidence ${(action.confidence * 100).toFixed(0)}% >= 70%` : `Confidence ${(action.confidence * 100).toFixed(0)}% < 70%`,
  });

  // Check 3: Risk assessment
  const riskOk = action.risk_level === 'low' || (action.risk_level === 'medium' && caseData.risk_level !== 'critical');
  checks.push({
    name: 'Risk Assessment',
    passed: riskOk,
    detail: `Action risk: ${action.risk_level}, Case risk: ${caseData.risk_level}`,
  });

  // Check 4: Policy compliance (simplified - real check in policy engine)
  checks.push({
    name: 'Policy Compliance',
    passed: true,
    detail: 'Policy engine validated separately',
  });

  // Check 5: Permission scope
  const requiresApproval = action.action_type === 'REFUND' && (action.parameters['amount'] as number ?? 0) > 500;
  checks.push({
    name: 'Permission Scope',
    passed: !requiresApproval,
    detail: requiresApproval ? 'Refund over $500 requires human approval' : 'Within auto-approval limits',
  });

  // Check 6: Action type validation
  const validActionTypes = ['REFUND', 'REPLACEMENT', 'CREATE_TICKET', 'UPDATE_CASE', 'NOTIFY_CUSTOMER', 'ASSIGN_AGENT', 'ESCALATE'];
  const actionTypeValid = validActionTypes.includes(action.action_type);
  checks.push({
    name: 'Action Type Valid',
    passed: actionTypeValid,
    detail: actionTypeValid ? `Valid action: ${action.action_type}` : `Invalid action type: ${action.action_type}`,
  });

  const allPassed = checks.every(c => c.passed);
  const failedChecks = checks.filter(c => !c.passed);

  return {
    passed: allPassed,
    checks,
    reason: allPassed ? 'All guardrail checks passed' : `Failed: ${failedChecks.map(c => c.name).join(', ')}`,
  };
}
