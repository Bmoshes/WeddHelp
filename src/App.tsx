import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/auth';
import { AppShell, ProtectedRoute } from './app/layout';
import { BudgetPage } from './pages/BudgetPage';
import { DashboardPage } from './pages/DashboardPage';
import { GuestsPage } from './pages/GuestsPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RsvpPage } from './pages/RsvpPage';
import { SeatingPage } from './pages/SeatingPage';
import { TasksPage } from './pages/TasksPage';
import { ToolsPage } from './pages/ToolsPage';

function RootRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? '/app' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/rsvp/:token" element={<RsvpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="seating" element={<SeatingPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="tools" element={<ToolsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
