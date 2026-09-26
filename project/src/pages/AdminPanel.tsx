import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Settings, Users, FileText, Shield, Scroll, Plus, Trash2,
  Check, X,
} from 'lucide-react';
import { format } from 'date-fns';

type AdminTab = 'users' | 'policies' | 'knowledge' | 'audit';

export function AdminPanel() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');

  if (profile && !['SUPPORT_MANAGER', 'ADMIN'].includes(profile.role)) {
    return <div className="text-center py-20 text-slate-500">You don't have access to the admin panel.</div>;
  }

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'knowledge', label: 'Knowledge', icon: FileText },
    { id: 'audit', label: 'Audit Logs', icon: Scroll },
  ];

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Manage users, policies, knowledge base, and audit logs</p>
      </div>

      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="fade-in">
        {tab === 'users' && <UsersAdmin />}
        {tab === 'policies' && <PoliciesAdmin />}
        {tab === 'knowledge' && <KnowledgeAdmin />}
        {tab === 'audit' && <AuditAdmin />}
      </div>
    </div>
  );
}

function UsersAdmin() {
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((p: any) => (
              <tr key={p.id} className="border-b border-slate-800/50">
                <td className="px-4 py-3 text-slate-200">{p.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{p.email}</td>
                <td className="px-4 py-3"><span className="badge-blue">{p.role}</span></td>
                <td className="px-4 py-3"><span className={p.is_active ? 'badge-green' : 'badge-red'}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoliciesAdmin() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '', category: 'general' });

  const { data: policies } = useQuery({
    queryKey: ['admin-policies'],
    queryFn: async () => {
      const { data } = await supabase.from('policies').select('*').order('priority');
      return data ?? [];
    },
  });

  const togglePolicy = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase.from('policies').update({ is_active: !isActive }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-policies'] }),
  });

  const addPolicy = useMutation({
    mutationFn: async () => {
      await supabase.from('policies').insert({ ...newPolicy, rules: [], is_active: true, priority: 5 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      setShowAdd(false);
      setNewPolicy({ name: '', description: '', category: 'general' });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      {showAdd && (
        <div className="card p-4 space-y-3">
          <input className="input" placeholder="Policy name" value={newPolicy.name} onChange={e => setNewPolicy({ ...newPolicy, name: e.target.value })} />
          <input className="input" placeholder="Description" value={newPolicy.description} onChange={e => setNewPolicy({ ...newPolicy, description: e.target.value })} />
          <input className="input" placeholder="Category" value={newPolicy.category} onChange={e => setNewPolicy({ ...newPolicy, category: e.target.value })} />
          <button onClick={() => addPolicy.mutate()} className="btn-primary text-sm">Create</button>
        </div>
      )}

      {policies?.map((p: any) => (
        <div key={p.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{p.name}</span>
                <span className="badge-gray">{p.category}</span>
                <span className={p.is_active ? 'badge-green' : 'badge-red'}>{p.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{p.description}</p>
              <div className="mt-2 space-y-1">
                {p.rules.map((r: any, i: number) => (
                  <div key={i} className="text-xs text-slate-500 flex items-center gap-2">
                    <Check className="w-3 h-3 text-slate-600" /> {r.rule}: {String(r.value)} - {r.description}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => togglePolicy.mutate({ id: p.id, isActive: p.is_active })} className="btn-ghost text-xs">
              {p.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function KnowledgeAdmin() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '', category: 'general' });

  const { data: docs } = useQuery({
    queryKey: ['admin-knowledge'],
    queryFn: async () => {
      const { data } = await supabase.from('knowledge_documents').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const addDoc = useMutation({
    mutationFn: async () => {
      await supabase.from('knowledge_documents').insert({ ...newDoc, tags: [], is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge'] });
      setShowAdd(false);
      setNewDoc({ title: '', content: '', category: 'general' });
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('knowledge_documents').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-knowledge'] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {showAdd && (
        <div className="card p-4 space-y-3">
          <input className="input" placeholder="Title" value={newDoc.title} onChange={e => setNewDoc({ ...newDoc, title: e.target.value })} />
          <textarea className="input min-h-[100px]" placeholder="Content" value={newDoc.content} onChange={e => setNewDoc({ ...newDoc, content: e.target.value })} />
          <input className="input" placeholder="Category" value={newDoc.category} onChange={e => setNewDoc({ ...newDoc, category: e.target.value })} />
          <button onClick={() => addDoc.mutate()} className="btn-primary text-sm">Create</button>
        </div>
      )}

      {docs?.map((d: any) => (
        <div key={d.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{d.title}</span>
                <span className="badge-gray">{d.category}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{d.content}</p>
            </div>
            <button onClick={() => deleteDoc.mutate(d.id)} className="btn-ghost text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditAdmin() {
  const { data: logs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="card overflow-hidden">
      {logs && logs.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <Scroll className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No audit logs yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">Result</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((l: any) => (
                <tr key={l.id} className="border-b border-slate-800/50">
                  <td className="px-4 py-3 text-slate-200">{l.action}</td>
                  <td className="px-4 py-3 text-slate-400">{l.entity_type}</td>
                  <td className="px-4 py-3"><span className={l.result === 'success' ? 'badge-green' : 'badge-red'}>{l.result ?? 'N/A'}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(l.created_at), 'MMM d, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
