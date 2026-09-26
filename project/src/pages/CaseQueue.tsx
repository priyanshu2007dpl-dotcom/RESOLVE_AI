import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Filter, FolderKanban, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CaseQueue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases', statusFilter, priorityFilter],
    queryFn: async () => {
      let q = supabase.from('cases').select('*, customers(name, email, tier)').order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter);
      const { data } = await q.limit(100);
      return data ?? [];
    },
  });

  const filtered = (cases ?? []).filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.case_number?.toLowerCase().includes(s) ||
      c.subject?.toLowerCase().includes(s) ||
      c.intent?.toLowerCase().includes(s) ||
      c.customers?.name?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Case Queue</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} cases</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input className="input pl-10" placeholder="Search by case number, customer, or intent..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="pending_action">Pending Action</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>
            <select className="input w-auto" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading cases...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No cases found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Case</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Intent</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Investigation</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{c.case_number}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">{c.subject}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-300">{c.customers?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-slate-600 capitalize">{c.customers?.tier}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-gray capitalize">{c.intent?.replace(/_/g, ' ') ?? 'general'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <InvestigationBadge status={c.investigation_status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/cases/${c.id}`} className="text-slate-500 hover:text-blue-400">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'badge-blue', investigating: 'badge-purple', pending_action: 'badge-yellow',
    resolved: 'badge-green', escalated: 'badge-red', closed: 'badge-gray',
  };
  return <span className={colors[status] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red',
  };
  return <span className={colors[priority] ?? 'badge-gray'}>{priority}</span>;
}

function InvestigationBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'badge-gray', understanding: 'badge-blue', investigating: 'badge-purple',
    building_case_twin: 'badge-purple', analyzing_root_cause: 'badge-purple',
    verifying_evidence: 'badge-blue', checking_policy: 'badge-blue',
    checking_guardrails: 'badge-yellow', ready_to_resolve: 'badge-yellow',
    resolving: 'badge-yellow', resolved: 'badge-green',
    escalation_required: 'badge-red', learning: 'badge-gray',
    pattern_detected: 'badge-purple', failed: 'badge-red',
  };
  return <span className={colors[status] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
}
