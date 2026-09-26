import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { AppLayout } from '@/components/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { CaseQueue } from '@/pages/CaseQueue';
import { CaseDetail } from '@/pages/CaseDetail';
import { EscalationCenter } from '@/pages/EscalationCenter';
import { Analytics } from '@/pages/Analytics';
import { AdminPanel } from '@/pages/AdminPanel';
import { CustomerPortal } from '@/pages/CustomerPortal';
import { Presentation } from '@/pages/Presentation';
import { NewConversation } from '@/pages/NewConversation';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchInterval: 5000, staleTime: 30000 } },
});

function ProtectedRoute({ children, requireStaff }: { children: ReactNode; requireStaff?: boolean }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="text-slate-400">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireStaff && profile && !['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'ADMIN'].includes(profile.role)) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  const isStaff = profile && ['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'ADMIN'].includes(profile.role);

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to={isStaff ? "/" : "/portal"} replace />} />
      <Route path="/presentation" element={<Presentation />} />
      {isStaff ? (
        <>
          <Route path="/" element={<ProtectedRoute requireStaff><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/cases" element={<ProtectedRoute requireStaff><AppLayout><CaseQueue /></AppLayout></ProtectedRoute>} />
          <Route path="/cases/:id" element={<ProtectedRoute requireStaff><AppLayout><CaseDetail /></AppLayout></ProtectedRoute>} />
          <Route path="/escalations" element={<ProtectedRoute requireStaff><AppLayout><EscalationCenter /></AppLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requireStaff><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireStaff><AppLayout><AdminPanel /></AppLayout></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute requireStaff><AppLayout><NewConversation /></AppLayout></ProtectedRoute>} />
        </>
      ) : (
        <>
          <Route path="/portal" element={<AppLayout><CustomerPortal /></AppLayout>} />
          <Route path="/portal/cases/:id" element={<AppLayout><CaseDetail /></AppLayout>} />
        </>
      )}
      <Route path="*" element={<Navigate to={isStaff ? "/" : "/portal"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
