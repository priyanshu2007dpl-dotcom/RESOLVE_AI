import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, Users, Brain, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Analytics() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const [cases, escalations, actions, customers] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('escalations').select('*'),
        supabase.from('actions').select('*'),
        supabase.from('customers').select('*'),
      ]);

      const caseData = cases.data ?? [];
      const escalationData = escalations.data ?? [];
      const actionData = actions.data ?? [];
      const customerData = customers.data ?? [];

      // Status distribution
      const statusCounts: Record<string, number> = {};
      for (const c of caseData) { statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1; }
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

      // Intent distribution
      const intentCounts: Record<string, number> = {};
      for (const c of caseData) {
        if (c.intent) { intentCounts[c.intent] = (intentCounts[c.intent] ?? 0) + 1; }
      }
      const intentData = Object.entries(intentCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

      // Action types
      const actionCounts: Record<string, number> = {};
      for (const a of actionData) { actionCounts[a.action_type] = (actionCounts[a.action_type] ?? 0) + 1; }
      const actionChartData = Object.entries(actionCounts).map(([name, value]) => ({ name, value }));

      // Resolution rate
      const resolved = caseData.filter((c: any) => c.status === 'resolved').length;
      const escalated = caseData.filter((c: any) => c.status === 'escalated').length;
      const total = caseData.length;
      const resolutionRate = total > 0 ? (resolved / total * 100).toFixed(0) : '0';
      const escalationRate = total > 0 ? (escalated / total * 100).toFixed(0) : '0';

      // Cases over time (last 7 days)
      const now = new Date();
      const timeData: { date: string; cases: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().slice(0, 10);
        const count = caseData.filter((c: any) => c.created_at.slice(0, 10) === dayStr).length;
        timeData.push({ date: day.toLocaleDateString('en-US', { weekday: 'short' }), cases: count });
      }

      // Customer tier distribution
      const tierCounts: Record<string, number> = {};
      for (const c of customerData) { tierCounts[c.tier] = (tierCounts[c.tier] ?? 0) + 1; }
      const tierData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

      return {
        statusData, intentData, actionChartData, timeData, tierData,
        totalCases: total, resolved, escalated, resolutionRate, escalationRate,
        totalCustomers: customerData.length, totalActions: actionData.length,
        totalEscalations: escalationData.length,
      };
    },
  });

  if (!analytics) return <div className="text-center py-20 text-slate-500">Loading analytics...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time insights from your support operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value={analytics.totalCases} icon={BarChart3} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Resolution Rate" value={`${analytics.resolutionRate}%`} icon={TrendingUp} color="text-green-400" bg="bg-green-500/10" />
        <StatCard label="Escalation Rate" value={`${analytics.escalationRate}%`} icon={Activity} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard label="Total Customers" value={analytics.totalCustomers} icon={Users} color="text-cyan-400" bg="bg-cyan-500/10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Cases Over Time">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="cases" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Status Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                {analytics.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Intent Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.intentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Action Types">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.actionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-slate-100 mt-2">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-200 text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}
