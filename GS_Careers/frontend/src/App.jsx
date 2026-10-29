import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { verifyToken } from './services/api';

// Public pages
import HomePage from './pages/HomePage';
import VacanciesPage from './pages/VacanciesPage';
import ApplyPage from './pages/ApplyPage';
import SuccessPage from './pages/SuccessPage';
import ConfirmInterview from './pages/ConfirmInterview';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import SignupPage from './pages/admin/SignupPage';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ManageVacancies from './pages/admin/ManageVacancies';
import CreateVacancy from './pages/admin/CreateVacancy';
import Applicants from './pages/admin/Applicants';
import TalentPool from './pages/admin/TalentPool';
import ManageAdmins from './pages/admin/ManageAdmins';
import ManageCompanies from './pages/admin/ManageCompanies';
import CompanyReports from './pages/admin/CompanyReports';
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import VacancyApprovals from './pages/admin/VacancyApprovals';
import ApprovalTracker from './pages/admin/ApprovalTracker';
import AuditLog from './pages/admin/AuditLog';
import SettingsPage from './pages/admin/SettingsPage';
import CvExtractionsPage from './pages/admin/CvExtractionsPage';
import NotificationsPage from './pages/admin/NotificationsPage';

function ProtectedRoute({ children }) {
    const [auth, setAuth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('gs_admin_token');
        if (!token) {
            setLoading(false);
            return;
        }
        verifyToken()
            .then(res => {
                setAuth(res.data.data.admin);
                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem('gs_admin_token');
                localStorage.removeItem('gs_admin_data');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    if (!auth) return <Navigate to="/admin/login" />;

    // Force password change if required
    if (auth.require_password_change && window.location.pathname !== '/admin/setup-password') {
        return <Navigate to="/admin/setup-password" replace />;
    }

    return children(auth);
}

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/vacancies" element={<VacanciesPage />} />
            <Route path="/apply/:id" element={<ApplyPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/confirm-interview" element={<ConfirmInterview />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/signup" element={<SignupPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

            <Route path="/admin/setup-password" element={
                <ProtectedRoute>
                    {() => <ChangePasswordPage />}
                </ProtectedRoute>
            } />

            <Route path="/admin/*" element={
                <ProtectedRoute>
                    {(admin) => (
                        <AdminLayout admin={admin}>
                            <Routes>
                                <Route path="/" element={<Dashboard admin={admin} />} />
                                <Route path="/notifications" element={<NotificationsPage admin={admin} />} />
                                <Route path="/vacancies" element={<ManageVacancies admin={admin} />} />
                                <Route path="/vacancies/create" element={<CreateVacancy admin={admin} />} />
                                <Route path="/vacancies/edit/:id" element={<CreateVacancy admin={admin} />} />
                                <Route path="/applicants" element={<Applicants admin={admin} />} />
                                <Route path="/talent-pool" element={<TalentPool admin={admin} />} />
                                <Route path="/approvals" element={<VacancyApprovals admin={admin} />} />
                                <Route path="/approvals/tracker" element={<ApprovalTracker admin={admin} />} />
                                <Route path="/audit-log" element={<AuditLog admin={admin} />} />
                                {(admin.role === 'super_admin' || admin.role === 'admin') && (
                                    <>
                                        <Route path="/vacancies/reports" element={<CompanyReports admin={admin} />} />
                                        <Route path="/admins" element={<ManageAdmins admin={admin} />} />
                                    </>
                                )}
                                <Route path="/companies" element={<ManageCompanies admin={admin} />} />
                                <Route path="/cv-extractions" element={<CvExtractionsPage admin={admin} />} />
                                <Route path="/settings" element={<SettingsPage admin={admin} />} />
                                <Route path="*" element={<Navigate to="/admin" />} />
                            </Routes>
                        </AdminLayout>
                    )}
                </ProtectedRoute>
            } />
        </Routes>
    );
}

export default App;
