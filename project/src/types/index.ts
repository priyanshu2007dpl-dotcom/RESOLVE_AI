export type UserRole = 'CUSTOMER' | 'SUPPORT_AGENT' | 'SUPPORT_MANAGER' | 'ADMIN';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  tier: 'standard' | 'premium' | 'vip';
  lifetime_value: number;
  total_orders: number;
  total_tickets: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  total_amount: number;
  currency: string;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Payment = {
  id: string;
  order_id: string;
  customer_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'authorized' | 'settled' | 'failed' | 'refunded' | 'partially_refunded';
  provider: string;
  processed_at: string;
  created_at: string;
  updated_at: string;
};

export type Refund = {
  id: string;
  payment_id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Delivery = {
  id: string;
  order_id: string;
  customer_id: string;
  tracking_number: string;
  carrier: 'ups' | 'fedex' | 'usps' | 'dhl';
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned';
  shipped_at: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryEvent = {
  id: string;
  delivery_id: string;
  status: string;
  location: string | null;
  description: string | null;
  event_time: string;
  created_at: string;
};

export type Ticket = {
  id: string;
  customer_id: string;
  order_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  case_id: string | null;
  channel: 'web' | 'email' | 'phone' | 'chat';
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  role: 'customer' | 'agent' | 'ai' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CaseStatus = 'open' | 'investigating' | 'pending_action' | 'resolved' | 'escalated' | 'closed';
export type InvestigationStatus =
  | 'pending' | 'understanding' | 'investigating' | 'building_case_twin'
  | 'analyzing_root_cause' | 'verifying_evidence' | 'checking_policy'
  | 'checking_guardrails' | 'ready_to_resolve' | 'resolving' | 'resolved'
  | 'escalation_required' | 'learning' | 'pattern_detected' | 'failed';

export type Case = {
  id: string;
  case_number: string;
  customer_id: string;
  conversation_id: string | null;
  order_id: string | null;
  subject: string;
  description: string | null;
  status: CaseStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  intent: string | null;
  intent_confidence: number;
  root_cause: string | null;
  root_cause_confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  assigned_to: string | null;
  investigation_status: InvestigationStatus;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseEvent = {
  id: string;
  case_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type InvestigationStep = {
  id: string;
  case_id: string;
  step_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  agent_name: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  evidence_refs: string[];
  duration_ms: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Evidence = {
  id: string;
  case_id: string;
  source: 'customer' | 'order' | 'payment' | 'delivery' | 'ticket' | 'conversation' | 'policy' | 'knowledge' | 'system' | 'external_api';
  source_id: string | null;
  evidence_type: string;
  content: string;
  confidence: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RootCause = {
  id: string;
  case_id: string;
  node_type: 'symptom' | 'intermediate' | 'root';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  evidence_refs: string[];
  parent_id: string | null;
  created_at: string;
};

export type Policy = {
  id: string;
  name: string;
  description: string;
  category: string;
  rules: PolicyRule[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type PolicyRule = {
  rule: string;
  value: unknown;
  description: string;
};

export type ActionType = 'REFUND' | 'REPLACEMENT' | 'CREATE_TICKET' | 'UPDATE_CASE' | 'NOTIFY_CUSTOMER' | 'ASSIGN_AGENT' | 'ESCALATE';
export type ActionStatus = 'PROPOSED' | 'VALIDATING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'REQUIRES_HUMAN';

export type Action = {
  id: string;
  case_id: string;
  action_type: ActionType;
  status: ActionStatus;
  description: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown> | null;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  policy_checked: boolean;
  policy_passed: boolean;
  guardrail_checked: boolean;
  guardrail_passed: boolean;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Escalation = {
  id: string;
  case_id: string;
  customer_id: string;
  reason: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  recommended_action: string | null;
  status: 'open' | 'assigned' | 'resolved' | 'closed';
  assigned_to: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ComplaintPattern = {
  id: string;
  pattern_type: string;
  description: string;
  volume: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  affected_customers: string[];
  recommended_action: string | null;
  metadata: Record<string, unknown>;
  detected_at: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: 'CASE_UPDATED' | 'INVESTIGATION_COMPLETE' | 'ACTION_COMPLETED' | 'ESCALATION_CREATED' | 'PATTERN_DETECTED' | 'NEW_MESSAGE' | 'SYSTEM';
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  result: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
