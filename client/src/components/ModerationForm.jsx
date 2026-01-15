import { useState } from 'react'
import { moderateContent } from '../services/api'
import { Type, User, MessageSquare, BookOpen, FileText, ChevronDown, Sparkles } from 'lucide-react'

function ModerationForm({ onResult, onLoading }) {
    const [formData, setFormData] = useState({
        characterList: '', personaList: '', firstMessage: '',
        promptPlot: '', plotSummary: '', promptGuideline: '',
        reminder: '', changeLog: '', contentId: '', contentType: 'character'
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        const fullContent = buildContentString(formData)

        if (!fullContent.trim()) {
            alert('Please fill in at least one content field')
            return
        }

        onLoading(true)
        try {
            const contentId = formData.contentId || `char-${Date.now()}`
            const result = await moderateContent({
                content: fullContent,
                contentId,
                contentType: formData.contentType,
                context: { hasFirstMessage: !!formData.firstMessage }
            })
            onResult(result.data)
        } catch (error) {
            onResult({ error: true, message: error.response?.data?.error || error.message })
        } finally {
            onLoading(false)
        }
    }

    const buildContentString = (data) => {
        let content = ''
        if (data.characterList) content += `Character List:\n${data.characterList}\n\n`
        if (data.personaList) content += `Persona List:\n${data.personaList}\n\n`
        if (data.firstMessage) content += `First Message:\n${data.firstMessage}\n\n`
        if (data.promptPlot) content += `Prompt Plot:\n${data.promptPlot}\n\n`
        if (data.plotSummary) content += `Plot Summary:\n${data.plotSummary}\n\n`
        if (data.promptGuideline) content += `Prompt Guideline:\n${data.promptGuideline}\n\n`
        if (data.reminder) content += `Reminder:\n${data.reminder}\n\n`
        if (data.changeLog) content += `Change Log:\n${data.changeLog}`
        return content.trim()
    }

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Inputs */}
            <div className="card-premium p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Content Type</label>
                    <div className="relative">
                        <select
                            value={formData.contentType}
                            onChange={(e) => updateField('contentType', e.target.value)}
                            className="input-premium appearance-none font-mono uppercase"
                        >
                            <option value="character">Character</option>
                            <option value="storyline">Storyline</option>
                            <option value="persona">Persona</option>
                            <option value="bot">Bot</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs uppercase text-text-secondary font-bold mb-2">Content ID</label>
                    <input
                        type="text"
                        value={formData.contentId}
                        onChange={(e) => updateField('contentId', e.target.value)}
                        className="input-premium font-mono"
                        placeholder="AUTO_GENERATED"
                    />
                </div>
            </div>

            {/* Main Content Fields */}
            <div className="grid grid-cols-1 gap-6">
                <div className="card-premium p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2 text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                        <User size={16} /> ENTITY DEFINITIONS
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <textarea
                            value={formData.characterList}
                            onChange={(e) => updateField('characterList', e.target.value)}
                            placeholder="Character List..."
                            className="input-premium h-32 resize-none font-mono text-xs"
                        />
                        <textarea
                            value={formData.personaList}
                            onChange={(e) => updateField('personaList', e.target.value)}
                            placeholder="Persona List..."
                            className="input-premium h-32 resize-none font-mono text-xs"
                        />
                    </div>
                </div>

                <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4 text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                        <MessageSquare size={16} /> INITIAL INTERACTION
                    </div>
                    <textarea
                        value={formData.firstMessage}
                        onChange={(e) => updateField('firstMessage', e.target.value)}
                        placeholder="Opening message sequence..."
                        className="input-premium h-40 font-mono text-xs"
                    />
                </div>

                <div className="card-premium p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2 text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                        <BookOpen size={16} /> NARRATIVE CONTEXT
                    </div>
                    <textarea
                        value={formData.promptPlot}
                        onChange={(e) => updateField('promptPlot', e.target.value)}
                        placeholder="Detailed plot structure..."
                        className="input-premium h-48 font-mono text-xs"
                    />
                    <textarea
                        value={formData.plotSummary}
                        onChange={(e) => updateField('plotSummary', e.target.value)}
                        placeholder="Abstract / Summary..."
                        className="input-premium h-24 font-mono text-xs"
                    />
                </div>

                <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4 text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2">
                        <FileText size={16} /> CONSTRAINTS
                    </div>
                    <textarea
                        value={formData.promptGuideline}
                        onChange={(e) => updateField('promptGuideline', e.target.value)}
                        placeholder="Operational guidelines and logic boundaries..."
                        className="input-premium h-40 font-mono text-xs"
                    />
                </div>
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-6 z-10">
                <button
                    type="submit"
                    className="w-full bg-white text-black py-4 font-bold text-lg uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 border border-transparent hover:border-white shadow-none"
                >
                    <Sparkles size={15} fill="black" /> Moderation Check
                </button>
            </div>
        </form>
    )
}

export default ModerationForm
