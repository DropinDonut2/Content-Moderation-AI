import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { getModelTestModels, runModelTestBatch } from '../services/api'
import {
    Upload, Play, RotateCcw, Download, X, CheckCircle,
    AlertTriangle, XCircle, Clock, Zap, Image as ImageIcon,
    ChevronDown, ChevronUp, FlaskConical, Loader2, Info,
    SkipForward, TrendingUp, Filter, Eye, EyeOff, Save, FolderOpen
} from 'lucide-react'

// ============================================
// CONSTANTS
// ============================================
const MAX_IMAGES = 100
const DEFAULT_BATCH_SIZE = 5
const BATCH_SIZE_OPTIONS = [3, 5, 10]
const AUTO_RUN_DELAY_MS = 800
const STORAGE_KEY = 'modelTestSession'

// ============================================
// ACCENT COLOR (orange — matches other pages)
// ============================================
const ACCENT = '#f97316'
const ACCENT_DIM = 'rgba(249,115,22,0.12)'
const ACCENT_BORDER = 'rgba(249,115,22,0.35)'

// ============================================
// HELPERS
// ============================================
const generateId = () => Math.random().toString(36).slice(2, 10)

const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })

const verdictColor = (verdict) => {
    if (verdict === 'safe') return '#22c55e'
    if (verdict === 'flagged') return '#f59e0b'
    if (verdict === 'rejected') return '#ef4444'
    return '#6b7280'
}

const verdictBg = (verdict) => {
    if (verdict === 'safe') return 'rgba(34,197,94,0.12)'
    if (verdict === 'flagged') return 'rgba(245,158,11,0.12)'
    if (verdict === 'rejected') return 'rgba(239,68,68,0.12)'
    return 'rgba(107,114,128,0.12)'
}

const VerdictIcon = ({ verdict, size = 16 }) => {
    if (verdict === 'safe') return <CheckCircle size={size} color="#22c55e" />
    if (verdict === 'flagged') return <AlertTriangle size={size} color="#f59e0b" />
    if (verdict === 'rejected') return <XCircle size={size} color="#ef4444" />
    return <Clock size={size} color="#6b7280" />
}

const ConfidenceBar = ({ value, width = 80 }) => (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, width, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
            height: '100%',
            width: `${Math.round((value || 0) * 100)}%`,
            background: value > 0.7 ? '#22c55e' : value > 0.4 ? '#f59e0b' : '#ef4444',
            borderRadius: 4,
            transition: 'width 0.3s'
        }} />
    </div>
)

// ============================================
// LOCALSTORAGE HELPERS
// ============================================
const saveSession = (data) => {
    try {
        // Strip previewUrl (blob URLs don't survive refresh) and base64 (too large)
        const toSave = {
            results: Object.fromEntries(
                Object.entries(data.results).map(([k, v]) => {
                    const { previewUrl, ...rest } = v
                    return [k, rest]
                })
            ),
            batchHistory: data.batchHistory.map(b => ({
                ...b,
                results: b.results.map(r => {
                    const { previewUrl, ...rest } = r
                    return rest
                })
            })),
            log: data.log.slice(-100), // keep last 100 log entries
            batchIndex: data.batchIndex,
            selectedModel: data.selectedModel,
            savedAt: new Date().toISOString()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
        console.warn('ModelTest: Failed to save session to localStorage:', e.message)
    }
}

const loadSession = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw)
    } catch (e) {
        return null
    }
}

const clearSession = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) { /* ignore */ }
}

