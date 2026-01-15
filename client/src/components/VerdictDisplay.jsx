import { CheckCircle2, AlertTriangle, XCircle, Shield, Clock } from 'lucide-react'

function VerdictDisplay({ result }) {
    if (!result) return null

    if (result.error) {
        return (
            <div className="card-premium p-6 border-red-500/50 bg-red-500/5">
                <h3 className="text-red-500 font-bold text-lg mb-2 flex items-center gap-2">
                    <XCircle size={20} /> SYSTEM_ERROR
                </h3>
                <p className="text-red-400 font-mono text-sm">{result.message}</p>
            </div>
        )
    }

    const verdictConfig = {
        safe: { color: 'text-green-400', border: 'border-green-500', icon: <CheckCircle2 size={48} /> },
        flagged: { color: 'text-amber-400', border: 'border-amber-500', icon: <AlertTriangle size={48} /> },
        rejected: { color: 'text-red-500', border: 'border-red-500', icon: <XCircle size={48} /> }
    }

    const config = verdictConfig[result.verdict] || verdictConfig['flagged']

    return (
        <div className={`card-premium relative border-t-4 ${config.border}`}>

            {/* Header */}
            <div className="p-8 border-b border-white/10 bg-white/5">
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 ${config.color}`}>
                        {config.icon}
                    </div>
                    <h2 className={`text-3xl font-bold uppercase tracking-widest ${config.color} mb-6`}>
                        {result.verdict}
                    </h2>

                    <div className="grid grid-cols-2 w-full gap-4 border-t border-white/10 pt-6">
                        <div className="text-center">
                            <div className="text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Confidence</div>
                            <div className={`text-xl font-bold font-mono ${config.color}`}>
                                {(result.confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-[10px] uppercase text-text-secondary font-bold tracking-widest mb-1">Latency</div>
                            <div className="text-xl font-bold font-mono text-white flex items-center justify-center gap-2">
                                <Clock size={16} className="text-text-secondary" />
                                {result.responseTime}ms
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-6">
                {result.policyViolated && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-3 border-b border-red-500/20 pb-2">
                            <Shield size={16} className="text-red-500" />
                            <span className="text-red-500 font-bold uppercase text-xs tracking-widest">Policy Violation Detected</span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xs px-2 py-1 bg-red-500 text-black font-bold">
                                {result.policyViolated.policyId}
                            </span>
                            <span className="font-bold text-white uppercase">{result.policyViolated.title}</span>
                        </div>
                        <p className="text-sm text-text-secondary font-mono leading-relaxed">{result.policyViolated.description}</p>
                    </div>
                )}

                <div>
                    <div className="text-xs uppercase text-text-secondary font-bold tracking-widest mb-3 border-b border-white/10 pb-1">Analysis Log</div>
                    <div className="p-4 bg-black border border-white/10 text-sm leading-relaxed text-text-primary font-mono whitespace-pre-wrap">
                        {'> ' + result.reasoning.replace(/\n/g, '\n> ')}
                    </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between text-[10px] text-text-secondary font-mono uppercase tracking-widest">
                    <span>MODEL: {result.aiModel.toUpperCase()}</span>
                    <span>ID: {result.moderationId.slice(-8)}</span>
                </div>
            </div>
        </div>
    )
}

export default VerdictDisplay
