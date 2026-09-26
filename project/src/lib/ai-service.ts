import type { Case, Evidence, Policy, Customer, Order, Payment, Delivery, Ticket } from '@/types';

export type IntentClassification = {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
};

export type RootCauseAnalysis = {
  rootCause: string;
  confidence: number;
  nodes: { description: string; type: 'symptom' | 'intermediate' | 'root'; confidence: number }[];
};

export type ActionRecommendation = {
  actionType: string;
  description: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, unknown>;
};

export type CustomerResponse = {
  message: string;
  tone: string;
};

export type EscalationSummary = {
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  confidence: number;
};

export type CaseSummary = {
  summary: string;
  keyPoints: string[];
  sentiment: string;
};

const INTENT_PATTERNS: Record<string, string[]> = {
  'delivery_delay': ['not arrived', "hasn't arrived", 'where is my order', 'late delivery', 'delivery delay', 'still waiting'],
  'duplicate_charge': ['charged twice', 'double charge', 'duplicate charge', 'charged two times', 'extra charge'],
  'wrong_item': ['wrong item', 'incorrect item', 'received wrong', 'not what i ordered'],
  'damaged_item': ['damaged', 'broken', 'defective', 'arrived damaged', 'cracked'],
  'refund_request': ['refund', 'money back', 'get my money back'],
  'missing_item': ['missing', 'not in package', 'item missing', 'empty box'],
  'payment_failed': ['payment failed', 'card declined', 'payment error', 'transaction failed'],
  'general_complaint': ['unhappy', 'terrible', 'awful', 'worst', 'frustrated', 'angry'],
};

export function classifyIntent(message: string): IntentClassification {
  const lower = message.toLowerCase();
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return {
          intent,
          confidence: 0.85 + Math.random() * 0.13,
          entities: { matchedPattern: pattern },
        };
      }
    }
  }
  return { intent: 'general_inquiry', confidence: 0.5 + Math.random() * 0.2, entities: {} };
}

export function extractEntities(message: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {};
  const orderMatch = message.match(/ORD-\d+/gi);
  if (orderMatch) entities['orderNumber'] = orderMatch[0];
  const trackingMatch = message.match(/TRK[A-Z0-9]+/i);
  if (trackingMatch) entities['trackingNumber'] = trackingMatch[0];
  const amountMatch = message.match(/\$[\d,.]+/);
  if (amountMatch) entities['amount'] = amountMatch[0];
  return entities;
}

export function summarizeCase(caseData: Case, messages: string[]): CaseSummary {
  const intentLabel = caseData.intent?.replace(/_/g, ' ') ?? 'general inquiry';
  const summary = `Customer issue: ${intentLabel}. Case ${caseData.case_number} with ${messages.length} messages. Status: ${caseData.status}.`;
  const keyPoints = [
    `Intent: ${intentLabel}`,
    `Priority: ${caseData.priority}`,
    `Risk: ${caseData.risk_level}`,
    `Investigation: ${caseData.investigation_status}`,
  ];
  const sentiment = messages.some(m => /angry|frustrated|terrible|awful/i.test(m)) ? 'negative' : 'neutral';
  return { summary, keyPoints, sentiment };
}

