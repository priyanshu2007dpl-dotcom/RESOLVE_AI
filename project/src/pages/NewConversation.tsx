import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createCaseFromMessage, runInvestigation } from '@/lib/investigation-engine';
import {
  Send, Brain, Sparkles, User, Loader2, CheckCircle2,
  Play, MessageSquare,
} from 'lucide-react';

export function NewConversation() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigationDone, setInvestigationDone] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['all-customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, email, tier').order('name');
      return data ?? [];
    },
  });

  const { data: conversation } = useQuery({
    queryKey: ['new-conversation', createdCaseId],
    queryFn: async () => {
      if (!createdCaseId) return null;
      const { data: caseData } = await supabase.from('cases').select('conversation_id').eq('id', createdCaseId).maybeSingle();
      if (!caseData?.conversation_id) return null;
      const { data: messages } = await supabase.from('conversation_messages').select('*').eq('conversation_id', caseData.conversation_id).order('created_at');
      return messages ?? [];
    },
    enabled: !!createdCaseId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId || !message) return;
      const result = await createCaseFromMessage(selectedCustomerId, message);
      setCreatedCaseId(result.caseId);
      return result;
    },
  });

  const investigateMutation = useMutation({
    mutationFn: async () => {
      if (!createdCaseId) return;
      setInvestigating(true);
      await runInvestigation(createdCaseId);
      setInvestigationDone(true);
      setInvestigating(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-conversation', createdCaseId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedCustomerId) return;
    createMutation.mutate();
  };

  const sampleMessages = [
    "My order hasn't arrived and I was charged twice on my credit card",
    "I received a damaged product and need a replacement",
    "Where is my order? It's been 2 weeks and still no delivery",
    "I was charged twice for the same order, I need a refund immediately",
  ];

  return (
    <div className="space-y-4 fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">New Conversation</h1>
        <p className="text-sm text-slate-500 mt-1">Start a customer conversation and let AI investigate the issue</p>
      </div>

      {!createdCaseId ? (
        <div className="card p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Select Customer</label>
            <select className="input" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
              <option value="">Choose a customer...</option>
              {customers?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email}) - {c.tier}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Customer Message</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Type the customer's message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">Or try a sample message:</div>
            <div className="flex flex-wrap gap-2">
              {sampleMessages.map((s, i) => (
                <button key={i} onClick={() => setMessage(s)} className="btn-secondary text-xs">
                  {s.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || !selectedCustomerId || createMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Create Case & Start Investigation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Conversation */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-200 text-sm mb-4">Conversation</h3>
            <div className="space-y-3">
              {conversation?.map((m: any) => (
                <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                    m.role === 'customer' ? 'bg-slate-800 text-slate-200' :
                    m.role === 'ai' ? 'bg-blue-600/20 text-blue-100 border border-blue-600/30' : 'bg-slate-700'
                  }`}>
                    <div className="text-xs font-medium mb-1 opacity-60">
                      {m.role === 'customer' ? 'Customer' : m.role === 'ai' ? 'AI Agent' : m.role}
                    </div>
                    <div className="text-sm">{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investigation Controls */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">AI Investigation</div>
                <div className="text-xs text-slate-500">
                  {investigationDone ? 'Investigation complete - view the case for details' :
                   investigating ? 'AI is investigating the case...' :
                   'Ready to run AI investigation'}
                </div>
              </div>
              {investigationDone ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <button
                  onClick={() => investigateMutation.mutate()}
                  disabled={investigating}
                  className="btn-primary flex items-center gap-2"
                >
                  {investigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {investigating ? 'Investigating...' : 'Run Investigation'}
                </button>
              )}
            </div>
          </div>

          {investigationDone && (
            <a href={`/cases/${createdCaseId}`} className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> View Full Case Details
            </a>
          )}
        </div>
      )}
    </div>
  );
}
