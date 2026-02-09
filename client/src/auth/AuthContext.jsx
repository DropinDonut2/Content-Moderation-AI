// ============================================
// AUTH CONTEXT - React Authentication State
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

// ============================================
// AUTH PROVIDER COMPONENT
// ============================================

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Verify token with backend
    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            setIsLoading(false);
            setIsAuthenticated(false);
            setUser(null);
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setIsAuthenticated(true);
            } else {
                // Token invalid - clear it
                localStorage.removeItem('auth_token');
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('auth_token');
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Login function
    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token and update state
            localStorage.setItem('auth_token', data.token);
            setUser(data.user);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Logout function
    const logout = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token');
            
            // Call logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local state
            localStorage.removeItem('auth_token');
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    // Get auth header for API calls
    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, []);

    // Authenticated fetch wrapper
    const authFetch = useCallback(async (url, options = {}) => {
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });

        // If unauthorized, log out
        if (response.status === 401) {
            const data = await response.json();
            if (data.code === 'INVALID_TOKEN' || data.code === 'NO_TOKEN') {
                logout();
            }
        }

        return response;
    }, [logout]);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
        getAuthHeader,
        authFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============================================
// CUSTOM HOOK
// ============================================

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#f3f4f6'
            }}>
                <div style={{
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #e5e7eb',
                        borderTop: '3px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#6b7280', margin: 0 }}>Loading...</p>
                    <style>
                        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
                    </style>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default AuthContext;