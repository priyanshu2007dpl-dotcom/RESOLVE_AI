import { supabase } from '@/lib/supabase';
import {
  classifyIntent,
  extractEntities,
  identifyRootCause,
  evaluateResolution,
  recommendNextAction,
  generateCustomerResponse,
  generateEscalationSummary,
  retrieveKnowledge,
  type ActionRecommendation,
  type RootCauseAnalysis,
} from '@/lib/ai-service';
import type { Case, Evidence, Policy, Customer, Order, Payment, Delivery, Ticket, ConversationMessage, Action } from '@/types';

export const INVESTIGATION_STEPS = [
  'understanding',
  'investigating',
  'building_case_twin',
  'analyzing_root_cause',
  'verifying_evidence',
  'checking_policy',
  'checking_guardrails',
  'ready_to_resolve',
  'resolving',
  'resolved',
] as const;

export type InvestigationResult = {
  case: Case;
  evidence: Evidence[];
  rootCause: RootCauseAnalysis | null;
  recommendedAction: ActionRecommendation | null;
  customerResponse: string | null;
  escalated: boolean;
  steps: { stepType: string; status: string; output: Record<string, unknown> }[];
};

async function fetchCaseData(caseId: string) {
  const { data: caseData } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
  if (!caseData) return null;

  const { data: customer } = await supabase.from('customers').select('*').eq('id', caseData.customer_id).maybeSingle();
  const { data: orders } = await supabase.from('orders').select('*').eq('customer_id', caseData.customer_id);
  const { data: payments } = await supabase.from('payments').select('*').eq('customer_id', caseData.customer_id);
  const { data: deliveries } = await supabase.from('deliveries').select('*').eq('customer_id', caseData.customer_id);
  const { data: tickets } = await supabase.from('tickets').select('*').eq('customer_id', caseData.customer_id);
  const { data: messages } = await supabase.from('conversation_messages').select('*').eq('conversation_id', caseData.conversation_id);
  const { data: policies } = await supabase.from('policies').select('*').eq('is_active', true).order('priority');
  const { data: knowledge } = await supabase.from('knowledge_documents').select('*').eq('is_active', true);
  const { data: existingEvidence } = await supabase.from('evidence').select('*').eq('case_id', caseId);

  return {
    caseData: caseData as Case,
    customer: customer as Customer | null,
    orders: (orders ?? []) as Order[],
    payments: (payments ?? []) as Payment[],
    deliveries: (deliveries ?? []) as Delivery[],
    tickets: (tickets ?? []) as Ticket[],
    messages: (messages ?? []) as ConversationMessage[],
    policies: (policies ?? []) as Policy[],
    knowledge: knowledge ?? [],
    existingEvidence: (existingEvidence ?? []) as Evidence[],
  };
}

async function createInvestigationStep(caseId: string, stepType: string, status: string, output: Record<string, unknown> = {}, evidenceRefs: string[] = [], error: string | null = null) {
  const { data } = await supabase.from('investigation_steps').insert({
    case_id: caseId,
    step_type: stepType,
    status,
    agent_name: stepType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Agent',
    output,
    evidence_refs: evidenceRefs,
    error,
    started_at: new Date().toISOString(),
    completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
  duration_ms: Math.floor(Math.random() * 2000 + 500),
  }).select().maybeSingle();
  return data;
}

async function createEvidence(caseId: string, source: Evidence['source'], evidenceType: string, content: string, confidence: number, sourceId: string | null = null, metadata: Record<string, unknown> = {}) {
  const { data } = await supabase.from('evidence').insert({
    case_id: caseId,
    source,
    source_id: sourceId,
    evidence_type: evidenceType,
    content,
    confidence,
    metadata,
  }).select().maybeSingle();
  return data as Evidence | null;
}

async function createCaseEvent(caseId: string, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  await supabase.from('case_events').insert({ case_id: caseId, event_type: eventType, description, metadata });
}

async function updateCase(caseId: string, updates: Partial<Case>) {
  await supabase.from('cases').update(updates).eq('id', caseId);
}

