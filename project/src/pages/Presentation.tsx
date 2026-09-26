import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createCaseFromMessage, runInvestigation } from '@/lib/investigation-engine';
import {
  Brain, Play, Loader2, CheckCircle2, ArrowRight,
  MessageSquare, Search, GitBranch, Shield, Zap,
  AlertTriangle, Sparkles, Eye, Clock, FileSearch,
} from 'lucide-react';

const SCENARIO_MESSAGE = "My order hasn't arrived and I was charged twice on my credit card. This is very frustrating!";

const PHASES = [
  { id: 'understand', label: 'Understand', icon: MessageSquare, desc: 'AI classifies customer intent' },
  { id: 'investigate', label: 'Investigate', icon: Search, desc: 'Gather evidence from all systems' },
  { id: 'twin', label: 'Case Digital Twin', icon: Brain, desc: 'Build complete case model' },
  { id: 'root_cause', label: 'Root Cause', icon: GitBranch, desc: 'Identify underlying cause' },
  { id: 'evidence', label: 'Evidence', icon: FileSearch, desc: 'Verify supporting evidence' },
  { id: 'policy', label: 'Policy', icon: Shield, desc: 'Check against business policies' },
  { id: 'guardrails', label: 'Guardrails', icon: Eye, desc: 'Validate safety checks' },
  { id: 'action', label: 'Action', icon: Zap, desc: 'Execute or propose resolution' },
  { id: 'escalation', label: 'Escalation', icon: AlertTriangle, desc: 'Escalate if needed' },
  { id: 'learning', label: 'Learning', icon: Sparkles, desc: 'Learn from the case' },
];

