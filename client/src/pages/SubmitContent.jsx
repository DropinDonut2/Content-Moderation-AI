import React, { useState } from 'react';
import { Save, AlertTriangle, BookOpen, User } from 'lucide-react';
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

    const [importText, setImportText] = useState('');

    const parseContentDump = () => {
        if (!importText.trim()) return;

        const newFormData = { ...formData };
        
        const sections = [
            { key: 'title', headers: ['Title:', 'Name:', 'Character Name:', 'Storyline Title:'] },
            { key: 'rawCharacterList', headers: ['Character List:', 'Characters:', 'Char List:'] },
            { key: 'rawPersonaList', headers: ['Persona List:', 'Personas:', 'Persona:'] },
            { key: 'firstMessage', headers: ['First Message:', 'Opening:', 'Greeting:', 'Initial Message:'] },
            { key: 'promptPlot', headers: ['Prompt Plot:', 'Plot Prompt:'] },
            { key: 'plot', headers: ['Plot:', 'Story:', 'Scenario:'] },
            { key: 'plotSummary', headers: ['Plot Summary:', 'Summary:', 'Story Summary:'] },
            { key: 'promptGuideline', headers: ['Guidelines:', 'Prompt Guideline:', 'Prompt Guidelines:', 'Guideline:'] },
            { key: 'reminder', headers: ['Reminder:', 'Reminders:', 'Note:', 'Notes:'] },
            { key: 'changeLog', headers: ['Change Log:', 'Changelog:', 'Changes:', 'Version History:'] },
            { key: 'description', headers: ['Description:', 'Desc:', 'Bio:', 'Biography:'] },
            { key: 'descriptionSummary', headers: ['Description Summary:', 'Short Description:', 'Summary:'] },
            { key: 'promptDescription', headers: ['Prompt Description:', 'System Prompt:', 'Prompt:'] },
            { key: 'exampleDialogue', headers: ['Example Dialogue:', 'Example Dialog:', 'Dialogue:', 'Dialog:', 'Sample Dialogue:', 'Examples:'] },
            { key: 'avatar', headers: ['Avatar:', 'Media:', 'Image:', 'Cover:', 'Cover URL:', 'Image URL:', 'Avatar URL:'] },
        ];

        const cleanDump = importText.replace(/\r\n/g, '\n');

        const foundHeaders = [];
        sections.forEach(sec => {
            sec.headers.forEach(header => {
                const lowerDump = cleanDump.toLowerCase();
                const lowerHeader = header.toLowerCase();
                const index = lowerDump.indexOf(lowerHeader);
                
                if (index !== -1) {
                    foundHeaders.push({ 
                        key: sec.key, 
                        header: header,
                        index: index,
                        headerLength: header.length
                    });
                }
            });
        });

        const seenKeys = new Set();
        const uniqueHeaders = foundHeaders
            .sort((a, b) => a.index - b.index)
            .filter(h => {
                if (seenKeys.has(h.key)) return false;
                seenKeys.add(h.key);
                return true;
            });

        uniqueHeaders.sort((a, b) => a.index - b.index);

        if (uniqueHeaders.length > 0 && uniqueHeaders[0].index > 0) {
            const potentialTitle = cleanDump.substring(0, uniqueHeaders[0].index).trim();
            if (potentialTitle && potentialTitle.length < 100 && !newFormData.title) {
                newFormData.title = potentialTitle;
            }
        }

        uniqueHeaders.forEach((header, i) => {
            const start = header.index + header.headerLength;
            const nextHeader = uniqueHeaders[i + 1];
            const end = nextHeader ? nextHeader.index : cleanDump.length;

            const content = cleanDump.substring(start, end).trim();
            if (content) {
                newFormData[header.key] = content;
            }
        });

        setFormData(newFormData);
        setImportText('');
        
        console.log('Parsed fields:', Object.keys(newFormData).filter(k => newFormData[k]));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (!formData.title) throw new Error("Title/Name is required");

            const endpoint = contentType === 'storyline'
                ? '/api/v1/content/storylines'
                : '/api/v1/content/characters';

            const payload = {
                ...formData,
                name: formData.title,
                user: 'manual_admin',
                visibility: 'private',
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
            <div className="flex items-center justify-between pb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tighter">Submit Content</h1>
                    <p className="font-mono text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>// MANUAL_ENTRY: {contentType.toUpperCase()}</p>
                </div>

                {/* Type Toggle */}
                <div className="flex p-1 rounded-none" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setContentType('storyline')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all"
                        style={{
                            backgroundColor: contentType === 'storyline' ? 'var(--accent-primary)' : 'transparent',
                            color: contentType === 'storyline' ? 'var(--bg-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        <BookOpen size={16} />
                        Storyline
                    </button>
                    <button
                        onClick={() => setContentType('character')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all"
                        style={{
                            backgroundColor: contentType === 'character' ? 'var(--accent-primary)' : 'transparent',
                            color: contentType === 'character' ? 'var(--bg-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        <User size={16} />
                        Character
                    </button>
                </div>
            </div>

            {/* Smart Import Section */}
            <div className="card-premium p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase flex items-center gap-2">
                        <BookOpen size={14} className="text-green-500" />
                        Smart Content Import
                    </h3>
                    <button
                        type="button"
                        onClick={parseContentDump}
                        className="btn-primary-new text-xs px-3 py-1"
                    >
                        Parse & Fill
                    </button>
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    Paste your content dump here. We support headers like "Character List:", "First Message:", "Plot:", "Title:", "Name:", etc. (case-insensitive)
                </p>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="input-premium h-24 font-mono text-xs w-full"
                    placeholder={`Example format:\n\nTitle:\nMy Amazing Story\n\nCharacter List:\nAlice, Bob...\n\nPlot:\nThe story begins...`}
                />
            </div>

            {error && (
                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--rejected-bg)', border: '1px solid var(--rejected-border)', color: 'var(--rejected-text)' }}>
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* --- SHARED BASICS --- */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold pl-3 uppercase" style={{ borderLeft: '2px solid var(--accent-primary)' }}>Basics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
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
                            <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
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
                            <h3 className="text-lg font-bold pl-3 uppercase" style={{ borderLeft: '2px solid var(--accent-primary)' }}>Story Details</h3>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Description</label>
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
                            <h3 className="text-lg font-bold pl-3 uppercase" style={{ borderLeft: '2px solid var(--accent-primary)' }}>Plot & Context</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Plot Summary</label>
                                    <textarea
                                        name="plotSummary"
                                        value={formData.plotSummary}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Full Plot</label>
                                    <textarea
                                        name="plot"
                                        value={formData.plot}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Prompt Plot</label>
                                    <textarea
                                        name="promptPlot"
                                        value={formData.promptPlot}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>First Message</label>
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
                            <h3 className="text-lg font-bold pl-3 uppercase" style={{ borderLeft: '2px solid var(--accent-primary)' }}>Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Character List</label>
                                    <textarea
                                        name="rawCharacterList"
                                        value={formData.rawCharacterList}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Persona List</label>
                                    <textarea
                                        name="rawPersonaList"
                                        value={formData.rawPersonaList}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Guidelines</label>
                                    <textarea
                                        name="promptGuideline"
                                        value={formData.promptGuideline}
                                        onChange={handleChange}
                                        className="input-premium h-24 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Change Log</label>
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
                            <h3 className="text-lg font-bold pl-3 uppercase" style={{ borderLeft: '2px solid var(--accent-primary)' }}>Character Profile</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Description</label>
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
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Description Summary</label>
                                    <textarea
                                        name="descriptionSummary"
                                        value={formData.descriptionSummary}
                                        onChange={handleChange}
                                        className="input-premium h-32 font-mono text-sm"
                                        placeholder="Short summary..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Prompt Description</label>
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
                                <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Example Dialogue</label>
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
                <div className="card-premium flex items-center gap-4 p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="nsfw"
                            checked={formData.nsfw}
                            onChange={handleChange}
                            className="w-5 h-5"
                            style={{ accentColor: 'var(--accent-primary)' }}
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