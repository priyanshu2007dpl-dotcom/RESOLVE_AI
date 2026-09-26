import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle2, User, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EscalationCenter() {
  const queryClient = useQueryClient();

  const { data: escalations } = useQuery({
    queryKey: ['escalations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('escalations')
        .select('*, cases(case_number, subject, intent, priority, status), customers(name, email, tier)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const resolveEscalation = useMutation({
    mutationFn: async (escalationId: string) => {
      await supabase.from('escalations').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', escalationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalations'] }),
  });

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Escalation Center</h1>
        <p className="text-sm text-slate-500 mt-1">Cases that require human attention</p>
      </div>

      {escalations && escalations.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400 opacity-40" />
          <p className="text-sm">No escalations. All cases are being handled automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalations?.map((esc: any) => (
            <div key={esc.id} className="card p-5 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/cases/${esc.case_id}`} className="text-sm font-medium text-slate-200 hover:text-blue-400">
                        {esc.cases?.case_number ?? 'Unknown'}
                      </Link>
                      <RiskBadge level={esc.risk_level} />
                      <EscalationStatusBadge status={esc.status} />
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{esc.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {esc.customers?.name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}</span>
                      <span>Confidence: {(esc.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                    {esc.recommended_action && (
                      <div className="mt-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
                        <span className="text-slate-500">Recommended:</span> {esc.recommended_action}
                      </div>
                    )}
                  </div>
                </div>
                {esc.status === 'open' && (
                  <button onClick={() => resolveEscalation.mutate(esc.id)} className="btn-secondary text-xs">
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red', critical: 'badge-red' };
  return <span className={colors[level] ?? 'badge-gray'}>{level}</span>;
}

function EscalationStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { open: 'badge-red', assigned: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' };
  return <span className={colors[status] ?? 'badge-gray'}>{status}</span>;
}