export function Presentation() {
  const queryClient = useQueryClient();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['presentation-customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, email, tier').order('name').limit(1);
      return data ?? [];
    },
  });

  const { data: caseData } = useQuery({
    queryKey: ['presentation-case', caseId],
    queryFn: async () => {
      if (!caseId) return null;
      const { data } = await supabase.from('cases').select('*, customers(name, email, tier)').eq('id', caseId).maybeSingle();
      return data;
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const { data: steps } = useQuery({
    queryKey: ['presentation-steps', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data } = await supabase.from('investigation_steps').select('*').eq('case_id', caseId).order('created_at');
      return data ?? [];
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const { data: evidence } = useQuery({
    queryKey: ['presentation-evidence', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data } = await supabase.from('evidence').select('*').eq('case_id', caseId).order('created_at');
      return data ?? [];
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const { data: rootCauses } = useQuery({
    queryKey: ['presentation-root-causes', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data } = await supabase.from('root_causes').select('*').eq('case_id', caseId).order('created_at');
      return data ?? [];
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const { data: actions } = useQuery({
    queryKey: ['presentation-actions', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data } = await supabase.from('actions').select('*').eq('case_id', caseId).order('created_at');
      return data ?? [];
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const { data: messages } = useQuery({
    queryKey: ['presentation-messages', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data: cd } = await supabase.from('cases').select('conversation_id').eq('id', caseId).maybeSingle();
      if (!cd?.conversation_id) return [];
      const { data } = await supabase.from('conversation_messages').select('*').eq('conversation_id', cd.conversation_id).order('created_at');
      return data ?? [];
    },
    enabled: !!caseId,
    refetchInterval: 1000,
  });

  const startPresentation = async () => {
    if (!customers?.[0]) return;
    setRunning(true);
    setPhase(0);
    setDone(false);

    // Create case
    const result = await createCaseFromMessage(customers[0].id, SCENARIO_MESSAGE);
    setCaseId(result.caseId);

    // Animate through phases
    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      await new Promise(r => setTimeout(r, 400));
    }

    // Run investigation
    await runInvestigation(result.caseId);

    setDone(true);
    setRunning(false);
    queryClient.invalidateQueries();
  };

  const completedSteps = steps?.filter((s: any) => s.status === 'completed').length ?? 0;
  const currentPhaseIdx = Math.min(completedSteps, PHASES.length - 1);

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">ResolveAI Presentation</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
            Watch ResolveAI handle a real customer complaint end-to-end: from understanding the message to
            investigating, building a case twin, identifying root cause, checking policies, and taking action.
          </p>
        </div>

        {/* Scenario */}
        <div className="card p-5 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Demo Scenario</div>
              <p className="text-sm text-slate-200">"{SCENARIO_MESSAGE}"</p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        {!caseId && (
          <div className="text-center py-8">
            <button onClick={startPresentation} disabled={running || !customers?.length}
              className="btn-primary px-8 py-3 text-base flex items-center gap-2 mx-auto">
              {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {running ? 'Starting...' : 'Start Presentation'}
            </button>
            {!customers?.length && <p className="text-xs text-slate-500 mt-3">Loading customer data...</p>}
          </div>
        )}

        {/* Phase Progress */}
        {caseId && (
          <div className="card p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {PHASES.map((p, i) => {
                const Icon = p.icon;
                const isComplete = i < currentPhaseIdx || (done && i <= currentPhaseIdx);
                const isCurrent = i === currentPhaseIdx && !done;
                return (
                  <div key={p.id} className={`flex flex-col items-center text-center p-3 rounded-lg transition-all ${
                    isComplete ? 'bg-green-500/10' : isCurrent ? 'bg-blue-500/10 pulse-glow' : 'bg-slate-900/40'
                  }`}>
                    <Icon className={`w-5 h-5 mb-2 ${isComplete ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-slate-600'}`} />
                    <div className={`text-xs font-medium ${isComplete ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-slate-500'}`}>
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">{p.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Results */}
        {caseId && (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Case Info */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Case Status</h3>
              {caseData && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Case Number:</span><span className="text-slate-200">{caseData.case_number}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Customer:</span><span className="text-slate-200">{caseData.customers?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Intent:</span><span className="text-slate-200 capitalize">{caseData.intent?.replace(/_/g, ' ') ?? 'analyzing...'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="text-slate-200">{caseData.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Investigation:</span><span className="text-slate-200">{caseData.investigation_status?.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Confidence:</span><span className="text-slate-200">{(caseData.confidence_score * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Root Cause:</span><span className="text-slate-200">{caseData.root_cause ?? 'analyzing...'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Risk Level:</span><span className="text-slate-200 capitalize">{caseData.risk_level}</span></div>
                </div>
              )}
            </div>

            {/* Investigation Steps */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Investigation Steps</h3>
              <div className="space-y-2">
                {steps?.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> :
                     s.status === 'running' ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" /> :
                     s.status === 'failed' ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> :
                     <Clock className="w-4 h-4 text-slate-600 shrink-0" />}
                    <span className="text-slate-300">{s.step_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-600 ml-auto">{s.status}</span>
                  </div>
                ))}
                {(!steps || steps.length === 0) && <div className="text-sm text-slate-500">Waiting for investigation...</div>}
              </div>
            </div>

            {/* Evidence */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Evidence ({evidence?.length ?? 0})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {evidence?.map((e: any) => (
                  <div key={e.id} className="text-xs text-slate-400 flex items-start gap-2">
                    <FileSearch className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-500 capitalize">[{e.source}]</span> {e.content}
                    </div>
                  </div>
                ))}
                {(!evidence || evidence.length === 0) && <div className="text-sm text-slate-500">No evidence yet...</div>}
              </div>
            </div>

            {/* Root Cause Graph */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Root Cause Analysis</h3>
              <div className="space-y-1">
                {rootCauses?.map((rc: any) => (
                  <div key={rc.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${rc.node_type === 'root' ? 'bg-red-500' : rc.node_type === 'intermediate' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <span className="text-slate-300">{rc.description}</span>
                    <span className="text-xs text-slate-600 ml-auto">{(rc.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {(!rootCauses || rootCauses.length === 0) && <div className="text-sm text-slate-500">Analyzing root cause...</div>}
              </div>
            </div>

            {/* Actions */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Actions</h3>
              <div className="space-y-2">
                {actions?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300">{a.action_type}</span>
                    <span className="text-xs text-slate-500 truncate flex-1">{a.description}</span>
                    <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : a.status === 'PROPOSED' ? 'badge-blue' : 'badge-yellow'}`}>{a.status}</span>
                  </div>
                ))}
                {(!actions || actions.length === 0) && <div className="text-sm text-slate-500">No actions proposed yet...</div>}
              </div>
            </div>

            {/* Conversation */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Conversation</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages?.map((m: any) => (
                  <div key={m.id} className={`text-sm rounded-lg px-3 py-2 ${m.role === 'customer' ? 'bg-slate-800 text-slate-200' : m.role === 'ai' ? 'bg-blue-600/20 text-blue-100' : 'bg-slate-700'}`}>
                    <div className="text-xs font-medium opacity-60 mb-0.5">{m.role}</div>
                    {m.content}
                  </div>
                ))}
                {(!messages || messages.length === 0) && <div className="text-sm text-slate-500">No messages yet...</div>}
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {done && caseId && (
          <div className="card p-5 text-center bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-700/30">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-100">Investigation Complete</h3>
            <p className="text-sm text-slate-400 mt-1">ResolveAI has processed the customer complaint end-to-end.</p>
            <Link to={`/cases/${caseId}`} className="btn-primary mt-4 inline-flex items-center gap-2">
              View Full Case Details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