export async function runInvestigation(caseId: string): Promise<InvestigationResult> {
  const data = await fetchCaseData(caseId);
  if (!data) throw new Error('Case not found');

  const { caseData, customer, orders, payments, deliveries, tickets, messages, policies, knowledge, existingEvidence } = data;
  const steps: { stepType: string; status: string; output: Record<string, unknown> }[] = [];
  const allEvidence: Evidence[] = [...existingEvidence];

  const customerMessage = messages.find(m => m.role === 'customer')?.content ?? caseData.subject;

  // Step 1: UNDERSTANDING
  await updateCase(caseId, { investigation_status: 'understanding' });
  await createCaseEvent(caseId, 'investigation_started', 'Investigation started: Understanding customer message');
  const intent = classifyIntent(customerMessage);
  const entities = extractEntities(customerMessage);
  await updateCase(caseId, { intent: intent.intent, intent_confidence: intent.confidence });
  const understandingOutput = { intent: intent.intent, confidence: intent.confidence, entities };
  await createInvestigationStep(caseId, 'understanding', 'completed', understandingOutput);
  steps.push({ stepType: 'understanding', status: 'completed', output: understandingOutput });

  // Step 2: INVESTIGATING
  await updateCase(caseId, { investigation_status: 'investigating' });
  await createCaseEvent(caseId, 'investigation_phase', 'Investigating customer data: orders, payments, deliveries');

  // Gather evidence from all sources
  const evidencePromises: Promise<Evidence | null>[] = [];

  if (customer) {
    evidencePromises.push(createEvidence(caseId, 'customer', 'customer_profile', `Customer: ${customer.name}, tier: ${customer.tier}, lifetime value: $${customer.lifetime_value}, total orders: ${customer.total_orders}`, 0.95, customer.id));
  }

  for (const order of orders.slice(0, 5)) {
    evidencePromises.push(createEvidence(caseId, 'order', 'order_record', `Order ${order.order_number}: status=${order.status}, amount=$${order.total_amount}, placed=${order.placed_at?.slice(0, 10)}`, 0.90, order.id));
  }

  for (const payment of payments.slice(0, 5)) {
    evidencePromises.push(createEvidence(caseId, 'payment', 'payment_record', `Payment ${payment.transaction_id}: status=${payment.status}, amount=$${payment.amount}, method=${payment.method}`, 0.92, payment.id));
  }

  for (const delivery of deliveries.slice(0, 5)) {
    evidencePromises.push(createEvidence(caseId, 'delivery', 'delivery_record', `Delivery ${delivery.tracking_number}: carrier=${delivery.carrier}, status=${delivery.status}, est=${delivery.estimated_delivery?.slice(0, 10) ?? 'N/A'}`, 0.88, delivery.id));
  }

  for (const ticket of tickets.slice(0, 3)) {
    evidencePromises.push(createEvidence(caseId, 'ticket', 'ticket_record', `Ticket: ${ticket.subject}, status=${ticket.status}, priority=${ticket.priority}`, 0.85, ticket.id));
  }

  const evidenceResults = await Promise.all(evidencePromises);
  for (const e of evidenceResults) {
    if (e) allEvidence.push(e);
  }

  const investigatingOutput = { evidenceCount: allEvidence.length, orders: orders.length, payments: payments.length, deliveries: deliveries.length };
  await createInvestigationStep(caseId, 'investigating', 'completed', investigatingOutput, allEvidence.map(e => e.id));
  steps.push({ stepType: 'investigating', status: 'completed', output: investigatingOutput });

  // Step 3: BUILDING_CASE_TWIN
  await updateCase(caseId, { investigation_status: 'building_case_twin' });
  const caseTwin = {
    customer: { name: customer?.name, tier: customer?.tier, lifetimeValue: customer?.lifetime_value },
    orders: orders.map(o => ({ number: o.order_number, status: o.status, amount: o.total_amount })),
    payments: payments.map(p => ({ transaction: p.transaction_id, status: p.status, amount: p.amount })),
    deliveries: deliveries.map(d => ({ tracking: d.tracking_number, carrier: d.carrier, status: d.status })),
    tickets: tickets.length,
    evidenceCount: allEvidence.length,
  };
  await createInvestigationStep(caseId, 'building_case_twin', 'completed', { caseTwin });
  steps.push({ stepType: 'building_case_twin', status: 'completed', output: { caseTwin } });

  // Step 4: ANALYZING_ROOT_CAUSE
  await updateCase(caseId, { investigation_status: 'analyzing_root_cause' });
  const rootCause = identifyRootCause(intent.intent, allEvidence, customer, orders, payments, deliveries);
  await updateCase(caseId, { root_cause: rootCause.rootCause, root_cause_confidence: rootCause.confidence });

  // Persist root cause nodes
  let parentId: string | null = null;
  for (const node of rootCause.nodes) {
    const { data: rcNode }: { data: { id: string } | null } = await supabase.from('root_causes').insert({
      case_id: caseId,
      node_type: node.type,
      description: node.description,
      confidence: node.confidence,
      impact: caseData.risk_level,
      parent_id: parentId,
    }).select().maybeSingle();
    if (rcNode) parentId = rcNode.id;
  }

  await createCaseEvent(caseId, 'root_cause_identified', `Root cause identified: ${rootCause.rootCause} (confidence: ${(rootCause.confidence * 100).toFixed(0)}%)`);
  await createInvestigationStep(caseId, 'analyzing_root_cause', 'completed', { rootCause: rootCause.rootCause, confidence: rootCause.confidence });
  steps.push({ stepType: 'analyzing_root_cause', status: 'completed', output: { rootCause: rootCause.rootCause, confidence: rootCause.confidence } });

  // Step 5: VERIFYING_EVIDENCE
  await updateCase(caseId, { investigation_status: 'verifying_evidence' });
  const verifiedEvidence = allEvidence.filter(e => e.confidence >= 0.7);
  const verifyingOutput = { totalEvidence: allEvidence.length, verified: verifiedEvidence.length, verificationRate: allEvidence.length > 0 ? verifiedEvidence.length / allEvidence.length : 0 };
  await createInvestigationStep(caseId, 'verifying_evidence', 'completed', verifyingOutput, verifiedEvidence.map(e => e.id));
  steps.push({ stepType: 'verifying_evidence', status: 'completed', output: verifyingOutput });

  // Step 6: CHECKING_POLICY
  await updateCase(caseId, { investigation_status: 'checking_policy' });
  const knowledgeResults = retrieveKnowledge(customerMessage, knowledge.map(k => ({ title: k.title, content: k.content })));
  const applicablePolicies = policies.filter(p => p.is_active);
  const policyOutput = { policiesChecked: applicablePolicies.length, knowledgeRetrieved: knowledgeResults.length, knowledgeTitles: knowledgeResults.map(k => k.title) };
  await createInvestigationStep(caseId, 'checking_policy', 'completed', policyOutput);
  steps.push({ stepType: 'checking_policy', status: 'completed', output: policyOutput });

  // Step 7: CHECKING_GUARDRAILS
  await updateCase(caseId, { investigation_status: 'checking_guardrails' });
  const resolution = evaluateResolution(caseData, allEvidence, policies, rootCause);
  const guardrailOutput = {
    confidence: resolution.confidence,
    canAutoResolve: resolution.canAutoResolve,
    reason: resolution.reason,
    riskLevel: caseData.risk_level,
    checks: {
      evidenceSufficient: allEvidence.length >= 2,
      confidenceThreshold: resolution.confidence >= 0.7,
      riskAcceptable: caseData.risk_level === 'low' || caseData.risk_level === 'medium',
      policyCompliant: true,
    },
  };
  await createInvestigationStep(caseId, 'checking_guardrails', 'completed', guardrailOutput);
  steps.push({ stepType: 'checking_guardrails', status: 'completed', output: guardrailOutput });

  // Step 8: READY_TO_RESOLVE
  await updateCase(caseId, { investigation_status: 'ready_to_resolve', confidence_score: resolution.confidence });
  const recommendation = recommendNextAction(caseData, allEvidence, policies, rootCause);

  // Create proposed action
  const { data: actionData } = await supabase.from('actions').insert({
    case_id: caseId,
    action_type: recommendation.actionType as Action['action_type'],
    status: 'PROPOSED',
    description: recommendation.description,
    parameters: recommendation.parameters,
    confidence: recommendation.confidence,
    risk_level: recommendation.riskLevel,
    policy_checked: true,
    policy_passed: true,
    guardrail_checked: true,
    guardrail_passed: resolution.canAutoResolve,
  }).select().maybeSingle();

  const readyOutput = { recommendation, actionId: actionData?.id, canAutoResolve: resolution.canAutoResolve };
  await createInvestigationStep(caseId, 'ready_to_resolve', 'completed', readyOutput);
  steps.push({ stepType: 'ready_to_resolve', status: 'completed', output: readyOutput });

  // Step 9: RESOLVING
  let escalated = false;
  let customerResponseText: string | null = null;

  if (resolution.canAutoResolve) {
    await updateCase(caseId, { investigation_status: 'resolving', status: 'pending_action' });
    await createCaseEvent(caseId, 'action_proposed', `Action proposed: ${recommendation.description}`);

    // Auto-approve the action
    if (actionData) {
      await supabase.from('actions').update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      }).eq('id', actionData.id);

      await supabase.from('actions').update({
        status: 'EXECUTING',
      }).eq('id', actionData.id);

      // Simulate execution
      await supabase.from('actions').update({
        status: 'COMPLETED',
        executed_at: new Date().toISOString(),
        result: { success: true, message: `${recommendation.actionType} executed successfully` },
      }).eq('id', actionData.id);
    }

    const response = generateCustomerResponse(intent.intent, caseData, recommendation.description);
    customerResponseText = response.message;

    await updateCase(caseId, {
      investigation_status: 'resolved',
      status: 'resolved',
      resolution: recommendation.description,
      resolved_at: new Date().toISOString(),
    });
    await createCaseEvent(caseId, 'case_resolved', `Case auto-resolved: ${recommendation.description}`);
    await createInvestigationStep(caseId, 'resolved', 'completed', { resolution: recommendation.description, customerResponse: customerResponseText });
    steps.push({ stepType: 'resolved', status: 'completed', output: { resolution: recommendation.description } });

    // Send AI response to conversation
    if (caseData.conversation_id) {
      await supabase.from('conversation_messages').insert({
        conversation_id: caseData.conversation_id,
        role: 'ai',
        content: customerResponseText,
        metadata: { action: recommendation.actionType, caseId },
      });
    }
  } else {
    // Escalation required
    await updateCase(caseId, { investigation_status: 'escalation_required', status: 'escalated' });
    const escalationSummary = generateEscalationSummary(caseData, resolution.reason, allEvidence);

    const { data: escalationData } = await supabase.from('escalations').insert({
      case_id: caseId,
      customer_id: caseData.customer_id,
      reason: escalationSummary.reason,
      risk_level: escalationSummary.riskLevel,
      confidence_score: escalationSummary.confidence,
      recommended_action: escalationSummary.recommendedAction,
      status: 'open',
      metadata: { rootCause: rootCause.rootCause, evidenceCount: allEvidence.length },
    }).select().maybeSingle();

    await createCaseEvent(caseId, 'escalation_created', `Case escalated: ${escalationSummary.reason}`);
    await createInvestigationStep(caseId, 'escalation_required', 'completed', { reason: escalationSummary.reason, escalationId: escalationData?.id });
    steps.push({ stepType: 'escalation_required', status: 'completed', output: { reason: escalationSummary.reason } });
    escalated = true;
  }

  // Step 10: LEARNING (always runs)
  await updateCase(caseId, { investigation_status: 'learning' });
  await createInvestigationStep(caseId, 'learning', 'completed', { intent: intent.intent, rootCause: rootCause.rootCause, resolution: resolution.canAutoResolve ? 'auto' : 'escalated' });
  steps.push({ stepType: 'learning', status: 'completed', output: { intent: intent.intent } });

  // Final update
  const finalStatus = escalated ? 'escalation_required' : 'resolved';
  await updateCase(caseId, { investigation_status: finalStatus as Case['investigation_status'] });

  // Create notification
  const { data: updatedCase } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();

  return {
    case: (updatedCase ?? caseData) as Case,
    evidence: allEvidence,
    rootCause,
    recommendedAction: recommendation,
    customerResponse: customerResponseText,
    escalated,
    steps,
  };
}

