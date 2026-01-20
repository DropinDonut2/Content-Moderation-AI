import React, { useState } from 'react';
import { Save, AlertTriangle, BookOpen, User, FileJson, Upload, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JsonImportPreview from '../components/JsonImportPreview';

const SubmitContent = () => {
    const navigate = useNavigate();
    const [contentType, setContentType] = useState('storyline'); // 'storyline', 'character', or 'json'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // JSON Import state
    const [jsonInput, setJsonInput] = useState('');
    const [jsonPreview, setJsonPreview] = useState(null);
    const [jsonError, setJsonError] = useState(null);
    const [includeImages, setIncludeImages] = useState(true);

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
        if (!importText) return;

        const newFormData = { ...formData };
        const sections = [
            { key: 'rawCharacterList', header: 'Character List:' },
            { key: 'rawPersonaList', header: 'Persona List:' },
            { key: 'firstMessage', header: 'First Message:' },
            { key: 'promptPlot', header: 'Prompt Plot:' },
            { key: 'plot', header: 'Plot:' },
            { key: 'plotSummary', header: 'Plot Summary:' },
            { key: 'promptGuideline', header: 'Guidelines:' },
            { key: 'promptGuideline', header: 'Prompt Guideline:' },
            { key: 'reminder', header: 'Reminder:' },
            { key: 'changeLog', header: 'Change Log:' },
            { key: 'description', header: 'Description:' },
            { key: 'descriptionSummary', header: 'Description Summary:' },
            { key: 'promptDescription', header: 'Prompt Description:' },
            { key: 'exampleDialogue', header: 'Example Dialogue:' },
            { key: 'avatar', header: 'Avatar:' },
            { key: 'avatar', header: 'Media:' },
            { key: 'title', header: 'Character Name:' },
            { key: 'title', header: 'Name:' }
        ];

        // Normalize new lines
        const cleanDump = importText.replace(/\r\n/g, '\n');

        // Find headers
        const foundHeaders = [];
        sections.forEach(sec => {
            const index = cleanDump.indexOf(sec.header);
            if (index !== -1) {
                foundHeaders.push({ ...sec, index });
            }
        });

        // Heuristic: If content starts before any header, assume it is the Title (if short enough)
        foundHeaders.sort((a, b) => a.index - b.index);

        if (foundHeaders.length > 0 && foundHeaders[0].index > 0) {
            const potentialTitle = cleanDump.substring(0, foundHeaders[0].index).trim();
            if (potentialTitle && potentialTitle.length < 100) {
                newFormData.title = potentialTitle;
            }
        }

        foundHeaders.forEach((header, i) => {
            const start = header.index + header.header.length;
            const nextHeader = foundHeaders[i + 1];
            const end = nextHeader ? nextHeader.index : cleanDump.length;

            const content = cleanDump.substring(start, end).trim();
            if (content) {
                newFormData[header.key] = content;
            }
        });

        setFormData(newFormData);
        setImportText('');
        // We could add a toast here, but for now we just clear the box
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
                name: formData.title, // 'title' input maps to 'name' for characters
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
                    <button
                        onClick={() => setContentType('json')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-all ${contentType === 'json'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-text-secondary hover:text-white'
                            }`}
                    >
                        <FileJson size={16} />
                        JSON Import
                    </button>
                </div>
            </div>

            {/* JSON Import Section */}
            {contentType === 'json' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-bg-card border border-white/10 p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                                <FileJson size={14} className="text-blue-400" />
                                Paste Full JSON
                            </h3>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeImages}
                                        onChange={(e) => setIncludeImages(e.target.checked)}
                                        className="w-4 h-4 accent-white"
                                    />
                                    Analyze Images
                                </label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setJsonError(null);
                                        setJsonPreview(null);
                                        try {
                                            const parsed = JSON.parse(jsonInput);
                                            const response = await fetch('/api/v1/content/preview-json', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(parsed)
                                            });
                                            const result = await response.json();
                                            if (result.success) {
                                                setJsonPreview(result.preview);
                                            } else {
                                                setJsonError(result.error || 'Failed to parse JSON');
                                            }
                                        } catch (err) {
                                            setJsonError(err.message || 'Invalid JSON format');
                                        }
                                    }}
                                    disabled={!jsonInput.trim()}
                                    className="text-xs bg-zinc-700 text-white px-3 py-1 font-bold uppercase hover:bg-zinc-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                    <Eye size={12} />
                                    Preview
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary font-mono">
                            Paste the full JSON export (Isekai Zero format). Supports storylines with characterSnapshots, personaSnapshots, and tagSnapshots.
                        </p>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                setJsonPreview(null);
                                setJsonError(null);
                            }}
                            className="input-premium h-64 font-mono text-xs w-full bg-black/50"
                            placeholder={`{\n  "code": 200,\n  "status": "success",\n  "data": {\n    "title": "Your Storyline",\n    "characterSnapshots": [...],\n    "tagSnapshots": [...]\n  }\n}`}
                        />
                    </div>

                    {jsonError && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 flex items-center gap-3">
                            <AlertTriangle size={20} />
                            <span>{jsonError}</span>
                        </div>
                    )}

                    {/* Preview Component */}
                    <JsonImportPreview preview={jsonPreview} isLoading={isLoading} />

                    {/* Submit Button */}
                    {jsonPreview && (
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={async () => {
                                    setIsLoading(true);
                                    setJsonError(null);
                                    try {
                                        const parsed = JSON.parse(jsonInput);
                                        const response = await fetch(`/api/v1/content/import-json?includeImages=${includeImages}`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(parsed)
                                        });
                                        const result = await response.json();
                                        if (result.success) {
                                            navigate('/moderate');
                                        } else {
                                            setJsonError(result.error || 'Failed to import JSON');
                                        }
                                    } catch (err) {
                                        setJsonError(err.message || 'Import failed');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                className="btn-primary-new flex items-center gap-2 px-8 py-3"
                            >
                                {isLoading ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Upload size={20} />
                                )}
                                Import & Moderate
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry Form (hidden when JSON mode) */}
            {contentType !== 'json' && (
                <>
                    {/* Smart Import Section */}
                    <div className="bg-bg-card border border-white/10 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                                <BookOpen size={14} className="text-green-500" />
                                Smart Content Import
                            </h3>
                            <button
                                type="button"
                                onClick={parseContentDump}
                                className="text-xs bg-white text-black px-3 py-1 font-bold uppercase hover:bg-gray-200 transition-colors"
                            >
                                Parse & Fill
                            </button>
                        </div>
                        <p className="text-xs text-text-secondary font-mono">
                            Paste your content dump here. We support headers like "Character List:", "First Message:", "Plot:", etc.
                        </p>
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="input-premium h-24 font-mono text-xs w-full bg-black/50"
                            placeholder={`Example format:\n\nCharacter List:\nAlice, Bob...\n\nPlot:\nThe story begins...`}
                        />
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
                </>
            )}
        </div>
    );
};

export default SubmitContent;
