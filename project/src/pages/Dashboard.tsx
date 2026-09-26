import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  FolderKanban, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Brain, Activity, ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [cases, escalations, resolved, investigating] = await Promise.all([
        supabase.from('cases').select('*', { count: 'exact', head: true }),
        supabase.from('escalations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'investigating'),
      ]);
      return {
        totalCases: cases.count ?? 0,
        openEscalations: escalations.count ?? 0,
        resolvedCases: resolved.count ?? 0,
        investigatingCases: investigating.count ?? 0,
      };
    },
  });

  const { data: recentCases } = useQuery({
    queryKey: ['recent-cases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases')
        .select('*, customers(name, tier)')
        .order('created_at', { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: intentDist } = useQuery({
    queryKey: ['intent-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('intent').not('intent', 'is', null);
      const counts: Record<string, number> = {};
      for (const c of data ?? []) {
        const intent = c.intent as string;
        counts[intent] = (counts[intent] ?? 0) + 1;
      }
      return Object.entries(counts).map(([intent, count]) => ({ intent, count })).sort((a, b) => b.count - a.count);
    },
  });

  const statCards = [
    { label: 'Total Cases', value: stats?.totalCases ?? 0, icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Investigating', value: stats?.investigatingCases ?? 0, icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Resolved', value: stats?.resolvedCases ?? 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Escalations', value: stats?.openEscalations ?? 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">Here's what's happening across your support operations.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{card.value}</div>
              <div className="text-xs text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100">Recent Cases</h2>
            <Link to="/cases" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentCases && recentCases.length > 0 ? recentCases.map((c: any) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="block p-3 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{c.case_number}</span>
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {c.customers?.name ?? 'Unknown'} · {c.intent?.replace(/_/g, ' ') ?? 'general'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 ml-3 shrink-0">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </div>
                </div>
              </Link>
            )) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No cases yet. Start a new conversation to create one.
              </div>
            )}
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-4">Intent Distribution</h2>
          {intentDist && intentDist.length > 0 ? (
            <div className="space-y-3">
              {intentDist.map(item => (
                <div key={item.intent}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 capitalize">{item.intent.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: `${(item.count / Math.max(...intentDist.map(i => i.count))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No intent data yet.
            </div>
          )}
        </div>
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