export function retrieveKnowledge(query: string, documents: { title: string; content: string }[]): { title: string; content: string; score: number }[] {
  const lower = query.toLowerCase();
  return documents
    .map(doc => {
      const words = lower.split(/\s+/);
      const docLower = (doc.title + ' ' + doc.content).toLowerCase();
      let score = 0;
      for (const word of words) {
        if (word.length > 3 && docLower.includes(word)) score += 1;
      }
      return { ...doc, score };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function analyzeEvidence(evidence: Evidence[]): { confidence: number; keyFindings: string[] } {
  if (evidence.length === 0) return { confidence: 0, keyFindings: [] };
  const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
  const keyFindings = evidence.slice(0, 5).map(e => `[${e.source}] ${e.content}`);
  return { confidence: avgConfidence, keyFindings };
}

export function identifyRootCause(
  intent: string,
  evidence: Evidence[],
  customer: Customer | null,
  orders: Order[],
  payments: Payment[],
  deliveries: Delivery[]
): RootCauseAnalysis {
  if (intent === 'delivery_delay') {
    const delayedDeliveries = deliveries.filter(d => d.status === 'exception' || (d.status === 'in_transit' && d.estimated_delivery && new Date(d.estimated_delivery) < new Date()));
    if (delayedDeliveries.length > 0) {
      return {
        rootCause: 'Carrier delivery exception',
        confidence: 0.88,
        nodes: [
          { description: 'Customer reports order not delivered', type: 'symptom', confidence: 0.95 },
          { description: 'Delivery status shows exception or delay', type: 'intermediate', confidence: 0.90 },
          { description: 'Carrier delivery exception', type: 'root', confidence: 0.85 },
        ],
      };
    }
    return {
      rootCause: 'Delivery transit delay',
      confidence: 0.75,
      nodes: [
        { description: 'Customer reports order not delivered', type: 'symptom', confidence: 0.95 },
        { description: 'Package still in transit past estimated date', type: 'intermediate', confidence: 0.80 },
        { description: 'Carrier transit delay', type: 'root', confidence: 0.75 },
      ],
    };
  }

  if (intent === 'duplicate_charge') {
    const orderPayments = payments.filter(p => p.order_id === orders[0]?.id);
    if (orderPayments.length > 1) {
      return {
        rootCause: 'Duplicate payment transaction',
        confidence: 0.92,
        nodes: [
          { description: 'Customer reports being charged twice', type: 'symptom', confidence: 0.95 },
          { description: 'Multiple payment records found for same order', type: 'intermediate', confidence: 0.90 },
          { description: 'Duplicate payment transaction', type: 'root', confidence: 0.92 },
        ],
      };
    }
    return {
      rootCause: 'Multiple orders placed',
      confidence: 0.70,
      nodes: [
        { description: 'Customer reports being charged twice', type: 'symptom', confidence: 0.95 },
        { description: 'Two separate orders with payments', type: 'intermediate', confidence: 0.75 },
        { description: 'Customer placed duplicate orders', type: 'root', confidence: 0.70 },
      ],
    };
  }

  if (intent === 'wrong_item') {
    return {
      rootCause: 'Warehouse fulfillment error',
      confidence: 0.80,
      nodes: [
        { description: 'Customer received wrong item', type: 'symptom', confidence: 0.95 },
        { description: 'Order fulfillment picked incorrect SKU', type: 'intermediate', confidence: 0.82 },
        { description: 'Warehouse fulfillment error', type: 'root', confidence: 0.80 },
      ],
    };
  }

  if (intent === 'damaged_item') {
    return {
      rootCause: 'Shipping damage',
      confidence: 0.78,
      nodes: [
        { description: 'Customer received damaged product', type: 'symptom', confidence: 0.95 },
        { description: 'Insufficient packaging protection', type: 'intermediate', confidence: 0.80 },
        { description: 'Shipping damage due to inadequate packaging', type: 'root', confidence: 0.78 },
      ],
    };
  }

  return {
    rootCause: 'General customer inquiry',
    confidence: 0.60,
    nodes: [
      { description: 'Customer contacted support', type: 'symptom', confidence: 0.90 },
      { description: 'Issue requires further investigation', type: 'intermediate', confidence: 0.65 },
      { description: 'General customer inquiry', type: 'root', confidence: 0.60 },
    ],
  };
}

export function evaluateResolution(
  caseData: Case,
  evidence: Evidence[],
  policies: Policy[],
  rootCause: RootCauseAnalysis
): { canAutoResolve: boolean; confidence: number; reason: string } {
  const evidenceConfidence = evidence.length > 0 ? evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length : 0;
  const overallConfidence = (evidenceConfidence + rootCause.confidence) / 2;

  const refundPolicy = policies.find(p => p.category === 'refund');
  const maxRefund = refundPolicy?.rules.find(r => r.rule === 'max_refund_amount')?.value as number ?? 1000;

  if (overallConfidence >= 0.75 && caseData.risk_level === 'low') {
    return { canAutoResolve: true, confidence: overallConfidence, reason: 'High confidence and low risk - auto-resolve eligible' };
  }

  if (overallConfidence < 0.7) {
    return { canAutoResolve: false, confidence: overallConfidence, reason: 'Confidence below threshold - requires human review' };
  }

  if (caseData.risk_level === 'high' || caseData.risk_level === 'critical') {
    return { canAutoResolve: false, confidence: overallConfidence, reason: 'High risk - requires human approval' };
  }

  return { canAutoResolve: false, confidence: overallConfidence, reason: 'Requires human review' };
}

export function generateCustomerResponse(intent: string, caseData: Case, resolution: string | null): CustomerResponse {
  const responses: Record<string, string> = {
    delivery_delay: `Thank you for reaching out about your delivery. I've investigated your order and found that there is a delivery exception. ${resolution ?? 'We are working to resolve this for you.'} I apologize for the inconvenience and will keep you updated.`,
    duplicate_charge: `I understand your concern about being charged twice. I've reviewed your payment history and found the duplicate charge. ${resolution ?? 'We will process a refund for the extra charge.'} You should see the refund within 3-5 business days.`,
    wrong_item: `I'm sorry you received the wrong item. ${resolution ?? 'We will send a replacement immediately.'} A return label will be emailed to you for the incorrect item.`,
    damaged_item: `I apologize that your item arrived damaged. ${resolution ?? 'We will send a replacement at no charge.'} Please dispose of the damaged item - no return is necessary.`,
    refund_request: `I've processed your refund request. ${resolution ?? 'Your refund will be processed within 3-5 business days.'} You will receive a confirmation email shortly.`,
    general_inquiry: `Thank you for contacting us. ${resolution ?? 'I have reviewed your case and am working on a resolution.'} Is there anything else I can help you with?`,
  };

  return {
    message: responses[intent] ?? responses['general_inquiry'],
    tone: 'empathetic',
  };
}

export function generateEscalationSummary(
  caseData: Case,
  reason: string,
  evidence: Evidence[]
): EscalationSummary {
  const riskLevel = caseData.risk_level === 'critical' ? 'critical' :
    caseData.confidence_score < 0.5 ? 'high' :
    caseData.risk_level === 'high' ? 'high' : 'medium';

  return {
    reason: reason || `Case ${caseData.case_number} requires human review due to ${caseData.confidence_score < 0.7 ? 'low confidence' : 'high risk'}`,
    riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
    recommendedAction: caseData.intent === 'duplicate_charge' ? 'Review duplicate payment and process refund' : 'Review case and determine resolution',
    confidence: caseData.confidence_score,
  };
}

export function detectComplaintPatterns(cases: Case[]): { patternType: string; description: string; volume: number; trend: string }[] {
  const intentCounts: Record<string, number> = {};
  for (const c of cases) {
    const intent = c.intent ?? 'unknown';
    intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
  }
  return Object.entries(intentCounts)
    .filter(([, count]) => count >= 2)
    .map(([intent, count]) => ({
      patternType: intent,
      description: `Multiple cases with intent: ${intent.replace(/_/g, ' ')}`,
      volume: count,
      trend: count > 3 ? 'increasing' : 'stable',
    }))
    .sort((a, b) => b.volume - a.volume);
}

export function recommendNextAction(
  caseData: Case,
  evidence: Evidence[],
  policies: Policy[],
  rootCause: RootCauseAnalysis
): ActionRecommendation {
  const intent = caseData.intent ?? 'general_inquiry';
  const refundPolicy = policies.find(p => p.category === 'refund');
  const maxRefund = refundPolicy?.rules.find(r => r.rule === 'max_refund_amount')?.value as number ?? 1000;

  if (intent === 'duplicate_charge') {
    return {
      actionType: 'REFUND',
      description: 'Process refund for duplicate payment charge',
      confidence: rootCause.confidence,
      riskLevel: 'low',
      parameters: { amount: maxRefund, reason: 'Duplicate charge refund' },
    };
  }

  if (intent === 'delivery_delay') {
    const hasException = evidence.some(e => e.source === 'delivery' && e.content.includes('exception'));
    if (hasException) {
      return {
        actionType: 'REPLACEMENT',
        description: 'Send replacement order via expedited shipping',
        confidence: rootCause.confidence,
        riskLevel: 'medium',
        parameters: { expedited: true, reason: 'Delivery exception - replacement order' },
      };
    }
    return {
      actionType: 'NOTIFY_CUSTOMER',
      description: 'Notify customer of delivery delay and provide updated estimate',
      confidence: 0.80,
      riskLevel: 'low',
      parameters: { channel: 'email' },
    };
  }

  if (intent === 'wrong_item' || intent === 'damaged_item') {
    return {
      actionType: 'REPLACEMENT',
      description: 'Send replacement item at no charge',
      confidence: rootCause.confidence,
      riskLevel: 'low',
      parameters: { reason: `${intent === 'wrong_item' ? 'Wrong' : 'Damaged'} item replacement` },
    };
  }

  if (intent === 'refund_request') {
    return {
      actionType: 'REFUND',
      description: 'Process customer refund request',
      confidence: 0.75,
      riskLevel: 'medium',
      parameters: { reason: 'Customer requested refund' },
    };
  }

  return {
    actionType: 'UPDATE_CASE',
    description: 'Update case with investigation findings',
    confidence: 0.65,
    riskLevel: 'low',
    parameters: {},
  };
}
