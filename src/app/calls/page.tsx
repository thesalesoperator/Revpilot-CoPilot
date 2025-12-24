'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Phone,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileAudio,
  TrendingUp,
  TrendingDown,
  Target,
  MessageSquare,
  Zap,
  Award,
  BarChart3,
  Download,
  Video,
  ExternalLink,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { CallRecording, CallAnalysis } from '@/types/database'

const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
  'audio/webm',
  'video/mp4',
  'video/webm',
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[var(--success)]'
  if (score >= 60) return 'text-[var(--warning)]'
  return 'text-[var(--error)]'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-[var(--success-muted)] border-[var(--success)]'
  if (score >= 60) return 'bg-[var(--warning-muted)] border-[var(--warning)]'
  return 'bg-[var(--error-muted)] border-[var(--error)]'
}

export default function CallsPage() {
  const [recordings, setRecordings] = useState<CallRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isFathomModalOpen, setIsFathomModalOpen] = useState(false)
  const [fathomCalls, setFathomCalls] = useState<any[]>([])
  const [loadingFathom, setLoadingFathom] = useState(false)
  const [importingCallId, setImportingCallId] = useState<string | null>(null)
  const [importingMultiple, setImportingMultiple] = useState(false)
  const [selectedFathomCalls, setSelectedFathomCalls] = useState<Set<string>>(new Set())
  const [fathomConnected, setFathomConnected] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = createClient()

  const fetchRecordings = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecordings(data || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  // Poll for status updates on processing recordings
  useEffect(() => {
    const processingRecordings = recordings.filter(
      (r) => r.status === 'transcribing' || r.status === 'analyzing'
    )

    if (processingRecordings.length === 0) return

    const interval = setInterval(() => {
      fetchRecordings()
    }, 5000)

    return () => clearInterval(interval)
  }, [recordings, fetchRecordings])

  // Check if Fathom is connected
  useEffect(() => {
    const checkFathomConnection = async () => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('fathom_api_key')
        .eq('id', user.id)
        .single()
      setFathomConnected(!!data?.fathom_api_key)
    }
    checkFathomConnection()
  }, [user, supabase])

  const fetchFathomCalls = async () => {
    if (!user) return
    setLoadingFathom(true)
    try {
      const response = await fetch(`/api/fathom/calls?userId=${user.id}`)
      const data = await response.json()
      if (response.ok) {
        const calls = Array.isArray(data.meetings)
          ? data.meetings
          : Array.isArray(data)
            ? data
            : []
        setFathomCalls(calls)
      } else {
        showToast('error', data.error || 'Failed to fetch Fathom calls')
        setFathomCalls([])
      }
    } catch {
      showToast('error', 'Failed to connect to Fathom')
      setFathomCalls([])
    } finally {
      setLoadingFathom(false)
    }
  }

  const handleOpenFathomModal = () => {
    setIsFathomModalOpen(true)
    setSelectedFathomCalls(new Set())
    fetchFathomCalls()
  }

  const toggleFathomCallSelection = (callId: string | number) => {
    const id = String(callId)
    setSelectedFathomCalls((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAllFathomCalls = () => {
    if (selectedFathomCalls.size === fathomCalls.length) {
      setSelectedFathomCalls(new Set())
    } else {
      setSelectedFathomCalls(new Set(fathomCalls.map((c) => String(c.id))))
    }
  }

  const handleImportSelectedFathomCalls = async () => {
    if (!user || selectedFathomCalls.size === 0) return
    setImportingMultiple(true)

    const selectedMeetings = fathomCalls.filter((m) => selectedFathomCalls.has(String(m.id)))
    let successCount = 0
    let failCount = 0

    for (const meeting of selectedMeetings) {
      try {
        const response = await fetch('/api/fathom/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: user.id,
            title: meeting.title || meeting.name || `Call ${meeting.id}`,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setImportingMultiple(false)
    setSelectedFathomCalls(new Set())

    if (failCount === 0) {
      showToast('success', `Successfully imported ${successCount} call${successCount > 1 ? 's' : ''}!`)
    } else {
      showToast('error', `Imported ${successCount} calls, ${failCount} failed`)
    }

    setIsFathomModalOpen(false)
    fetchRecordings()
  }

  const handleImportFathomCall = async (meeting: any) => {
    if (!user) return
    const meetingId = String(meeting.id)
    setImportingCallId(meetingId)
    try {
      const response = await fetch('/api/fathom/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId,
          userId: user.id,
          title: meeting.title || meeting.name || `Call ${meetingId}`,
        }),
      })

      if (response.ok) {
        showToast('success', 'Call imported and analyzed successfully!')
        setIsFathomModalOpen(false)
        fetchRecordings()
      } else {
        const data = await response.json()
        showToast('error', data.error || 'Failed to import call')
      }
    } catch (error) {
      showToast('error', 'Failed to import call')
    } finally {
      setImportingCallId(null)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('error', 'Invalid file type. Please upload an audio file (mp3, mp4, wav, m4a, webm)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('error', 'File too large. Maximum size is 25MB')
      return
    }

    setUploading(true)
    setUploadProgress(10)
    setIsUploadModalOpen(false)

    try {
      const timestamp = Date.now()
      const filePath = `${user.id}/${timestamp}-${file.name}`

      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('Call_Recordings')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      setUploadProgress(60)

      const { data: recording, error: dbError } = await supabase
        .from('call_recordings')
        .insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_name: file.name,
          file_url: filePath,
          file_size: file.size,
          status: 'transcribing',
        })
        .select()
        .single()

      if (dbError) throw dbError

      setUploadProgress(80)

      const response = await fetch('/api/analyze-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId: recording.id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      setUploadProgress(100)
      showToast('success', 'Call uploaded and analyzed successfully!')
      fetchRecordings()

    } catch (error) {
      console.error('Upload error:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to upload call')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteRecording = async (recordingId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this call recording?')) return

    try {
      await supabase.storage.from('Call_Recordings').remove([fileUrl])
      await supabase.from('call_recordings').delete().eq('id', recordingId)

      showToast('success', 'Recording deleted')
      fetchRecordings()
    } catch (error) {
      showToast('error', 'Failed to delete recording')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[var(--success)]" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-[var(--error)]" />
      case 'transcribing':
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-[var(--text-muted)]" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complete'
      case 'failed':
        return 'Failed'
      case 'transcribing':
        return 'Transcribing...'
      case 'analyzing':
        return 'Analyzing...'
      default:
        return 'Uploading...'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Call Coaching</h1>
            <p className="text-[var(--text-secondary)]">Upload calls for AI-powered analysis and feedback</p>
          </div>
          <div className="flex items-center gap-3">
            {fathomConnected && (
              <button
                onClick={handleOpenFathomModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Download className="w-4 h-4" />
                Import from Fathom
              </button>
            )}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] font-medium hover:bg-[var(--accent-light)] transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Call
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)] mb-6">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
              <div className="flex-1">
                <p className="text-[var(--text-primary)] font-medium mb-2">
                  {uploadProgress < 30
                    ? 'Uploading file...'
                    : uploadProgress < 60
                    ? 'Processing audio...'
                    : uploadProgress < 80
                    ? 'Transcribing...'
                    : 'Analyzing call...'}
                </p>
                <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recordings List */}
        {recordings.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-xl p-12 border border-[var(--border-subtle)] text-center">
            <Phone className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">No calls uploaded yet</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Upload your sales calls to get AI-powered feedback
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] font-medium hover:bg-[var(--accent-light)] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Your First Call
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div key={recording.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                {/* Recording Header */}
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id)}
                >
                  <div className="w-11 h-11 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                    <FileAudio className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--text-primary)] truncate">{recording.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mt-0.5">
                      <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                      <span>{formatFileSize(recording.file_size)}</span>
                      {recording.duration_seconds && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                          <span>{formatDuration(recording.duration_seconds)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {recording.status === 'completed' && recording.overall_score !== null && (
                      <div className={`px-3 py-1.5 rounded-lg border ${getScoreBg(recording.overall_score)}`}>
                        <span className={`font-semibold ${getScoreColor(recording.overall_score)}`}>
                          {recording.overall_score}
                        </span>
                        <span className="text-[var(--text-muted)] text-sm ml-1">/ 100</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {getStatusIcon(recording.status)}
                      <span className="text-sm text-[var(--text-muted)]">{getStatusText(recording.status)}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRecording(recording.id, recording.file_url)
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--error-muted)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {expandedId === recording.id ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </div>

                {/* Expanded Analysis */}
                {expandedId === recording.id && recording.status === 'completed' && recording.analysis && (
                  <AnalysisView analysis={recording.analysis} transcript={recording.transcript} />
                )}

                {/* Error State */}
                {expandedId === recording.id && recording.status === 'failed' && (
                  <div className="p-5 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3 text-[var(--error)]">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">{recording.error_message || 'An error occurred during analysis'}</span>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {expandedId === recording.id &&
                  (recording.status === 'transcribing' || recording.status === 'analyzing') && (
                    <div className="p-5 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3 text-[var(--accent)]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          {recording.status === 'transcribing'
                            ? 'Transcribing your call...'
                            : 'Analyzing for feedback...'}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Call Recording">
        <div className="space-y-6">
          <div className="text-center">
            <div
              className="border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 hover:border-[var(--accent)] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-primary)] font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-[var(--text-muted)] text-sm">MP3, MP4, WAV, M4A, or WebM (max 25MB)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
            <h4 className="font-medium text-[var(--text-primary)] mb-3">What you&apos;ll get:</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                Full transcript of your call
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                Scores for 6 key sales skills
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                Specific feedback with examples
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                Actionable improvement suggestions
              </li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Fathom Import Modal */}
      <Modal isOpen={isFathomModalOpen} onClose={() => setIsFathomModalOpen(false)} title="Import from Fathom">
        <div className="space-y-4">
          {loadingFathom ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
            </div>
          ) : fathomCalls.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] mb-1">No calls found in Fathom</p>
              <p className="text-sm text-[var(--text-muted)]">Record some meetings with Fathom first</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={selectedFathomCalls.size === fathomCalls.length && fathomCalls.length > 0}
                    onChange={toggleSelectAllFathomCalls}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
                  />
                  Select All ({fathomCalls.length})
                </label>
                {selectedFathomCalls.size > 0 && (
                  <button
                    onClick={handleImportSelectedFathomCalls}
                    disabled={importingMultiple}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-base)] text-sm font-medium"
                  >
                    {importingMultiple ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Import {selectedFathomCalls.size}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {fathomCalls.map((meeting: any) => {
                  const meetingId = String(meeting.id)
                  return (
                  <div
                    key={meetingId}
                    onClick={() => toggleFathomCallSelection(meetingId)}
                    className={`bg-[var(--bg-elevated)] border rounded-lg p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      selectedFathomCalls.has(meetingId)
                        ? 'border-[var(--accent)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFathomCalls.has(meetingId)}
                      onChange={() => toggleFathomCallSelection(meetingId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-[var(--accent)]"
                    />
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                      <Video className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--text-primary)] truncate">
                        {meeting.title || meeting.name || `Meeting ${meetingId}`}
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">
                        {meeting.created_at
                          ? new Date(meeting.created_at).toLocaleDateString()
                          : meeting.date
                          ? new Date(meeting.date).toLocaleDateString()
                          : 'Unknown date'}
                        {meeting.duration && (
                          <span className="ml-2">• {formatDuration(meeting.duration)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImportFathomCall(meeting)
                      }}
                      disabled={importingCallId === meetingId || importingMultiple}
                      className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                    >
                      {importingCallId === meetingId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <a
              href="https://fathom.video/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Open Fathom <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={fetchFathomCalls}
              disabled={loadingFathom}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              {loadingFathom ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Refresh
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

// Analysis View Component
interface AnalysisViewProps {
  analysis: CallAnalysis
  transcript: string | null
}

function AnalysisView({ analysis, transcript }: AnalysisViewProps) {
  const [showTranscript, setShowTranscript] = useState(false)

  if (!analysis) {
    return (
      <div className="border-t border-[var(--border-subtle)] p-6">
        <p className="text-[var(--text-muted)]">Analysis data not available</p>
      </div>
    )
  }

  const defaultCategory = { score: 0, feedback: '', highlights: [] }
  const categories = [
    { key: 'opening_rapport', label: 'Opening & Rapport', icon: MessageSquare, data: analysis.opening_rapport || defaultCategory },
    { key: 'discovery_questions', label: 'Discovery Questions', icon: Target, data: analysis.discovery_questions || defaultCategory },
    { key: 'pain_identification', label: 'Pain Identification', icon: Zap, data: analysis.pain_identification || defaultCategory },
    { key: 'value_proposition', label: 'Value Proposition', icon: Award, data: analysis.value_proposition || defaultCategory },
    { key: 'objection_handling', label: 'Objection Handling', icon: TrendingUp, data: analysis.objection_handling || defaultCategory },
    { key: 'closing_techniques', label: 'Closing Techniques', icon: CheckCircle, data: analysis.closing_techniques || defaultCategory },
  ]

  return (
    <div className="border-t border-[var(--border-subtle)]">
      {/* Summary */}
      <div className="p-6 bg-[var(--bg-elevated)]">
        <h4 className="font-medium text-[var(--text-primary)] mb-2">Summary</h4>
        <p className="text-[var(--text-secondary)]">{analysis.summary || 'No summary available'}</p>
      </div>

      {/* Scores Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className={`rounded-lg p-4 border ${getScoreBg(data.score || 0)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">{label}</span>
            </div>
            <p className={`text-2xl font-semibold ${getScoreColor(data.score || 0)}`}>{data.score || 0}</p>
          </div>
        ))}
      </div>

      {/* Talk/Listen Ratio */}
      {analysis.talk_listen_ratio && (
        <div className="px-6 pb-6">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">Talk/Listen Ratio</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-muted)]">You</span>
                  <span className="text-[var(--text-primary)]">{analysis.talk_listen_ratio.rep_percentage || 0}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${analysis.talk_listen_ratio.rep_percentage || 0}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-muted)]">Prospect</span>
                  <span className="text-[var(--text-primary)]">{analysis.talk_listen_ratio.prospect_percentage || 0}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--warning)]"
                    style={{ width: `${analysis.talk_listen_ratio.prospect_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{analysis.talk_listen_ratio.feedback || ''}</p>
          </div>
        </div>
      )}

      {/* Detailed Feedback */}
      <div className="px-6 pb-6 space-y-3">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-medium text-[var(--text-primary)]">{label}</span>
              </div>
              <span className={`font-semibold ${getScoreColor(data.score || 0)}`}>{data.score || 0}/100</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-3">{data.feedback || 'No feedback available'}</p>
            {data.highlights && data.highlights.length > 0 && (
              <div className="space-y-2">
                {data.highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="text-sm text-[var(--text-muted)] pl-3 border-l-2 border-[var(--accent)] italic"
                  >
                    &quot;{highlight}&quot;
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Strengths & Improvements */}
      <div className="px-6 pb-6 grid md:grid-cols-2 gap-4">
        <div className="bg-[var(--success-muted)] border border-[var(--success)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[var(--success)]" />
            <h4 className="font-medium text-[var(--text-primary)]">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {(analysis.strengths || []).map((strength, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                {strength}
              </li>
            ))}
            {(!analysis.strengths || analysis.strengths.length === 0) && (
              <li className="text-sm text-[var(--text-muted)]">No strengths identified</li>
            )}
          </ul>
        </div>

        <div className="bg-[var(--warning-muted)] border border-[var(--warning)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-[var(--warning)]" />
            <h4 className="font-medium text-[var(--text-primary)]">Areas to Improve</h4>
          </div>
          <ul className="space-y-2">
            {(analysis.key_improvements || []).map((improvement, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                <Target className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
                {improvement}
              </li>
            ))}
            {(!analysis.key_improvements || analysis.key_improvements.length === 0) && (
              <li className="text-sm text-[var(--text-muted)]">No improvements identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Transcript Toggle */}
      {transcript && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-[var(--accent)] hover:underline text-sm"
          >
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showTranscript ? 'Hide Transcript' : 'Show Full Transcript'}
          </button>
          {showTranscript && (
            <div className="mt-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">{transcript}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
