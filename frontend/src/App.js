import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import {
  HomePage,
  LoginPage,
  RegisterPage,
  AdminUsersPage,
} from './components';
import PublicLayout from './components/layouts/PublicLayout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import { Navigate } from 'react-router-dom';
import AdminEventsPage from './components/admin/AdminEventsPage';
import AdminChatPage from './components/admin/AdminChatPage';

/**
 * App Component
 * Main application component with routing setup
 * Provides navigation, routes, and footer for all pages
 * @returns {JSX.Element}
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="events" replace />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="chat" element={<AdminChatPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* Catch-all route for 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h1 className="text-5xl font-bold text-slate-900 mb-2">
                    404
                  </h1>
                  <p className="text-slate-600 mb-6">Page not found</p>
                  <a
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-semibold shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"
                  >
                    Go Back Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;
