import React from 'react';
import { Image as ImageIcon, Users, Tag, FileText, AlertTriangle, Check, X } from 'lucide-react';

const JsonImportPreview = ({ preview, isLoading }) => {
    if (!preview) return null;

    // Debug logging
    console.log('JsonImportPreview rendering:', preview);

    const isCharacter = preview.type === 'character';

    return (
        <div
            className="p-4 space-y-4 animate-fade-in rounded-md"
            style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)'
            }}
        >
            <div className="flex items-center justify-between">
                <h3
                    className="text-sm font-bold uppercase flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                >
                    <FileText size={14} className="text-blue-400" />
                    Preview: {isCharacter ? 'Character' : 'Storyline'}
                </h3>
                {preview.nsfw && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-bold uppercase rounded">
                        NSFW
                    </span>
                )}
            </div>

            {/* Title & Status */}
            <div className="space-y-1">
                <p
                    className="text-lg font-bold truncate"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {preview.title || 'Untitled'}
                </p>
                <p
                    className="text-xs font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    STATUS: {preview.status || 'unknown'} |
                    EST. TEXT: {(Number(preview.estimatedTextLength || 0) / 1000).toFixed(1)}k chars
                </p>
            </div>

            {/* Cover Preview */}
            {preview.hasCover && preview.coverUrl && (
                <div className="relative">
                    <img
                        src={preview.coverUrl}
                        alt="Cover preview"
                        className="w-full h-32 object-cover rounded"
                        style={{ border: '1px solid var(--border-color)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-xs text-white rounded">
                        Cover Image
                    </span>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {!isCharacter && (
                    <div
                        className="p-3 rounded"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <Users size={14} />
                            <span className="text-xs uppercase">Characters</span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {preview.characterCount ?? 0}
                        </p>
                    </div>
                )}
                {!isCharacter && (
                    <div
                        className="p-3 rounded"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-2 text-purple-400 mb-1">
                            <Users size={14} />
                            <span className="text-xs uppercase">Personas</span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {preview.personaCount ?? 0}
                        </p>
                    </div>
                )}
                <div
                    className="p-3 rounded"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                        <Tag size={14} />
                        <span className="text-xs uppercase">Tags</span>
                    </div>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {preview.tagCount ?? 0}
                    </p>
                </div>
                <div
                    className="p-3 rounded"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <ImageIcon size={14} />
                        <span className="text-xs uppercase">Images</span>
                    </div>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {preview.imageCount ?? 0}
                    </p>
                </div>
            </div>

            {/* Characters List (Only for Storylines) */}
            {!isCharacter && Array.isArray(preview.characters) && preview.characters.length > 0 && (
                <div className="space-y-2">
                    <h4
                        className="text-xs font-bold uppercase"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Characters
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {preview.characters.map((char, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 rounded text-sm"
                                style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    {char.hasAvatar ? (
                                        <Check size={12} className="text-green-400" />
                                    ) : (
                                        <X size={12} style={{ color: 'var(--text-secondary)' }} />
                                    )}
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {char.name || 'Unnamed'}
                                    </span>
                                    {char.nsfw && (
                                        <span className="px-1 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase rounded">
                                            NSFW
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <span>{((char.descriptionLength || 0) / 1000).toFixed(1)}k chars</span>
                                    <span>{char.tagCount ?? 0} tags</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags Preview */}
            {Array.isArray(preview.tags) && preview.tags.length > 0 && (
                <div className="space-y-2">
                    <h4
                        className="text-xs font-bold uppercase"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Tags (Top 20)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {preview.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 text-xs font-mono border rounded"
                                style={{
                                    backgroundColor: tag.nsfw ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                                    borderColor: tag.nsfw ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)',
                                    color: tag.nsfw ? '#ef4444' : 'var(--text-secondary)'
                                }}
                            >
                                {tag.name}
                                {tag.type && <span className="opacity-70 ml-1">({tag.type})</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Warning for large imports */}
            {(preview.estimatedTextLength || 0) > 50000 && (
                <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm rounded">
                    <AlertTriangle size={16} />
                    <span>Large import detected. Some content may be truncated for AI analysis.</span>
                </div>
            )}
        </div>
    );
};

export default JsonImportPreview;
