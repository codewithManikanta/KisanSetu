import React, { useState } from 'react';
import { ChevronDown, Check, User, Tractor, ShoppingCart, Truck, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import ModernDropdown from '../components/common/ModernDropdown';

const Login = () => {
    const { t } = useRoleTranslate();
    const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('FARMER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);


    const roles = [
        { id: 'FARMER' as Role, label: 'Farmer', icon: Tractor, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
        { id: 'BUYER' as Role, label: 'Buyer', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
        { id: 'TRANSPORTER' as Role, label: 'Transporter', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
        // Admin role removed from dropdown
    ];

    const selectedRoleData = roles.find(r => r.id === role);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            login(data.token, data.user);

            // Redirect based on role
            switch (data.user.role) {
                case 'FARMER':
                    navigate('/farmer/dashboard');
                    break;
                case 'BUYER':
                    navigate('/buyer/dashboard');
                    break;
                case 'TRANSPORTER':
                    navigate('/transporter/dashboard');
                    break;
                case 'ADMIN':
                    navigate('/admin/dashboard');
                    break;
                default:
                    navigate('/');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Login Card */}
            <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10 animate-fadeInUp">
                {/* Logo/Icon */}
                <div className="text-center animate-scaleIn anim-delay-200">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4 animate-float">
                        <span className="text-4xl">🌾</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {t('auth.welcome_back')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">{t('auth.sign_in_to_continue')}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-slideInLeft" role="alert">
                            <div className="flex items-center">
                                <span className="text-xl mr-2">⚠️</span>
                                <span className="block sm:inline font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Role Selection Dropdown */}
                        <div className="animate-slideInRight anim-delay-300 relative z-50">
                            <ModernDropdown
                                label=""
                                value={role}
                                options={roles.map(r => ({
                                    value: r.id,
                                    label: r.label,
                                    icon: r.icon,
                                    iconColor: r.color,
                                    iconBg: r.bg
                                }))}
                                onChange={(value) => setRole(value as Role)}
                                placeholder="Select Role"
                            />
                        </div>

                        {/* Email Input */}
                        <div className="animate-slideInRight anim-delay-400">
                            <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('common.email_address')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-lg md:text-xl">📧</span>
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none relative block w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:scale-[1.02] bg-white/50 backdrop-blur-sm"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="animate-slideInRight anim-delay-500">
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('common.password')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-lg md:text-xl">🔒</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none relative block w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:scale-[1.02] bg-white/50 backdrop-blur-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="animate-slideInUp anim-delay-600">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>{t('common.signing_up')}</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span>{t('common.login')}</span>
                                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center text-sm animate-fadeIn anim-delay-700">
                        <span className="text-gray-600">{t('common.dont_have_account')} </span>
                        <Link
                            to="/select-role"
                            className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-300 hover:underline"
                        >
                            {t('common.signup')}
                        </Link>
                    </div>
                </form>

                {/* Admin Login Link */}
                <div className="text-center text-xs animate-fadeIn anim-delay-800 mt-4">
                    <Link to="/admin/login" className="text-gray-400 hover:text-gray-600 transition-colors">
                        Admin Access
                    </Link>
                </div>

            </div>
        </div>

    );
};

export default Login;
