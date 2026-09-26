import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { runInvestigation } from '@/lib/investigation-engine';
import { checkGuardrails } from '@/lib/guardrail-engine';
import { evaluatePolicy } from '@/lib/policy-engine';
import {
  ArrowLeft, Brain, Play, CheckCircle2, XCircle, Clock,
  FileSearch, GitBranch, Shield, Zap, AlertTriangle,
  MessageSquare, Activity, ChevronRight, User,
  Package, CreditCard, Truck, Ticket as TicketIcon,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type Tab = 'twin' | 'conversation' | 'evidence' | 'root_cause' | 'actions' | 'timeline';

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('twin');

  const { data: caseData } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('*, customers(*), orders(*)').eq('id', id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ['case-messages', id],
    queryFn: async () => {
      if (!caseData?.conversation_id) return [];
      const { data } = await supabase.from('conversation_messages').select('*').eq('conversation_id', caseData.conversation_id).order('created_at');
      return data ?? [];
    },
    enabled: !!caseData?.conversation_id,
  });

  const { data: evidence } = useQuery({
    queryKey: ['case-evidence', id],
    queryFn: async () => {
      const { data } = await supabase.from('evidence').select('*').eq('case_id', id).order('created_at');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: rootCauses } = useQuery({
    queryKey: ['case-root-causes', id],
    queryFn: async () => {
      const { data } = await supabase.from('root_causes').select('*').eq('case_id', id).order('created_at');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: actions } = useQuery({
    queryKey: ['case-actions', id],
    queryFn: async () => {
      const { data } = await supabase.from('actions').select('*').eq('case_id', id).order('created_at');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: investigationSteps } = useQuery({
    queryKey: ['case-investigation-steps', id],
    queryFn: async () => {
      const { data } = await supabase.from('investigation_steps').select('*').eq('case_id', id).order('created_at');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: caseEvents } = useQuery({
    queryKey: ['case-events', id],
    queryFn: async () => {
      const { data } = await supabase.from('case_events').select('*').eq('case_id', id).order('created_at');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: customerData } = useQuery({
    queryKey: ['case-customer-data', caseData?.customer_id],
    queryFn: async () => {
      if (!caseData?.customer_id) return null;
      const [orders, payments, deliveries, tickets] = await Promise.all([
        supabase.from('orders').select('*').eq('customer_id', caseData.customer_id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('customer_id', caseData.customer_id).order('created_at', { ascending: false }),
        supabase.from('deliveries').select('*').eq('customer_id', caseData.customer_id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').eq('customer_id', caseData.customer_id).order('created_at', { ascending: false }),
      ]);
      return {
        orders: orders.data ?? [],
        payments: payments.data ?? [],
        deliveries: deliveries.data ?? [],
        tickets: tickets.data ?? [],
      };
    },
    enabled: !!caseData?.customer_id,
  });

  const { data: policies } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const { data } = await supabase.from('policies').select('*').eq('is_active', true).order('priority');
      return data ?? [];
    },
  });

  const runInvestigationMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await runInvestigation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['case-evidence', id] });
      queryClient.invalidateQueries({ queryKey: ['case-root-causes', id] });
      queryClient.invalidateQueries({ queryKey: ['case-actions', id] });
      queryClient.invalidateQueries({ queryKey: ['case-investigation-steps', id] });
      queryClient.invalidateQueries({ queryKey: ['case-events', id] });
      queryClient.invalidateQueries({ queryKey: ['case-messages', id] });
    },
  });

  const approveAction = useMutation({
    mutationFn: async (actionId: string) => {
      await supabase.from('actions').update({ status: 'APPROVED', approved_at: new Date().toISOString() }).eq('id', actionId);
      await supabase.from('actions').update({ status: 'EXECUTING' }).eq('id', actionId);
      await supabase.from('actions').update({ status: 'COMPLETED', executed_at: new Date().toISOString(), result: { success: true } }).eq('id', actionId);
      await supabase.from('cases').update({ status: 'resolved', investigation_status: 'resolved', resolved_at: new Date().toISOString(), resolution: 'Action approved and executed' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['case-actions', id] });
    },
  });

  const rejectAction = useMutation({
    mutationFn: async (actionId: string) => {
      await supabase.from('actions').update({ status: 'REJECTED' }).eq('id', actionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-actions', id] });
    },
  });

  if (!caseData) return <div className="text-center py-20 text-slate-500">Loading case...</div>;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'twin', label: 'Digital Twin', icon: Brain },
    { id: 'conversation', label: 'Conversation', icon: MessageSquare },
    { id: 'evidence', label: 'Evidence', icon: FileSearch },
    { id: 'root_cause', label: 'Root Cause', icon: GitBranch },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'timeline', label: 'Timeline', icon: Activity },
  ];

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <Link to="/cases" className="text-slate-500 hover:text-slate-300">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100">{caseData.case_number}</h1>
            <StatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{caseData.subject}</p>
        </div>
        {caseData.investigation_status === 'pending' && (
          <button
            onClick={() => runInvestigationMutation.mutate()}
            disabled={runInvestigationMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {runInvestigationMutation.isPending ? 'Investigating...' : 'Run Investigation'}
          </button>
        )}
      </div>

      {/* Investigation Progress Bar */}
      {investigationSteps && investigationSteps.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">Investigation Progress</span>
            <span className="text-xs text-slate-500 ml-auto">{investigationSteps.filter((s: any) => s.status === 'completed').length} / {investigationSteps.length} steps</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {investigationSteps.map((step: any, i: number) => (
              <div key={step.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <div className={`w-4 h-0.5 ${investigationSteps[i - 1].status === 'completed' ? 'bg-cyan-500' : 'bg-slate-700'}`} />}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    step.status === 'completed' ? 'bg-cyan-500/15 text-cyan-400' :
                    step.status === 'running' ? 'bg-blue-500/15 text-blue-400 pulse-glow' :
                    step.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                   step.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {step.step_type.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="fade-in">
        {activeTab === 'twin' && (
          <CaseDigitalTwin caseData={caseData} customerData={customerData} evidence={evidence ?? []} rootCauses={rootCauses ?? []} actions={actions ?? []} />
        )}
        {activeTab === 'conversation' && (
          <ConversationView messages={messages ?? []} caseData={caseData} />
        )}
        {activeTab === 'evidence' && (
          <EvidenceView evidence={evidence ?? []} />
        )}
        {activeTab === 'root_cause' && (
          <RootCauseView rootCauses={rootCauses ?? []} />
        )}
        {activeTab === 'actions' && (
          <ActionsView actions={actions ?? []} policies={policies ?? []} evidence={evidence ?? []} caseData={caseData}
            onApprove={(aid: string) => approveAction.mutate(aid)} onReject={(aid: string) => rejectAction.mutate(aid)}
            approving={approveAction.isPending}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineView events={caseEvents ?? []} steps={investigationSteps ?? []} />
        )}
      </div>
    </div>
  );
}

function CaseDigitalTwin({ caseData, customerData, evidence, rootCauses, actions }: any) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Customer</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div><span className="text-slate-500">Name:</span> <span className="text-slate-200">{caseData.customers?.name}</span></div>
          <div><span className="text-slate-500">Email:</span> <span className="text-slate-200">{caseData.customers?.email}</span></div>
          <div><span className="text-slate-500">Tier:</span> <span className="text-slate-200 capitalize">{caseData.customers?.tier}</span></div>
          <div><span className="text-slate-500">LTV:</span> <span className="text-slate-200">${caseData.customers?.lifetime_value}</span></div>
          <div><span className="text-slate-500">Orders:</span> <span className="text-slate-200">{caseData.customers?.total_orders}</span></div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Orders</h3>
        </div>
        <div className="space-y-2">
          {customerData?.orders?.slice(0, 4).map((o: any) => (
            <div key={o.id} className="text-sm flex items-center justify-between">
              <span className="text-slate-300">{o.order_number}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">${o.total_amount}</span>
                <StatusBadge status={o.status} />
              </div>
            </div>
          )) ?? <div className="text-sm text-slate-500">No orders</div>}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-green-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Payments</h3>
        </div>
        <div className="space-y-2">
          {customerData?.payments?.slice(0, 4).map((p: any) => (
            <div key={p.id} className="text-sm flex items-center justify-between">
              <span className="text-slate-300 font-mono text-xs">{p.transaction_id.slice(0, 14)}...</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">${p.amount}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          )) ?? <div className="text-sm text-slate-500">No payments</div>}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Deliveries</h3>
        </div>
        <div className="space-y-2">
          {customerData?.deliveries?.slice(0, 4).map((d: any) => (
            <div key={d.id} className="text-sm flex items-center justify-between">
              <span className="text-slate-300 font-mono text-xs">{d.tracking_number.slice(0, 14)}...</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 capitalize">{d.carrier}</span>
                <StatusBadge status={d.status} />
              </div>
            </div>
          )) ?? <div className="text-sm text-slate-500">No deliveries</div>}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <TicketIcon className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Support History</h3>
        </div>
        <div className="space-y-2">
          {customerData?.tickets?.slice(0, 4).map((t: any) => (
            <div key={t.id} className="text-sm">
              <div className="text-slate-300 truncate">{t.subject}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
            </div>
          )) ?? <div className="text-sm text-slate-500">No tickets</div>}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-200 text-sm">AI Analysis</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div><span className="text-slate-500">Intent:</span> <span className="text-slate-200 capitalize">{caseData.intent?.replace(/_/g, ' ') ?? 'N/A'}</span></div>
          <div><span className="text-slate-500">Confidence:</span> <span className="text-slate-200">{(caseData.confidence_score * 100).toFixed(0)}%</span></div>
          <div><span className="text-slate-500">Root Cause:</span> <span className="text-slate-200">{caseData.root_cause ?? 'N/A'}</span></div>
          <div><span className="text-slate-500">Risk Level:</span> <RiskBadge level={caseData.risk_level} /></div>
          <div><span className="text-slate-500">Evidence:</span> <span className="text-slate-200">{evidence.length} items</span></div>
        </div>
      </div>
    </div>
  );
}

function ConversationView({ messages, caseData }: any) {
  return (
    <div className="card p-5 max-w-3xl mx-auto">
      {messages.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No conversation messages yet.</p>
          <p className="text-xs mt-1">Run an investigation to generate AI responses.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                m.role === 'customer' ? 'bg-slate-800 text-slate-200' :
                m.role === 'ai' ? 'bg-blue-600/20 text-blue-100 border border-blue-600/30' :
                'bg-slate-700 text-slate-200'
              }`}>
                <div className="text-xs font-medium mb-1 opacity-60">
                  {m.role === 'customer' ? 'Customer' : m.role === 'ai' ? 'AI Agent' : m.role === 'agent' ? 'Support Agent' : 'System'}
                </div>
                <div className="text-sm">{m.content}</div>
                <div className="text-xs opacity-40 mt-1">{format(new Date(m.created_at), 'MMM d, h:mm a')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceView({ evidence }: any) {
  const sourceIcons: Record<string, any> = {
    customer: User, order: Package, payment: CreditCard, delivery: Truck,
    ticket: TicketIcon, conversation: MessageSquare, policy: Shield, knowledge: FileSearch, system: Activity,
  };
  const sourceColors: Record<string, string> = {
    customer: 'text-blue-400', order: 'text-cyan-400', payment: 'text-green-400',
    delivery: 'text-amber-400', ticket: 'text-purple-400', conversation: 'text-slate-400',
    policy: 'text-red-400', knowledge: 'text-yellow-400', system: 'text-slate-500',
  };
  return (
    <div className="space-y-2">
      {evidence.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No evidence collected yet.</p>
          <p className="text-xs mt-1">Run an investigation to gather evidence.</p>
        </div>
      ) : (
        evidence.map((e: any) => {
          const Icon = sourceIcons[e.source] ?? Activity;
          const color = sourceColors[e.source] ?? 'text-slate-400';
          return (
            <div key={e.id} className="card p-4 card-hover">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{e.evidence_type.replace(/_/g, ' ')}</span>
                    <span className="badge-gray capitalize">{e.source}</span>
                    <span className="badge-blue">{(e.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{e.content}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function RootCauseView({ rootCauses }: any) {
  if (rootCauses.length === 0) return (
    <div className="card p-12 text-center text-slate-500">
      <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">No root cause analysis yet.</p>
    </div>
  );

  const nodes = [...rootCauses].sort((a: any, b: any) => {
    const order = { symptom: 0, intermediate: 1, root: 2 };
    return order[a.node_type as keyof typeof order] - order[b.node_type as keyof typeof order];
  });

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-200 text-sm mb-4">Root Cause Graph</h3>
      <div className="space-y-1">
        {nodes.map((node: any, i: number) => (
          <div key={node.id} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              {i > 0 && <div className="w-0.5 h-4 bg-slate-700" />}
              <div className={`w-3 h-3 rounded-full ${
                node.node_type === 'root' ? 'bg-red-500' :
                node.node_type === 'intermediate' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
            </div>
            <div className="flex-1 card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-200">{node.description}</span>
                  <span className={`badge ml-2 ${
                    node.node_type === 'root' ? 'badge-red' :
                    node.node_type === 'intermediate' ? 'badge-yellow' : 'badge-blue'
                  }`}>{node.node_type}</span>
                </div>
                <span className="text-xs text-slate-500">{(node.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsView({ actions, policies, evidence, caseData, onApprove, onReject, approving }: any) {
  if (actions.length === 0) return (
    <div className="card p-12 text-center text-slate-500">
      <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">No actions proposed yet.</p>
      <p className="text-xs mt-1">Run an investigation to generate action recommendations.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {actions.map((action: any) => {
        const guardrailResult = checkGuardrails(action, caseData, evidence);
        const policyResult = evaluatePolicy(action, caseData, policies);
        return (
          <div key={action.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{action.action_type}</span>
                    <ActionStatusBadge status={action.status} />
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{action.description}</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-500">Confidence</div>
                <div className="text-slate-200 font-medium">{(action.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Guardrails */}
            <div className="bg-slate-900/40 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Guardrail Checks</span>
                <span className={`badge ml-auto ${guardrailResult.passed ? 'badge-green' : 'badge-red'}`}>
                  {guardrailResult.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {guardrailResult.checks.map((check: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {check.passed ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                    <span className="text-slate-500">{check.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy */}
            <div className="bg-slate-900/40 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Policy Evaluation</span>
                <span className={`badge ml-auto ${policyResult.passed ? 'badge-green' : 'badge-red'}`}>
                  {policyResult.passed ? 'Compliant' : 'Violation'}
                </span>
              </div>
              <div className="space-y-1">
                {policyResult.checkedPolicies.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {p.passed ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                    <span className="text-slate-500">{p.name}: {p.rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            {action.status === 'PROPOSED' && (
              <div className="flex gap-2">
                <button onClick={() => onApprove(action.id)} disabled={approving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Execute
                </button>
                <button onClick={() => onReject(action.id)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
            {action.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" /> Action executed successfully
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineView({ events, steps }: any) {
  const allItems = [
    ...events.map((e: any) => ({ ...e, type: 'event' })),
    ...steps.map((s: any) => ({ ...s, type: 'step', description: s.step_type.replace(/_/g, ' ') })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-200 text-sm mb-4">Case Timeline</h3>
      <div className="space-y-3">
        {allItems.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-200">{item.description}</span>
                {item.type === 'step' && <span className="badge-purple text-[10px]">{item.status}</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                {item.duration_ms && ` · ${item.duration_ms}ms`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'badge-blue', investigating: 'badge-purple', pending_action: 'badge-yellow',
    resolved: 'badge-green', escalated: 'badge-red', closed: 'badge-gray',
    pending: 'badge-gray', confirmed: 'badge-blue', shipped: 'badge-purple',
    delivered: 'badge-green', cancelled: 'badge-red', returned: 'badge-yellow',
    settled: 'badge-green', failed: 'badge-red', authorized: 'badge-blue',
    refunded: 'badge-yellow', partially_refunded: 'badge-yellow',
    in_transit: 'badge-blue', exception: 'badge-red', picked_up: 'badge-gray',
    out_for_delivery: 'badge-purple', in_progress: 'badge-purple',
  };
  return <span className={colors[status] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red',
  };
  return <span className={colors[priority] ?? 'badge-gray'}>{priority}</span>;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'badge-green', medium: 'badge-yellow', high: 'badge-red', critical: 'badge-red',
  };
  return <span className={colors[level] ?? 'badge-gray'}>{level}</span>;
}

function ActionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PROPOSED: 'badge-blue', VALIDATING: 'badge-purple', APPROVED: 'badge-green',
    REJECTED: 'badge-red', EXECUTING: 'badge-yellow', COMPLETED: 'badge-green',
    FAILED: 'badge-red', REQUIRES_HUMAN: 'badge-yellow',
  };
  return <span className={colors[status] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
}
