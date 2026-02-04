import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import SignupFarmer from './pages/SignupFarmer';
import SignupBuyer from './pages/SignupBuyer';
import SignupTransporter from './pages/SignupTransporter';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/select-role" element={<RoleSelection />} />
          <Route path="/signup/farmer" element={<SignupFarmer />} />
          <Route path="/signup/buyer" element={<SignupBuyer />} />
          <Route path="/signup/transporter" element={<SignupTransporter />} />

          <Route path="/transporter/pending-approval" element={
            <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                <div className="text-4xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold mb-2">Approval Pending</h2>
                <p className="text-gray-600">Your transporter account is currently under review by the admin. Please check back later.</p>
                <a href="/login" className="mt-6 inline-block text-green-600 hover:underline">Back to Login</a>
              </div>
            </div>
          } />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            {/* Note: Dashboard component inside handles role-based rendering, 
                 so we can point /farmer/dashboard etc to it as well, 
                 OR we rely on ProtectedRoute redirecting logic if we had separate components.
                 Since we put all logic in Dashboard.tsx, we can route all specific paths to it too.
              */}
            <Route path="/farmer/dashboard" element={<Dashboard />} />
            <Route path="/buyer/dashboard" element={<Dashboard />} />
            <Route path="/transporter/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
