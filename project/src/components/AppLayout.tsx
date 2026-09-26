import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, FolderKanban, AlertTriangle, BarChart3,
  Settings, MessageSquarePlus, LogOut, Bell, Menu, X,
  Brain, Shield, User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isStaff = profile && ['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'ADMIN'].includes(profile.role);

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread', profile?.id],
    queryFn: async () => {
      if (!profile) return 0;
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_read', false);
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const staffNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cases', label: 'Case Queue', icon: FolderKanban },
    { to: '/escalations', label: 'Escalations', icon: AlertTriangle },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/new', label: 'New Conversation', icon: MessageSquarePlus },
    { to: '/admin', label: 'Admin', icon: Settings },
  ];

  const customerNav = [
    { to: '/portal', label: 'My Cases', icon: LayoutDashboard },
  ];

  const nav = isStaff ? staffNav : customerNav;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200`}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">ResolveAI</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">AI Support Platform</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Link to="/presentation" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors">
            <Shield className="w-4 h-4" />
            Presentation Mode
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
              {profile?.full_name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 truncate">{profile?.full_name ?? 'User'}</div>
              <div className="text-[10px] text-slate-500">{profile?.role ?? ''}</div>
            </div>
            <button onClick={() => signOut()} className="text-slate-500 hover:text-slate-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-slate-200">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/new')} className="btn-primary hidden sm:flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              New Case
            </button>
            <button className="relative text-slate-400 hover:text-slate-200 p-2">
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