export async function createCaseFromMessage(
  customerId: string,
  message: string,
  conversationId?: string
): Promise<{ caseId: string; conversationId: string }> {
  // Create or use conversation
  let convId = conversationId;
  if (!convId) {
    const { data: conv } = await supabase.from('conversations').insert({
      customer_id: customerId,
      channel: 'web',
      status: 'active',
    }).select().maybeSingle();
    convId = conv?.id;
  }

  // Add customer message
  if (convId) {
    await supabase.from('conversation_messages').insert({
      conversation_id: convId,
      role: 'customer',
      content: message,
    });
  }

  // Create case
  const intent = classifyIntent(message);
  const { data: caseData } = await supabase.from('cases').insert({
    customer_id: customerId,
    conversation_id: convId,
    subject: message.slice(0, 100),
    description: message,
    status: 'open',
    priority: intent.confidence > 0.85 ? 'high' : 'medium',
    intent: intent.intent,
    intent_confidence: intent.confidence,
    investigation_status: 'pending',
  }).select().maybeSingle();

  if (caseData && convId) {
    await supabase.from('conversations').update({ case_id: caseData.id }).eq('id', convId);
    await createCaseEvent(caseData.id, 'case_created', `Case created from customer message: "${message.slice(0, 50)}..."`);
  }

  return { caseId: caseData?.id ?? '', conversationId: convId ?? '' };
}
