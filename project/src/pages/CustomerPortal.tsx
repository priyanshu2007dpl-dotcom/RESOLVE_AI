import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { FolderKanban, MessageSquare, Package, CreditCard, ChevronRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CustomerPortal() {
  const { profile, user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ['customer-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('user_id', user?.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: cases } = useQuery({
    queryKey: ['customer-cases', customer?.id],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('*').eq('customer_id', customer?.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  const { data: orders } = useQuery({
    queryKey: ['customer-orders', customer?.id],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*').eq('customer_id', customer?.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  if (!customer) {
    return (
      <div className="card p-12 text-center text-slate-500">
        <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No customer profile linked to your account yet.</p>
        <p className="text-xs mt-1">An agent needs to link your account to a customer record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">My Support Portal</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome, {customer.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{cases?.length ?? 0}</div>
          <div className="text-xs text-slate-500">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{customer.total_orders}</div>
          <div className="text-xs text-slate-500">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">${customer.lifetime_value}</div>
          <div className="text-xs text-slate-500">Lifetime Value</div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{customer.total_tickets}</div>
          <div className="text-xs text-slate-500">Support Tickets</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-200 text-sm mb-4">My Cases</h2>
          {cases && cases.length > 0 ? (
            <div className="space-y-2">
              {cases.map((c: any) => (
                <Link key={c.id} to={`/portal/cases/${c.id}`} className="block p-3 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{c.case_number}</span>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{c.subject}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${c.status === 'resolved' ? 'badge-green' : c.status === 'escalated' ? 'badge-red' : 'badge-blue'}`}>{c.status}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No cases yet.</div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-200 text-sm mb-4">Recent Orders</h2>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{o.order_number}</span>
                      <div className="text-xs text-slate-500">${o.total_amount}</div>
                    </div>
                    <span className={`badge ${o.status === 'delivered' ? 'badge-green' : o.status === 'shipped' ? 'badge-purple' : 'badge-blue'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No orders found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
