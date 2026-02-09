// ============================================
// AUTH HEADER COMPONENT
// ============================================
// Shows logged-in user and logout button
// Add this to your dashboard layout
// ============================================

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthHeader = ({ title = 'Content Moderation' }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
        navigate('/login');
    };

    if (!isAuthenticated) return null;

    return (
        <header style={styles.header}>
            <div style={styles.titleSection}>
                <div style={styles.logo}>
                    <ShieldIcon />
                </div>
                <h1 style={styles.title}>{title}</h1>
            </div>

            <div style={styles.userSection}>
                <div 
                    style={styles.userButton}
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    <div style={styles.avatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span style={styles.username}>{user?.username || 'User'}</span>
                    <ChevronIcon />
                </div>

                {showDropdown && (
                    <>
                        <div 
                            style={styles.overlay}
                            onClick={() => setShowDropdown(false)}
                        />
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownHeader}>
                                <div style={styles.dropdownAvatar}>
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div style={styles.dropdownName}>{user?.username}</div>
                                    <div style={styles.dropdownRole}>Administrator</div>
                                </div>
                            </div>
                            <div style={styles.dropdownDivider} />
                            <button
                                style={styles.logoutButton}
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                            >
                                <LogoutIcon />
                                {isLoggingOut ? 'Signing out...' : 'Sign out'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

// ============================================
// ICONS
// ============================================

const ShieldIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);

const ChevronIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
);

// ============================================
// STYLES
// ============================================

const styles = {
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    titleSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    logo: {
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
    },
    title: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1a1a2e',
        margin: 0
    },
    userSection: {
        position: 'relative'
    },
    userButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        border: 'none',
        background: 'transparent'
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '14px'
    },
    username: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151'
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '240px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e5e7eb',
        zIndex: 50,
        overflow: 'hidden'
    },
    dropdownHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px'
    },
    dropdownAvatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '16px'
    },
    dropdownName: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1f2937'
    },
    dropdownRole: {
        fontSize: '13px',
        color: '#6b7280'
    },
    dropdownDivider: {
        height: '1px',
        background: '#e5e7eb'
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '14px 16px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#dc2626',
        transition: 'background 0.2s',
        textAlign: 'left'
    }
};

export default AuthHeader;