// ============================================
// COMPONENT: IMAGE THUMBNAIL CARD (compact)
// ============================================
function ImageCard({ img, result, onRemove }) {
    const statusColor = result
        ? verdictColor(result.verdict)
        : img.status === 'analyzing'
            ? '#3b82f6'
            : 'var(--text-muted)'

    const statusLabel = result
        ? result.verdict
        : img.status === 'analyzing'
            ? '…'
            : 'pending'

    return (
        <div style={{
            border: `1px solid ${result ? verdictColor(result.verdict) + '55' : 'var(--border-color)'}`,
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--bg-card)',
            position: 'relative',
            transition: 'border-color 0.2s'
        }}>
            <div style={{ position: 'relative', height: 80, background: 'var(--bg-secondary)' }}>
                {img.previewUrl ? (
                    <img
                        src={img.previewUrl}
                        alt={img.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <ImageIcon size={24} color="var(--text-muted)" />
                    </div>
                )}
                {img.status === 'analyzing' && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Loader2 size={20} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                )}
                <div style={{
                    position: 'absolute', bottom: 3, left: 3,
                    background: 'rgba(0,0,0,0.8)',
                    color: statusColor,
                    fontSize: 9,
                    fontFamily: 'monospace',
                    padding: '1px 5px',
                    borderRadius: 3,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 700
                }}>
                    {statusLabel}
                </div>
                {img.status === 'pending' && onRemove && (
                    <button
                        onClick={() => onRemove(img.id)}
                        style={{
                            position: 'absolute', top: 3, right: 3,
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none', borderRadius: '50%',
                            width: 18, height: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff'
                        }}
                    >
                        <X size={10} />
                    </button>
                )}
            </div>
            <div style={{ padding: '4px 6px' }}>
                <p style={{
                    fontSize: 9, color: 'var(--text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    margin: 0
                }} title={img.name}>{img.name}</p>
                {result && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <ConfidenceBar value={result.confidence} width={50} />
                        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {Math.round((result.confidence || 0) * 100)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================
// COMPONENT: RESULT ROW (expandable)
// ============================================
function ResultRow({ result, index }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <>
            <tr
                onClick={() => setExpanded(e => !e)}
                style={{
                    cursor: 'pointer',
                    background: expanded ? verdictBg(result.verdict) : 'transparent',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid var(--border-color)'
                }}
            >
                <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', width: 36 }}>
                    {index + 1}
                </td>
                <td style={{ padding: '8px 10px', maxWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {result.previewUrl && (
                            <img
                                src={result.previewUrl}
                                alt={result.name}
                                style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)', flexShrink: 0 }}
                            />
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.name}
                        </span>
                    </div>
                </td>
                <td style={{ padding: '8px 10px', width: 100 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20,
                        background: verdictBg(result.verdict),
                        border: `1px solid ${verdictColor(result.verdict)}44`,
                        color: verdictColor(result.verdict),
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8
                    }}>
                        <VerdictIcon verdict={result.verdict} size={11} />
                        {result.verdict}
                    </div>
                </td>
                <td style={{ padding: '8px 10px', width: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ConfidenceBar value={result.confidence} width={60} />
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {Math.round((result.confidence || 0) * 100)}%
                        </span>
                    </div>
                </td>
                <td style={{ padding: '8px 10px', width: 100 }}>
                    <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                    }}>
                        {result.imageStyle || '—'}
                    </span>
                </td>
                <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', width: 80 }}>
                    {result.issues?.length > 0
                        ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{result.issues.length} iss.</span>
                        : <span style={{ color: '#22c55e' }}>✓</span>
                    }
                </td>
                <td style={{ padding: '8px 10px', width: 80 }}>
                    {result.isCopyrighted
                        ? <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>©{result.copyrightSource ? ` ${result.copyrightSource.slice(0, 12)}` : ''}</span>
                        : <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>—</span>
                    }
                </td>
                <td style={{ padding: '8px 10px', width: 60 }}>
                    {result.elapsedMs
                        ? <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{(result.elapsedMs / 1000).toFixed(1)}s</span>
                        : '—'
                    }
                </td>
                <td style={{ padding: '8px 10px', width: 32 }}>
                    <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        onClick={e => { e.stopPropagation(); setExpanded(ex => !ex) }}
                    >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr style={{ background: verdictBg(result.verdict) }}>
                    <td colSpan={9} style={{ padding: '0 10px 14px 10px' }}>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 8, padding: 14, marginTop: 4
                        }}>
                            <div style={{ marginBottom: 10 }}>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 5px 0' }}>Reasoning</p>
                                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                                    {result.reasoning || 'No reasoning provided.'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: result.issues?.length ? 10 : 0 }}>
                                {[
                                    { label: 'Photorealistic', value: result.isPhotorealistic, bad: true },
                                    { label: 'AI-Generated', value: result.isAiGenerated, bad: false },
                                    { label: 'Minor Appearance', value: result.minorAppearance, bad: true },
                                    { label: 'Nudity', value: result.nudityDetected, bad: true },
                                    { label: 'Copyrighted', value: result.isCopyrighted, bad: true },
                                ].map(flag => (
                                    <div key={flag.label} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '2px 8px', borderRadius: 20,
                                        fontSize: 10, fontFamily: 'monospace',
                                        background: flag.value
                                            ? (flag.bad ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)')
                                            : 'var(--bg-secondary)',
                                        color: flag.value
                                            ? (flag.bad ? '#ef4444' : '#22c55e')
                                            : 'var(--text-muted)',
                                        border: `1px solid ${flag.value ? (flag.bad ? '#ef444433' : '#22c55e33') : 'var(--border-color)'}`
                                    }}>
                                        {flag.value ? (flag.bad ? <XCircle size={10} /> : <CheckCircle size={10} />) : <span style={{ width: 10 }} />}
                                        {flag.label}: <strong>{flag.value ? 'YES' : 'NO'}</strong>
                                    </div>
                                ))}
                            </div>
                            {result.issues?.length > 0 && (
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 6px 0' }}>Issues</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {result.issues.map((issue, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                                padding: '6px 10px', borderRadius: 6,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                                    padding: '2px 5px', borderRadius: 3,
                                                    background: issue.severity === 'critical' ? '#ef444420' :
                                                        issue.severity === 'high' ? '#f9731620' :
                                                            issue.severity === 'medium' ? '#f59e0b20' : '#6b728020',
                                                    color: issue.severity === 'critical' ? '#ef4444' :
                                                        issue.severity === 'high' ? '#f97316' :
                                                            issue.severity === 'medium' ? '#f59e0b' : '#6b7280',
                                                    flexShrink: 0
                                                }}>
                                                    {issue.severity}
                                                </span>
                                                <div>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                                        {issue.category}
                                                    </span>
                                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                                        {issue.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {result.isCopyrighted && result.copyrightSource && (
                                <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <p style={{ margin: 0, fontSize: 11, color: '#f59e0b' }}>
                                        ⚠ Possible copyright: <strong>{result.copyrightSource}</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

// ============================================
// COMPONENT: BATCH HISTORY ITEM
// ============================================
function BatchHistoryItem({ batch }) {
    const [expanded, setExpanded] = useState(false)
    const safe = batch.results.filter(r => r.verdict === 'safe').length
    const flagged = batch.results.filter(r => r.verdict === 'flagged').length
    const rejected = batch.results.filter(r => r.verdict === 'rejected').length

    return (
        <div style={{
            border: '1px solid var(--border-color)', borderRadius: 8,
            background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 8
        }}>
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                    background: expanded ? 'var(--bg-secondary)' : 'transparent'
                }}
            >
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>
                    Batch {batch.batchNum}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', flex: 1 }}>
                    {batch.results.length} images
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    {safe > 0 && <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'monospace', fontWeight: 700 }}>✓{safe}</span>}
                    {flagged > 0 && <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>⚠{flagged}</span>}
                    {rejected > 0 && <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>✗{rejected}</span>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {batch.elapsedMs ? `${(batch.elapsedMs / 1000).toFixed(1)}s` : ''}
                </span>
                {expanded ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
            </div>
            {expanded && (
                <div style={{ padding: '0 14px 12px 14px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                        {batch.results.map((r, i) => (
                            <div key={r.id || i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '5px 8px', borderRadius: 5,
                                background: 'var(--bg-secondary)'
                            }}>
                                {r.previewUrl && (
                                    <img src={r.previewUrl} alt={r.name}
                                        style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                                )}
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.name}
                                </span>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    padding: '1px 6px', borderRadius: 10,
                                    background: verdictBg(r.verdict),
                                    color: verdictColor(r.verdict),
                                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase'
                                }}>
                                    <VerdictIcon verdict={r.verdict} size={9} />
                                    {r.verdict}
                                </div>
                                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', width: 30, textAlign: 'right' }}>
                                    {Math.round((r.confidence || 0) * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================
// MAIN PAGE
// ============================================
export default function ModelTest() {
    // ── Load persisted session ──
    const savedSession = useMemo(() => loadSession(), [])

    // ── State ──
    const [images, setImages] = useState([])       // { id, name, base64, previewUrl, status }
    const [results, setResults] = useState(() => savedSession?.results || {})
    const [batchHistory, setBatchHistory] = useState(() => savedSession?.batchHistory || [])
    const [models, setModels] = useState([])
    const [selectedModel, setSelectedModel] = useState(() => savedSession?.selectedModel || 'anthropic/claude-sonnet-4-20250514')
    const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE)
    const [isRunning, setIsRunning] = useState(false)
    const [autoRun, setAutoRun] = useState(false)
    const [batchIndex, setBatchIndex] = useState(() => savedSession?.batchIndex || 0)
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState(null)
    const [log, setLog] = useState(() => savedSession?.log || [])
    const [showImageGrid, setShowImageGrid] = useState(true)
    const [resultFilter, setResultFilter] = useState('all')
    const [resultPage, setResultPage] = useState(1)
    const RESULTS_PER_PAGE = 20

    // ── Refs (avoid stale closures in async loops) ──
    const fileInputRef = useRef(null)
    const importJsonRef = useRef(null)
    const autoRunRef = useRef(false)
    const logEndRef = useRef(null)
    const imagesRef = useRef(images)
    const resultsRef = useRef(results)
    const batchIndexRef = useRef(batchIndex)
    const batchSizeRef = useRef(batchSize)
    const selectedModelRef = useRef(selectedModel)
    const modelsRef = useRef(models)

    // Keep refs in sync with state
    useEffect(() => { imagesRef.current = images }, [images])
    useEffect(() => { resultsRef.current = results }, [results])
    useEffect(() => { batchIndexRef.current = batchIndex }, [batchIndex])
    useEffect(() => { batchSizeRef.current = batchSize }, [batchSize])
    useEffect(() => { selectedModelRef.current = selectedModel }, [selectedModel])
    useEffect(() => { modelsRef.current = models }, [models])

    // ── Persist session to localStorage whenever results/batchHistory/log/batchIndex change ──
    useEffect(() => {
        if (Object.keys(results).length === 0 && batchHistory.length === 0) return
        saveSession({ results, batchHistory, log, batchIndex, selectedModel })
    }, [results, batchHistory, log, batchIndex, selectedModel])

    // Load models on mount
    useEffect(() => {
        getModelTestModels()
            .then(data => setModels(data.models || []))
            .catch(() => setModels([
                { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Production)' },
                { id: 'openai/gpt-4o', name: 'GPT-4o' },
                { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
            ]))
    }, [])

    // Show restore notice if session was loaded
    const [showRestoreNotice, setShowRestoreNotice] = useState(() => {
        const s = loadSession()
        return s && Object.keys(s.results || {}).length > 0
    })

    const addLog = useCallback((msg, type = 'info') => {
        setLog(prev => [...prev.slice(-299), { msg, type, ts: new Date().toLocaleTimeString() }])
    }, [])

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [log])

    // ── UPLOAD ──
    const processFiles = useCallback(async (files) => {
        const currentImages = imagesRef.current
        const remaining = MAX_IMAGES - currentImages.length
        if (remaining <= 0) {
            setError(`Maximum ${MAX_IMAGES} images already loaded.`)
            return
        }
        const accepted = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .slice(0, remaining)

        if (Array.from(files).length > remaining) {
            setError(`Only the first ${remaining} image(s) were added (max ${MAX_IMAGES} total).`)
        }

        const newImages = await Promise.all(accepted.map(async (file) => {
            const base64 = await fileToBase64(file)
            return {
                id: generateId(),
                name: file.name,
                base64,
                previewUrl: URL.createObjectURL(file),
                status: 'pending'
            }
        }))

        setImages(prev => [...prev, ...newImages])
        addLog(`Added ${newImages.length} image(s). Total: ${currentImages.length + newImages.length}`)
        setError(null)
    }, [addLog])

    const onFileChange = (e) => { processFiles(e.target.files); e.target.value = '' }

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)
        processFiles(e.dataTransfer.files)
    }, [processFiles])

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
    const onDragLeave = () => setIsDragging(false)

    const removeImage = (id) => {
        setImages(prev => prev.filter(img => img.id !== id))
        setResults(prev => { const n = { ...prev }; delete n[id]; return n })
    }

    const clearAll = () => {
        setImages([])
        setResults({})
        setBatchHistory([])
        setBatchIndex(0)
        batchIndexRef.current = 0
        setLog([])
        setError(null)
        setResultPage(1)
        setShowRestoreNotice(false)
        autoRunRef.current = false
        setAutoRun(false)
        clearSession()
        addLog('Cleared all images and results.')
    }

    // ── RUN BATCH (uses refs to avoid stale closures) ──
    const runBatchCore = useCallback(async () => {
        const currentImages = imagesRef.current
        const currentResults = resultsRef.current
        const currentBatchIdx = batchIndexRef.current
        const currentBatchSize = batchSizeRef.current
        const currentModel = selectedModelRef.current
        const currentModels = modelsRef.current

        const analyzedIds = new Set(Object.keys(currentResults))
        const pending = currentImages.filter(img => !analyzedIds.has(img.id) && img.status !== 'analyzing')

        if (pending.length === 0) {
            addLog('✅ All images have been analyzed!', 'success')
            autoRunRef.current = false
            setAutoRun(false)
            setIsRunning(false)
            return false
        }

        const batch = pending.slice(0, currentBatchSize)
        const batchNum = currentBatchIdx + 1
        const batchStartTime = Date.now()

        addLog(`▶ Batch ${batchNum}: Analyzing ${batch.length} image(s) with ${currentModels.find(m => m.id === currentModel)?.name || currentModel}…`)

        // Mark images as analyzing (update both state and ref immediately)
        setImages(prev => prev.map(img =>
            batch.some(b => b.id === img.id) ? { ...img, status: 'analyzing' } : img
        ))
        imagesRef.current = imagesRef.current.map(img =>
            batch.some(b => b.id === img.id) ? { ...img, status: 'analyzing' } : img
        )

        try {
            const payload = batch.map(img => ({
                id: img.id,
                name: img.name,
                base64: img.base64
            }))

            const response = await runModelTestBatch(payload, currentModel, currentBatchIdx)

            if (!response.success) throw new Error(response.error || 'Batch failed')

            const batchElapsed = Date.now() - batchStartTime

            // Store results — use batch array for previewUrl (not stale images state)
            const newResults = {}
            for (const r of response.results) {
                const originalImg = batch.find(img => img.id === r.id)
                newResults[r.id] = { ...r, previewUrl: originalImg?.previewUrl }
            }

            setResults(prev => ({ ...prev, ...newResults }))
            // Update ref immediately for next iteration
            resultsRef.current = { ...resultsRef.current, ...newResults }

            // Mark images as done
            setImages(prev => prev.map(img =>
                batch.some(b => b.id === img.id) ? { ...img, status: 'done' } : img
            ))
            imagesRef.current = imagesRef.current.map(img =>
                batch.some(b => b.id === img.id) ? { ...img, status: 'done' } : img
            )

            // Record batch history
            const batchResultsWithPreviews = response.results.map(r => ({
                ...r,
                previewUrl: batch.find(img => img.id === r.id)?.previewUrl
            }))
            setBatchHistory(prev => [...prev, {
                batchNum,
                results: batchResultsWithPreviews,
                elapsedMs: batchElapsed,
                model: currentModel
            }])

            const safe = response.results.filter(r => r.verdict === 'safe').length
            const flagged = response.results.filter(r => r.verdict === 'flagged').length
            const rejected = response.results.filter(r => r.verdict === 'rejected').length
            addLog(`✓ Batch ${batchNum} done in ${(batchElapsed / 1000).toFixed(1)}s: ${safe} safe, ${flagged} flagged, ${rejected} rejected`, 'success')

            const nextIdx = currentBatchIdx + 1
            setBatchIndex(nextIdx)
            batchIndexRef.current = nextIdx

            return true

        } catch (err) {
            addLog(`✗ Batch ${batchNum} error: ${err.message}`, 'error')
            setError(err.message)
            setImages(prev => prev.map(img =>
                batch.some(b => b.id === img.id) ? { ...img, status: 'pending' } : img
            ))
            imagesRef.current = imagesRef.current.map(img =>
                batch.some(b => b.id === img.id) ? { ...img, status: 'pending' } : img
            )
            autoRunRef.current = false
            setAutoRun(false)
            return false
        }
    }, [addLog])

    const handleRunNext = async () => {
        if (isRunning) return
        setIsRunning(true)
        setError(null)
        await runBatchCore()
        setIsRunning(false)
    }

    // Auto-run loop — uses refs so no stale closure issues
    const handleAutoRun = () => {
        if (autoRun || isRunning) {
            autoRunRef.current = false
            setAutoRun(false)
            setIsRunning(false)
            addLog('⏹ Auto-run stopped.')
        } else {
            setAutoRun(true)
            setError(null)
            addLog('⚡ Auto-run started. Will run batches until all images are analyzed.')

            autoRunRef.current = true
            const loop = async () => {
                setIsRunning(true)
                while (autoRunRef.current) {
                    const hasMore = await runBatchCore()
                    if (!hasMore || !autoRunRef.current) break
                    await new Promise(r => setTimeout(r, AUTO_RUN_DELAY_MS))
                }
                setIsRunning(false)
                autoRunRef.current = false
                setAutoRun(false)
            }
            loop()
        }
    }

    // ── EXPORT ──
    // Exports the full session: results array + batch history + metadata
    const exportResults = () => {
        const resultArray = Object.values(results).map(r => {
            const { previewUrl, ...rest } = r
            return rest
        })
        const exportData = {
            exportedAt: new Date().toISOString(),
            model: selectedModel,
            totalResults: resultArray.length,
            summary: {
                safe: resultArray.filter(r => r.verdict === 'safe').length,
                flagged: resultArray.filter(r => r.verdict === 'flagged').length,
                rejected: resultArray.filter(r => r.verdict === 'rejected').length,
            },
            results: resultArray,
            batchHistory: batchHistory.map(b => ({
                ...b,
                results: b.results.map(r => { const { previewUrl, ...rest } = r; return rest })
            }))
        }
        // Build filename: modelname_YYYY-MM-DD_HH-MM.json
        const now = new Date()
        const modelShortName = (selectedModel.split('/').pop() || selectedModel)
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 40)
        const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-') // HH-MM
        const filename = `${modelShortName}_${dateStr}_${timeStr}.json`

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        addLog(`💾 Exported ${resultArray.length} results → ${filename}`, 'success')
    }

    // ── IMPORT JSON ──
    // Loads a previously exported session file — OVERWRITES current results
    const handleImportJson = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result)

                // Support both formats:
                // 1. New format: { results: [...], batchHistory: [...], ... }
                // 2. Old format: plain array [...]
                let resultArray = []
                let importedBatchHistory = []

                if (Array.isArray(parsed)) {
                    // Old format — plain array
                    resultArray = parsed
                } else if (parsed && Array.isArray(parsed.results)) {
                    // New format with metadata
                    resultArray = parsed.results
                    importedBatchHistory = parsed.batchHistory || []
                } else {
                    setError('Invalid file format. Expected a model-test export JSON.')
                    return
                }

                const valid = resultArray.filter(r => r && typeof r === 'object' && r.id && r.name && r.verdict)
                if (valid.length === 0) {
                    setError('No valid results found in the imported file.')
                    return
                }

                // OVERWRITE current results (not merge)
                const imported = {}
                for (const r of valid) {
                    imported[r.id] = { ...r, previewUrl: null }
                }
                setResults(imported)
                resultsRef.current = imported

                if (importedBatchHistory.length > 0) {
                    setBatchHistory(importedBatchHistory)
                }

                // Update batch index to match imported data
                const maxBatch = importedBatchHistory.length > 0
                    ? Math.max(...importedBatchHistory.map(b => b.batchNum))
                    : Math.ceil(valid.length / batchSizeRef.current)
                setBatchIndex(maxBatch)
                batchIndexRef.current = maxBatch

                // Clear images since we're loading from file (no image data)
                setImages([])
                imagesRef.current = []

                addLog(`📂 Loaded ${valid.length} result(s) from "${file.name}"`, 'success')
                setShowRestoreNotice(false)
                setError(null)
                setResultPage(1)
            } catch (err) {
                setError(`Failed to parse JSON file: ${err.message}`)
            }
        }
        reader.readAsText(file)
    }

    // ── STATS ──
    const resultList = Object.values(results)
    const analyzedCount = resultList.length
    const safeCount = resultList.filter(r => r.verdict === 'safe').length
    const flaggedCount = resultList.filter(r => r.verdict === 'flagged').length
    const rejectedCount = resultList.filter(r => r.verdict === 'rejected').length
    const avgConfidence = analyzedCount > 0
        ? resultList.reduce((sum, r) => sum + (r.confidence || 0), 0) / analyzedCount
        : 0
    const pendingCount = useMemo(() => {
        const analyzedIds = new Set(Object.keys(results))
        return images.filter(img => !analyzedIds.has(img.id) && img.status !== 'analyzing').length
    }, [images, results])

    // Filtered + paginated results
    const filteredResults = useMemo(() => {
        if (resultFilter === 'all') return resultList
        return resultList.filter(r => r.verdict === resultFilter)
    }, [resultList, resultFilter])

    const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE)
    const pagedResults = filteredResults.slice((resultPage - 1) * RESULTS_PER_PAGE, resultPage * RESULTS_PER_PAGE)

    useEffect(() => { setResultPage(1) }, [resultFilter])

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={{ padding: '20px 28px', maxWidth: 1600, margin: '0 auto' }}>

            {/* ── Restore Notice ── */}
            {showRestoreNotice && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                    background: ACCENT_DIM,
                    border: `1px solid ${ACCENT_BORDER}`
                }}>
                    <Save size={14} color={ACCENT} style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12, color: ACCENT, flex: 1 }}>
                        <strong>Session restored</strong> — {analyzedCount} result{analyzedCount !== 1 ? 's' : ''} from previous session loaded.
                        {savedSession?.savedAt && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                                Saved {new Date(savedSession.savedAt).toLocaleString()}
                            </span>
                        )}
                    </p>
                    <button
                        onClick={() => setShowRestoreNotice(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, padding: 0 }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${ACCENT}, #ea580c)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FlaskConical size={18} color="#fff" />
                        </div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>
                            Model Test Lab
                        </h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                        Upload up to {MAX_IMAGES} images · Analyze in batches · Results auto-saved
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* Hidden JSON import input */}
                    <input
                        ref={importJsonRef}
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={handleImportJson}
                    />
                    {/* Import JSON button — always visible */}
                    <button
                        onClick={() => importJsonRef.current?.click()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px', borderRadius: 6, fontSize: 11,
                            background: 'var(--bg-card)', border: `1px solid ${ACCENT_BORDER}`,
                            color: ACCENT, cursor: 'pointer', fontFamily: 'monospace',
                            textTransform: 'uppercase', letterSpacing: 1
                        }}
                    >
                        <FolderOpen size={13} /> Import JSON
                    </button>
                    {analyzedCount > 0 && (
                        <button
                            onClick={exportResults}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 12px', borderRadius: 6, fontSize: 11,
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'monospace',
                                textTransform: 'uppercase', letterSpacing: 1
                            }}
                        >
                            <Download size={13} /> Export JSON
                        </button>
                    )}
                    {(images.length > 0 || analyzedCount > 0) && (
                        <button
                            onClick={clearAll}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 12px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                                color: '#ef4444', cursor: 'pointer', fontFamily: 'monospace',
                                textTransform: 'uppercase', letterSpacing: 1
                            }}
                        >
                            <RotateCcw size={13} /> Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* ── Top section: Upload + Controls ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20, alignItems: 'start' }}>

                {/* Drop Zone */}
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? ACCENT : 'var(--border-color)'}`,
                        borderRadius: 10,
                        padding: '24px 20px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 10, cursor: 'pointer', minHeight: 140,
                        background: isDragging ? ACCENT_DIM : 'var(--bg-card)',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={onFileChange}
                    />
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: isDragging ? ACCENT_DIM : 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}>
                        <Upload size={22} color={isDragging ? ACCENT : 'var(--text-muted)'} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDragging ? ACCENT : 'var(--text-primary)' }}>
                            {isDragging ? 'Drop images here' : 'Drop images or click to upload'}
                        </p>
                        <p style={{ margin: '3px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            JPG, PNG, WebP, GIF · Max {MAX_IMAGES} images
                        </p>
                    </div>
                    {images.length > 0 && (
                        <div style={{
                            padding: '4px 14px', borderRadius: 20,
                            background: 'var(--bg-secondary)',
                            fontSize: 11, color: 'var(--text-secondary)',
                            fontFamily: 'monospace'
                        }}>
                            {images.length}/{MAX_IMAGES} loaded · {analyzedCount} analyzed · {pendingCount} pending
                        </div>
                    )}
                    {images.length === 0 && analyzedCount > 0 && (
                        <div style={{
                            padding: '4px 14px', borderRadius: 20,
                            background: ACCENT_DIM,
                            fontSize: 11, color: ACCENT,
                            fontFamily: 'monospace',
                            border: `1px solid ${ACCENT_BORDER}`
                        }}>
                            {analyzedCount} results from saved session · Upload more to continue
                        </div>
                    )}
                </div>

                {/* Controls Panel */}
                <div style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 10, padding: 16,
                    display: 'flex', flexDirection: 'column', gap: 14
                }}>
                    <h3 style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)' }}>
                        Run Configuration
                    </h3>

                    {/* Model selector */}
                    <div>
                        <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Model
                        </label>
                        <select
                            value={selectedModel}
                            onChange={e => setSelectedModel(e.target.value)}
                            disabled={isRunning}
                            style={{
                                width: '100%', padding: '7px 8px', borderRadius: 6, fontSize: 11,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'monospace'
                            }}
                        >
                            {models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Batch size */}
                    <div>
                        <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Batch Size
                        </label>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {BATCH_SIZE_OPTIONS.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setBatchSize(size)}
                                    disabled={isRunning}
                                    style={{
                                        flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12,
                                        fontWeight: batchSize === size ? 700 : 400,
                                        background: batchSize === size ? ACCENT : 'var(--bg-secondary)',
                                        border: `1px solid ${batchSize === size ? ACCENT : 'var(--border-color)'}`,
                                        color: batchSize === size ? '#fff' : 'var(--text-secondary)',
                                        cursor: isRunning ? 'not-allowed' : 'pointer',
                                        fontFamily: 'monospace', transition: 'all 0.15s'
                                    }}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                            images per API call
                        </p>
                    </div>

                    {/* Progress bar */}
                    {(images.length > 0 || analyzedCount > 0) && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Progress</span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                    {analyzedCount}/{images.length || analyzedCount} · Batch {batchIndex}
                                </span>
                            </div>
                            <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(images.length > 0 ? (analyzedCount / images.length) : 1) * 100}%`,
                                    background: `linear-gradient(90deg, ${ACCENT}, #ea580c)`,
                                    borderRadius: 4, transition: 'width 0.4s'
                                }} />
                            </div>
                            {isRunning && (
                                <p style={{ margin: '4px 0 0 0', fontSize: 10, color: ACCENT, fontFamily: 'monospace' }}>
                                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: 4 }} />
                                    Running batch {batchIndex + 1}…
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <button
                            onClick={handleRunNext}
                            disabled={isRunning || pendingCount === 0 || images.length === 0}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                padding: '9px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace',
                                cursor: isRunning || pendingCount === 0 ? 'not-allowed' : 'pointer',
                                background: isRunning || pendingCount === 0 ? 'var(--bg-secondary)' : `linear-gradient(135deg, ${ACCENT}, #ea580c)`,
                                border: 'none',
                                color: isRunning || pendingCount === 0 ? 'var(--text-muted)' : '#fff',
                                transition: 'all 0.2s',
                                opacity: isRunning || pendingCount === 0 ? 0.6 : 1
                            }}
                        >
                            {isRunning && !autoRun
                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
                                : <><SkipForward size={14} /> Run Next Batch</>
                            }
                        </button>

                        <button
                            onClick={handleAutoRun}
                            disabled={images.length === 0 || (pendingCount === 0 && !autoRun)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                padding: '9px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace',
                                cursor: images.length === 0 || (pendingCount === 0 && !autoRun) ? 'not-allowed' : 'pointer',
                                background: autoRun
                                    ? 'rgba(239,68,68,0.1)'
                                    : 'var(--bg-secondary)',
                                border: `1px solid ${autoRun ? '#ef4444' : 'var(--border-color)'}`,
                                color: autoRun ? '#ef4444' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                opacity: images.length === 0 || (pendingCount === 0 && !autoRun) ? 0.5 : 1
                            }}
                        >
                            {autoRun
                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Stop Auto-Run</>
                                : <><Zap size={14} /> Auto-Run All</>
                            }
                        </button>
                    </div>

                    {/* Save indicator */}
                    {analyzedCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Save size={11} color="var(--text-muted)" />
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                Auto-saved · survives page refresh
                            </span>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div style={{
                            padding: '7px 10px', borderRadius: 6,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            display: 'flex', alignItems: 'flex-start', gap: 7
                        }}>
                            <XCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: 10, color: '#ef4444', lineHeight: 1.5 }}>{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stats Summary ── */}
            {analyzedCount > 0 && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 10, marginBottom: 20
                }}>
                    {[
                        { label: 'Total', value: images.length || analyzedCount, color: 'var(--text-secondary)', icon: <ImageIcon size={14} /> },
                        { label: 'Analyzed', value: analyzedCount, color: 'var(--text-primary)', icon: <TrendingUp size={14} /> },
                        { label: 'Safe', value: safeCount, color: '#22c55e', icon: <CheckCircle size={14} color="#22c55e" /> },
                        { label: 'Flagged', value: flaggedCount, color: '#f59e0b', icon: <AlertTriangle size={14} color="#f59e0b" /> },
                        { label: 'Rejected', value: rejectedCount, color: '#ef4444', icon: <XCircle size={14} color="#ef4444" /> },
                        { label: 'Avg Conf.', value: `${Math.round(avgConfidence * 100)}%`, color: avgConfidence > 0.7 ? '#22c55e' : avgConfidence > 0.4 ? '#f59e0b' : '#ef4444', icon: <Info size={14} /> },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 8, padding: '12px 14px',
                            display: 'flex', flexDirection: 'column', gap: 5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {stat.label}
                                </span>
                                {stat.icon}
                            </div>
                            <span style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'monospace', lineHeight: 1 }}>
                                {stat.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Image Grid (collapsible thumbnails) ── */}
            {images.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div
                        onClick={() => setShowImageGrid(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            marginBottom: showImageGrid ? 10 : 0,
                            padding: '6px 0'
                        }}
                    >
                        <h3 style={{
                            fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                            color: 'var(--text-muted)', margin: 0,
                            display: 'flex', alignItems: 'center', gap: 7
                        }}>
                            <ImageIcon size={13} />
                            Images ({images.length})
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                · {analyzedCount} done · {pendingCount} pending
                            </span>
                        </h3>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                            {showImageGrid ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {showImageGrid ? 'Hide' : 'Show'}
                            </span>
                        </div>
                    </div>
                    {showImageGrid && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: 8,
                            maxHeight: 400,
                            overflowY: 'auto',
                            padding: '2px 2px 8px 2px'
                        }}>
                            {images.map(img => (
                                <ImageCard
                                    key={img.id}
                                    img={img}
                                    result={results[img.id] || null}
                                    onRemove={removeImage}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Main content: Results + Batch History side by side ── */}
            {(resultList.length > 0 || batchHistory.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: batchHistory.length > 0 ? '1fr 280px' : '1fr', gap: 16, marginBottom: 20 }}>

                    {/* Results Table */}
                    {resultList.length > 0 && (
                        <div>
                            {/* Results header + filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <h3 style={{
                                    fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                                    color: 'var(--text-muted)', margin: 0,
                                    display: 'flex', alignItems: 'center', gap: 7
                                }}>
                                    <Play size={13} />
                                    Results ({filteredResults.length}{resultFilter !== 'all' ? ` ${resultFilter}` : ''} / {resultList.length} total)
                                </h3>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
                                    <Filter size={12} color="var(--text-muted)" />
                                    {['all', 'safe', 'flagged', 'rejected'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setResultFilter(f)}
                                            style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: 10,
                                                fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5,
                                                cursor: 'pointer', fontWeight: resultFilter === f ? 700 : 400,
                                                background: resultFilter === f
                                                    ? (f === 'safe' ? 'rgba(34,197,94,0.15)' : f === 'flagged' ? 'rgba(245,158,11,0.15)' : f === 'rejected' ? 'rgba(239,68,68,0.15)' : ACCENT_DIM)
                                                    : 'var(--bg-secondary)',
                                                border: `1px solid ${resultFilter === f
                                                    ? (f === 'safe' ? '#22c55e44' : f === 'flagged' ? '#f59e0b44' : f === 'rejected' ? '#ef444444' : ACCENT_BORDER)
                                                    : 'var(--border-color)'}`,
                                                color: resultFilter === f
                                                    ? (f === 'safe' ? '#22c55e' : f === 'flagged' ? '#f59e0b' : f === 'rejected' ? '#ef4444' : ACCENT)
                                                    : 'var(--text-muted)'
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{
                                border: '1px solid var(--border-color)', borderRadius: 8,
                                overflow: 'hidden', background: 'var(--bg-card)'
                            }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                                {['#', 'Image', 'Verdict', 'Confidence', 'Style', 'Issues', 'Copyright', 'Time', ''].map(col => (
                                                    <th key={col} style={{
                                                        padding: '8px 10px', fontSize: 9, textAlign: 'left', fontWeight: 700,
                                                        textTransform: 'uppercase', letterSpacing: 1.5,
                                                        color: 'var(--text-muted)',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedResults.map((result, i) => (
                                                <ResultRow
                                                    key={result.id}
                                                    result={result}
                                                    index={(resultPage - 1) * RESULTS_PER_PAGE + i}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 14px', borderTop: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)'
                                    }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            Page {resultPage} of {totalPages} · {filteredResults.length} results
                                        </span>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            <button
                                                onClick={() => setResultPage(p => Math.max(1, p - 1))}
                                                disabled={resultPage === 1}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 5, fontSize: 11,
                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                    color: resultPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    cursor: resultPage === 1 ? 'not-allowed' : 'pointer',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                ← Prev
                                            </button>
                                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                                let page
                                                if (totalPages <= 7) page = i + 1
                                                else if (resultPage <= 4) page = i + 1
                                                else if (resultPage >= totalPages - 3) page = totalPages - 6 + i
                                                else page = resultPage - 3 + i
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setResultPage(page)}
                                                        style={{
                                                            padding: '4px 8px', borderRadius: 5, fontSize: 11,
                                                            background: resultPage === page ? ACCENT : 'var(--bg-card)',
                                                            border: `1px solid ${resultPage === page ? ACCENT : 'var(--border-color)'}`,
                                                            color: resultPage === page ? '#fff' : 'var(--text-secondary)',
                                                            cursor: 'pointer', fontFamily: 'monospace', fontWeight: resultPage === page ? 700 : 400
                                                        }}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            })}
                                            <button
                                                onClick={() => setResultPage(p => Math.min(totalPages, p + 1))}
                                                disabled={resultPage === totalPages}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 5, fontSize: 11,
                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                    color: resultPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    cursor: resultPage === totalPages ? 'not-allowed' : 'pointer',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Batch History sidebar */}
                    {batchHistory.length > 0 && (
                        <div>
                            <h3 style={{
                                fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                                color: 'var(--text-muted)', margin: '0 0 10px 0',
                                display: 'flex', alignItems: 'center', gap: 7
                            }}>
                                <Zap size={13} />
                                Batch History ({batchHistory.length})
                            </h3>
                            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                                {batchHistory.map((batch, i) => (
                                    <BatchHistoryItem key={i} batch={batch} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Activity Log ── */}
            {log.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{
                        fontSize: 11, textTransform: 'uppercase', letterSpacing: 2,
                        color: 'var(--text-muted)', margin: '0 0 8px 0'
                    }}>
                        Run Log
                    </h3>
                    <div style={{
                        background: '#0a0a0a', border: '1px solid var(--border-color)',
                        borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace',
                        fontSize: 11, lineHeight: 1.9, maxHeight: 220, overflowY: 'auto'
                    }}>
                        {log.map((entry, i) => (
                            <div key={i} style={{
                                color: entry.type === 'error' ? '#ef4444'
                                    : entry.type === 'success' ? '#22c55e'
                                        : '#9ca3af'
                            }}>
                                <span style={{ color: '#4b5563', marginRight: 8 }}>[{entry.ts}]</span>
                                {entry.msg}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}

            {/* Empty state */}
            {images.length === 0 && analyzedCount === 0 && (
                <div style={{
                    textAlign: 'center', padding: '50px 24px',
                    border: '1px solid var(--border-color)', borderRadius: 12,
                    background: 'var(--bg-card)'
                }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: ACCENT_DIM,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px'
                    }}>
                        <FlaskConical size={26} color={ACCENT} />
                    </div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 700 }}>
                        No images uploaded yet
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
                        Upload up to {MAX_IMAGES} images above to start testing model accuracy at scale.
                        Results are automatically saved and will persist across page refreshes.
                    </p>
                </div>
            )}

            {/* Spin keyframe injection */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
