import { useState } from 'react'
import ModerationForm from '../components/ModerationForm'
import VerdictDisplay from '../components/VerdictDisplay'
import { Sparkles, Terminal } from 'lucide-react'

function Moderate() {
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    return (
        <div className="animate-fade-in pb-10">
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">AI Moderation</h2>
                    <p className="text-text-secondary font-mono text-xs">// ANALYZE_CONTENT_SAFEGUARDS</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Section */}
                <div className="lg:col-span-8 relative z-10">
                    <ModerationForm
                        onResult={setResult}
                        onLoading={setLoading}
                    />

                    {loading && (
                        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-fade-in border border-white/10">
                            <div className="w-12 h-12 border-4 border-white border-t-transparent animate-spin mb-6"></div>
                            <p className="text-white font-mono text-sm uppercase tracking-widest animate-pulse">Processing Neural Request...</p>
                            <div className="mt-2 text-xs text-text-secondary font-mono">ESTIMATED TIME: 1200ms</div>
                        </div>
                    )}
                </div>

                {/* Result Sidebar */}
                <div className="lg:col-span-4 lg:sticky lg:top-8 transition-all duration-500 ease-in-out">
                    {result ? (
                        <VerdictDisplay result={result} />
                    ) : (
                        <div className="card-premium p-8 text-center min-h-[300px] flex flex-col items-center justify-center border-dashed border-white/20">
                            <div className="w-16 h-16 bg-white/5 rounded-none flex items-center justify-center mb-6">
                                <Terminal size={32} className="text-white opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">System Ready</h3>
                            <p className="text-text-secondary text-xs font-mono max-w-[200px] mb-8">
                                Awaiting input data stream for analysis protocol.
                            </p>

                            <div className="w-full space-y-3">
                                {['REAL-TIME SCORING', 'POLICY CITATION', 'REASONING ENGINE'].map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-[10px] text-text-secondary border border-white/10 p-2 bg-black uppercase tracking-widest">
                                        <span className="text-white font-bold">✓</span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Moderate
