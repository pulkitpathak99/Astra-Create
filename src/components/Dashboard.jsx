import React from 'react';

export function Dashboard({ onNavigate }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0d12] to-[#0a0d12]">
            {/* Hero Section */}
            <div className="text-center mb-12 animate-slide-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
                    ✨ AI-Powered Creative Studio
                </div>
                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                    Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Tesco Campaigns</span><br />
                    in Seconds
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Choose your workflow: let AI do the heavy lifting, follow a guided path, or design pixel-perfect creatives manually.
                </p>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12 animate-slide-in-up" style={{ animationDelay: '100ms' }}>

                {/* Magic Wand Card */}
                <button
                    onClick={() => onNavigate('magic-wand')}
                    className="group relative p-8 rounded-2xl bg-[#12161c] border border-white/5 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10 text-left overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                            🪄
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Magic Wand</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Autonomous creation. Upload one product image and get 80+ campaign variants instantly.
                        </p>
                        <div className="mt-6 flex items-center text-orange-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Start Autonomous Mode →
                        </div>
                    </div>
                </button>

                {/* Guided Mode Card */}
                <button
                    onClick={() => onNavigate('guided')}
                    className="group relative p-8 rounded-2xl bg-[#12161c] border border-white/5 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 text-left overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                            🎯
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Guided Mode</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Step-by-step wizard. Perfect for non-experts to build compliant creatives in minutes.
                        </p>
                        <div className="mt-6 flex items-center text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Start Guided Wizard →
                        </div>
                    </div>
                </button>

                {/* Pro Editor Card */}
                <button
                    onClick={() => onNavigate('editor')}
                    className="group relative p-8 rounded-2xl bg-[#12161c] border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 text-left overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                            🎨
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Pro Editor</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Full control. Access the complete canvas editor with advanced tools and layers.
                        </p>
                        <div className="mt-6 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Open Editor →
                        </div>
                    </div>
                </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-4 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                <button onClick={() => onNavigate('gallery')} className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                    📸 View Demo Gallery
                </button>
                <button onClick={() => onNavigate('templates')} className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                    📁 Browse Templates
                </button>
            </div>
        </div>
    );
}

export default Dashboard;
