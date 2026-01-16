import React, { useState } from 'react';
import { Save, AlertTriangle, Check, BookOpen, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubmitContent = () => {
    const navigate = useNavigate();
    const [contentType, setContentType] = useState('storyline'); // 'storyline' or 'character'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Unified form state
    const [formData, setFormData] = useState({
        // Common
        title: '', // name for character
        description: '',
        nsfw: false,

        // Storyline Specific
        rawCharacterList: '',
        rawPersonaList: '',
        firstMessage: '',
        promptPlot: '',
        plot: '',
        plotSummary: '',
        promptGuideline: '',
        reminder: '',
        changeLog: '',

        // Character Specific
        descriptionSummary: '',
        promptDescription: '',
        exampleDialogue: '',
        avatar: '' // Media
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Basic validation
            if (!formData.title) throw new Error("Title/Name is required");

            const endpoint = contentType === 'storyline'
                ? '/api/v1/content/storylines'
                : '/api/v1/content/characters';

            const payload = {
                ...formData,
                // Map common fields if necessary
                name: formData.title, // 'title' input maps to 'name' for characters

                // Defaults
                user: 'manual_admin',
                visibility: 'private',
                // Generate temporary IDs based on type
                storylineId: contentType === 'storyline' ? `story_${Date.now()}` : undefined,
                characterId: contentType === 'character' ? `char_${Date.now()}` : undefined,
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit content');
            }

            const result = await response.json();

            if (result.success) {
                navigate('/moderate');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tighter">Submit Content</h1>
                    <p className="text-text-secondary font-mono text-sm mt-1">// MANUAL_ENTRY: {contentType.toUpperCase()}</p>
                </div>

                {/* Type Toggle */}
                <div className="flex bg-bg-secondary border border-white/10 p-1 rounded-none">
                    <button
                        onClick={() => setContentType('storyline')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all ${contentType === 'storyline'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-text-secondary hover:text-white'
                            }`}
                    >
                        <BookOpen size={16} />
                        Storyline
                    </button>
                    <button
                        onClick={() => setContentType('character')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all ${contentType === 'character'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-text-secondary hover:text-white'
                            }`}
                    >
                        <User size={16} />
                        Character
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 flex items-center gap-3">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* --- SHARED BASICS --- */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-l-2 border-white pl-3 uppercase">Basics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">
                                {contentType === 'storyline' ? 'Title' : 'Name'} *
                            </label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="input-premium"
                                placeholder={contentType === 'storyline' ? "Storyline Title..." : "Character Name..."}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">
                                {contentType === 'character' ? 'Avatar URL (Media)' : 'Cover URL'}
                            </label>
                            <input
                                name="avatar"
                                value={formData.avatar}
                                onChange={handleChange}
                                className="input-premium"
                                placeholder="https://example.com/image.png"
                            />
                        </div>
                    </div>
                </div>

                {/* --- STORYLINE SPECIFIC --- */}
                {contentType === 'storyline' && (
                    <>
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold border-l-2 border-white pl-3 uppercase">Story Details</h3>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="input-premium h-24 font-mono text-sm"
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold border-l-2 border-white pl-3 uppercase">Plot & Context</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Plot Summary</label>
                                    <textarea
                                        name="plotSummary"
                                        value={formData.plotSummary}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Full Plot</label>
                                    <textarea
                                        name="plot"
                                        value={formData.plot}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Prompt Plot</label>
                                    <textarea
                                        name="promptPlot"
                                        value={formData.promptPlot}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">First Message</label>
                                    <textarea
                                        name="firstMessage"
                                        value={formData.firstMessage}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold border-l-2 border-white pl-3 uppercase">Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Character List</label>
                                    <textarea
                                        name="rawCharacterList"
                                        value={formData.rawCharacterList}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Persona List</label>
                                    <textarea
                                        name="rawPersonaList"
                                        value={formData.rawPersonaList}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Guidelines</label>
                                    <textarea
                                        name="promptGuideline"
                                        value={formData.promptGuideline}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Change Log</label>
                                    <textarea
                                        name="changeLog"
                                        value={formData.changeLog}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- CHARACTER SPECIFIC --- */}
                {contentType === 'character' && (
                    <>
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold border-l-2 border-white pl-3 uppercase">Character Profile</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="input-premium h-32 font-mono text-sm"
                                    placeholder="Full character description..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Description Summary</label>
                                    <textarea
                                        name="descriptionSummary"
                                        value={formData.descriptionSummary}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                        placeholder="Short summary..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase">Prompt Description</label>
                                    <textarea
                                        name="promptDescription"
                                        value={formData.promptDescription}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                        placeholder="Technical prompt description..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase">Example Dialogue</label>
                                <textarea
                                    name="exampleDialogue"
                                    value={formData.exampleDialogue}
                                    onChange={handleChange}
                                    className="input-premium h-48 font-mono text-sm"
                                    placeholder="<User>: Hello&#10;<Char>: Hi there!"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Flags */}
                <div className="flex items-center gap-4 border border-white/10 p-4 bg-bg-card">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="nsfw"
                            checked={formData.nsfw}
                            onChange={handleChange}
                            className="w-5 h-5 accent-white"
                        />
                        <span className="font-bold uppercase text-sm">NSFW Content</span>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary-new flex items-center gap-2 px-8 py-3"
                    >
                        {isLoading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Save size={20} />
                        )}
                        Submit {contentType === 'storyline' ? 'Storyline' : 'Character'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubmitContent;
