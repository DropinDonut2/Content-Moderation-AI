// ============================================
// LOGIN PAGE - Matches Dashboard Theme
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(username, password);

        if (result.success) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } else {
            setError(result.error || 'Login failed');
            setPassword('');
        }
        
        setIsLoading(false);
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center font-mono"
            style={{ 
                backgroundColor: 'var(--bg-primary, #0a0a0a)',
                color: 'var(--text-primary, #ffffff)'
            }}
        >
            {/* Background Grid Pattern */}
            <div 
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px'
                }}
            />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-widest mb-2">
                        Content Moderation System
                    </h1>
                    <p 
                        className="text-sm uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary, #71717a)' }}
                    >
                        Login to Dashboard
                    </p>
                </div>

                {/* Login Card */}
                <div 
                    className="p-8"
                    style={{ 
                        backgroundColor: 'var(--bg-card, #18181b)',
                        border: '1px solid var(--border-color, #27272a)'
                    }}
                >
                    {/* Error Message */}
                    {error && (
                        <div 
                            className="mb-6 p-4 flex items-center gap-3"
                            style={{ 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <AlertCircle size={18} className="text-red-500 shrink-0" />
                            <span className="text-red-400 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username */}
                        <div>
                            <label 
                                className="block text-xs uppercase tracking-wider mb-2"
                                style={{ color: 'var(--text-secondary, #71717a)' }}
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 text-sm font-mono outline-none transition-all"
                                style={{ 
                                    backgroundColor: 'var(--bg-secondary, #0a0a0a)',
                                    border: '1px solid var(--border-color, #27272a)',
                                    color: 'var(--text-primary, #ffffff)'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'white'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #27272a)'}
                                placeholder="Enter username"
                                required
                                disabled={isLoading}
                                autoComplete="username"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label 
                                className="block text-xs uppercase tracking-wider mb-2"
                                style={{ color: 'var(--text-secondary, #71717a)' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 text-sm font-mono outline-none transition-all"
                                    style={{ 
                                        backgroundColor: 'var(--bg-secondary, #0a0a0a)',
                                        border: '1px solid var(--border-color, #27272a)',
                                        color: 'var(--text-primary, #ffffff)'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'white'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #27272a)'}
                                    placeholder="Enter password"
                                    required
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                                    style={{ color: 'var(--text-secondary, #71717a)' }}
                                    onMouseEnter={(e) => e.target.style.color = 'white'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary, #71717a)'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 text-sm font-bold uppercase tracking-widest transition-all"
                            style={{ 
                                backgroundColor: isLoading ? '#27272a' : 'white',
                                color: isLoading ? '#71717a' : 'black',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.target.style.backgroundColor = '#e4e4e7';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isLoading) {
                                    e.target.style.backgroundColor = 'white';
                                }
                            }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg 
                                        className="animate-spin h-4 w-4" 
                                        viewBox="0 0 24 24"
                                        style={{ color: '#71717a' }}
                                    >
                                        <circle 
                                            className="opacity-25" 
                                            cx="12" cy="12" r="10" 
                                            stroke="currentColor" 
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path 
                                            className="opacity-75" 
                                            fill="currentColor" 
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div 
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider"
                        style={{ 
                            color: 'var(--text-secondary, #71717a)',
                            border: '1px solid var(--border-color, #27272a)'
                        }}
                    >
                        <Lock size={12} />
                        Secure Connection
                    </div>
                </div>

                {/* Version */}
                <p 
                    className="mt-6 text-center text-xs"
                    style={{ color: 'var(--text-muted, #3f3f46)' }}
                >
                    ISEKAI ZERO • Content Moderation v1.0
                </p>
            </div>
        </div>
    );
};

export default LoginPage;