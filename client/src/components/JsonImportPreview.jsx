import React from 'react';
import { Image as ImageIcon, Users, Tag, FileText, AlertTriangle, Check, X } from 'lucide-react';

const JsonImportPreview = ({ preview, isLoading }) => {
    if (!preview) return null;

    // Debug logging
    console.log('JsonImportPreview rendering:', preview);

    const isCharacter = preview.type === 'character';

    return (
        <div className="bg-bg-card border border-border-color p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase text-text-primary flex items-center gap-2">
                    <FileText size={14} className="text-blue-400" />
                    Preview: {isCharacter ? 'Character' : 'Storyline'}
                </h3>
                {preview.nsfw && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-bold uppercase">
                        NSFW
                    </span>
                )}
            </div>

            {/* Title & Status */}
            <div className="space-y-1">
                <p className="text-lg font-bold text-text-primary truncate">{preview.title || 'Untitled'}</p>
                <p className="text-xs text-text-secondary font-mono">
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
                        className="w-full h-32 object-cover rounded border border-border-color"
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
                    <div className="bg-bg-secondary p-3 border border-border-color">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <Users size={14} />
                            <span className="text-xs uppercase">Characters</span>
                        </div>
                        <p className="text-xl font-bold text-text-primary">{preview.characterCount ?? 0}</p>
                    </div>
                )}
                {!isCharacter && (
                    <div className="bg-bg-secondary p-3 border border-border-color">
                        <div className="flex items-center gap-2 text-purple-400 mb-1">
                            <Users size={14} />
                            <span className="text-xs uppercase">Personas</span>
                        </div>
                        <p className="text-xl font-bold text-text-primary">{preview.personaCount ?? 0}</p>
                    </div>
                )}
                <div className="bg-bg-secondary p-3 border border-border-color">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                        <Tag size={14} />
                        <span className="text-xs uppercase">Tags</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{preview.tagCount ?? 0}</p>
                </div>
                <div className="bg-bg-secondary p-3 border border-border-color">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <ImageIcon size={14} />
                        <span className="text-xs uppercase">Images</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{preview.imageCount ?? 0}</p>
                </div>
            </div>

            {/* Characters List (Only for Storylines) */}
            {!isCharacter && Array.isArray(preview.characters) && preview.characters.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-text-secondary uppercase">Characters</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {preview.characters.map((char, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between bg-bg-secondary px-3 py-2 border border-border-color text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    {char.hasAvatar ? (
                                        <Check size={12} className="text-green-400" />
                                    ) : (
                                        <X size={12} className="text-text-secondary" />
                                    )}
                                    <span className="text-text-primary font-medium">{char.name || 'Unnamed'}</span>
                                    {char.nsfw && (
                                        <span className="px-1 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase">
                                            NSFW
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-secondary">
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
                    <h4 className="text-xs font-bold text-text-secondary uppercase">Tags (Top 20)</h4>
                    <div className="flex flex-wrap gap-2">
                        {preview.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className={`px-2 py-1 text-xs font-mono border ${tag.nsfw
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : 'bg-bg-secondary border-border-color text-text-secondary'
                                    }`}
                            >
                                {tag.name}
                                {tag.type && <span className="text-text-secondary ml-1">({tag.type})</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Warning for large imports */}
            {(preview.estimatedTextLength || 0) > 50000 && (
                <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm">
                    <AlertTriangle size={16} />
                    <span>Large import detected. Some content may be truncated for AI analysis.</span>
                </div>
            )}
        </div>
    );
};

export default JsonImportPreview;
