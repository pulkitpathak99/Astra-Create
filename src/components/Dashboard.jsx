import React from 'react';

export function Dashboard({ onNavigate }) {
    return (
        <div className="dashboard-landing">
            {/* Background subtle pattern */}
            <div className="dashboard-bg-pattern" />

            {/* Main content container */}
            <div className="dashboard-content">
                {/* Header / Branding */}
                <header className="dashboard-header">
                    <div className="dashboard-logo">
                        <span className="logo-mark">Astra</span>
                        <span className="logo-suffix">Create</span>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="dashboard-hero">
                    <h1 className="hero-title">
                        Create compliant campaigns,<br />
                        <span className="hero-accent">faster than ever.</span>
                    </h1>
                    <p className="hero-subtitle">
                        From product image to 80+ ready-to-deploy ad variants in seconds.
                        AI-powered compliance checking built in.
                    </p>
                </section>

                {/* Workflow Cards */}
                <section className="dashboard-cards">
                    {/* Quick Create - Magic Wand */}
                    <button
                        onClick={() => onNavigate('magic-wand')}
                        className="workflow-card workflow-card--primary"
                    >
                        <div className="card-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                                <path d="m14 7 3 3" />
                                <path d="M5 6v4" />
                                <path d="M19 14v4" />
                                <path d="M10 2v2" />
                                <path d="M7 8H3" />
                                <path d="M21 16h-4" />
                                <path d="M11 3H9" />
                            </svg>
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Quick Create</h3>
                            <p className="card-description">
                                Upload one image. Get 80+ campaign variants instantly.
                            </p>
                        </div>
                        <div className="card-badge">AI Powered</div>
                        <span className="card-arrow">→</span>
                    </button>

                    {/* Guided Mode */}
                    <button
                        onClick={() => onNavigate('guided')}
                        className="workflow-card"
                    >
                        <div className="card-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                <path d="m15 5 3 3" />
                            </svg>
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Guided Mode</h3>
                            <p className="card-description">
                                Step-by-step wizard for compliant creatives.
                            </p>
                        </div>
                        <span className="card-arrow">→</span>
                    </button>

                    {/* Pro Editor */}
                    <button
                        onClick={() => onNavigate('editor')}
                        className="workflow-card"
                    >
                        <div className="card-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="2" />
                                <path d="M7 2v20" />
                                <path d="M17 2v20" />
                                <path d="M2 12h20" />
                                <path d="M2 7h5" />
                                <path d="M2 17h5" />
                                <path d="M17 7h5" />
                                <path d="M17 17h5" />
                            </svg>
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Pro Editor</h3>
                            <p className="card-description">
                                Full canvas control with layers and tools.
                            </p>
                        </div>
                        <span className="card-arrow">→</span>
                    </button>
                </section>

                {/* Secondary actions */}
                <section className="dashboard-secondary">
                    <button
                        onClick={() => onNavigate('gallery')}
                        className="secondary-link"
                    >
                        View Gallery
                    </button>
                    <span className="secondary-divider">•</span>
                    <button
                        onClick={() => onNavigate('templates')}
                        className="secondary-link"
                    >
                        Browse Templates
                    </button>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
