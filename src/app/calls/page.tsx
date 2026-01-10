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
  Sparkles,
  Play,
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
  if (score >= 80) return 'text-[#5eead4]'
  if (score >= 60) return 'text-[#5eead4]'
  return 'text-gray-400'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-[#5eead4]/20 border-[#5eead4]/30'
  if (score >= 60) return 'bg-[#5eead4]/20 border-[#5eead4]/30'
  return 'bg-gray-500/20 border-gray-500/30'
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
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [creatingScenarioId, setCreatingScenarioId] = useState<string | null>(null)
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
        // Ensure we always get an array
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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('error', 'Invalid file type. Please upload an audio file (mp3, mp4, wav, m4a, webm)')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showToast('error', 'File too large. Maximum size is 25MB')
      return
    }

    setUploading(true)
    setUploadProgress(10)
    setIsUploadModalOpen(false)

    try {
      // Generate unique file path
      const timestamp = Date.now()
      const filePath = `${user.id}/${timestamp}-${file.name}`

      // Upload to Supabase Storage
      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('Call_Recordings')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      setUploadProgress(60)

      // Create database record
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

      // Trigger analysis
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
      // Delete from storage
      await supabase.storage.from('Call_Recordings').remove([fileUrl])

      // Delete from database
      await supabase.from('call_recordings').delete().eq('id', recordingId)

      showToast('success', 'Recording deleted')
      fetchRecordings()
    } catch (error) {
      showToast('error', 'Failed to delete recording')
    }
  }

  const handleReanalyze = async (recordingId: string) => {
    if (!user) return
    setReanalyzingId(recordingId)

    try {
      // Update status to analyzing
      await supabase
        .from('call_recordings')
        .update({ status: 'analyzing' })
        .eq('id', recordingId)

      // Trigger re-analysis
      const response = await fetch('/api/analyze-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId,
          userId: user.id,
          reanalyze: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Re-analysis failed')
      }

      showToast('success', 'Call re-analyzed successfully!')
      fetchRecordings()
    } catch (error) {
      console.error('Re-analyze error:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to re-analyze call')
      // Reset status on error
      await supabase
        .from('call_recordings')
        .update({ status: 'completed' })
        .eq('id', recordingId)
    } finally {
      setReanalyzingId(null)
    }
  }

  const handleCreateScenario = async (recordingId: string) => {
    if (!user) return
    setCreatingScenarioId(recordingId)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Note: Call recordings use a different source than coaching_sessions
      // For now, we'll create a scenario using the transcript directly
      // The API needs to be extended to support call_recordings as source

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          source_session_id: recordingId, // This will need API modification
          name: `Practice Scenario from Call`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create scenario')
      }

      showToast('success', 'AI Scenario created! Go to Practice to try it.')
    } catch (error) {
      console.error('Create scenario error:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to create scenario')
    } finally {
      setCreatingScenarioId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-[#5eead4]" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-gray-400" />
      case 'transcribing':
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-[#5eead4] animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Analysis Complete'
      case 'failed':
        return 'Analysis Failed'
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
          <div className="spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Call Review</h1>
            <p className="text-gray-400">Upload sales calls for AI-powered feedback and coaching</p>
          </div>
          <div className="flex items-center gap-3">
            {fathomConnected && (
              <button
                onClick={handleOpenFathomModal}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Import from Fathom
              </button>
            )}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              disabled={uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Call
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-[#5eead4] animate-spin" />
              <div className="flex-1">
                <p className="text-white font-medium">
                  {uploadProgress < 30
                    ? 'Uploading file...'
                    : uploadProgress < 60
                    ? 'Processing audio...'
                    : uploadProgress < 80
                    ? 'Transcribing with AI...'
                    : 'Analyzing call...'}
                </p>
                <div className="mt-2 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5eead4] to-[#4fd1c5] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recordings List */}
        {recordings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No calls uploaded yet</h2>
            <p className="text-gray-400 mb-6">
              Upload your sales calls to get AI-powered feedback and coaching
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Your First Call
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div key={recording.id} className="glass-card overflow-hidden">
                {/* Recording Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id)}
                >
                  <div className="w-12 h-12 rounded-xl bg-[rgba(94,234,212,0.1)] flex items-center justify-center">
                    <FileAudio className="w-6 h-6 text-[#5eead4]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{recording.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                      <span>{formatFileSize(recording.file_size)}</span>
                      {recording.duration_seconds && (
                        <span>{formatDuration(recording.duration_seconds)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {recording.status === 'completed' && recording.overall_score !== null && (
                      <div
                        className={`px-3 py-1 rounded-lg border ${getScoreBg(recording.overall_score)}`}
                      >
                        <span className={`font-bold ${getScoreColor(recording.overall_score)}`}>
                          {recording.overall_score}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/ 100</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {getStatusIcon(recording.status)}
                      <span className="text-sm text-gray-400">{getStatusText(recording.status)}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRecording(recording.id, recording.file_url)
                      }}
                      className="p-2 rounded-lg hover:bg-[rgba(160,160,176,0.1)] text-gray-400 hover:text-gray-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {expandedId === recording.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Analysis */}
                {expandedId === recording.id && recording.status === 'completed' && recording.analysis && (
                  <AnalysisView
                    analysis={recording.analysis}
                    transcript={recording.transcript}
                    recordingId={recording.id}
                    onCreateScenario={handleCreateScenario}
                    isCreatingScenario={creatingScenarioId === recording.id}
                  />
                )}

                {/* Missing Analysis State - completed but no analysis data */}
                {expandedId === recording.id && recording.status === 'completed' && !recording.analysis && (
                  <MissingAnalysisView
                    recordingId={recording.id}
                    transcript={recording.transcript}
                    onReanalyze={() => handleReanalyze(recording.id)}
                    isReanalyzing={reanalyzingId === recording.id}
                  />
                )}

                {/* Error State */}
                {expandedId === recording.id && recording.status === 'failed' && (
                  <div className="p-6 border-t border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-3 text-gray-400">
                      <XCircle className="w-5 h-5" />
                      <span>{recording.error_message || 'An error occurred during analysis'}</span>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {expandedId === recording.id &&
                  (recording.status === 'transcribing' || recording.status === 'analyzing') && (
                    <div className="p-6 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-3 text-[#5eead4]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {recording.status === 'transcribing'
                            ? 'Transcribing your call with AI...'
                            : 'Analyzing transcript for feedback...'}
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
              className="border-2 border-dashed border-[rgba(94,234,212,0.3)] rounded-xl p-8 hover:border-[#5eead4] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-[#5eead4] mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
              <p className="text-gray-400 text-sm">MP3, MP4, WAV, M4A, or WebM (max 25MB)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">What you&apos;ll get:</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                Full transcript of your call
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                Scores for 6 key sales skills
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                Specific feedback with examples
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
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
              <Loader2 className="w-8 h-8 text-[#5eead4] animate-spin" />
            </div>
          ) : fathomCalls.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No calls found in Fathom</p>
              <p className="text-sm text-gray-500">Record some meetings with Fathom first</p>
            </div>
          ) : (
            <>
              {/* Select All / Import Selected Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedFathomCalls.size === fathomCalls.length && fathomCalls.length > 0}
                    onChange={toggleSelectAllFathomCalls}
                    className="w-4 h-4 rounded border-gray-600 bg-transparent accent-[#5eead4]"
                  />
                  Select All ({fathomCalls.length})
                </label>
                {selectedFathomCalls.size > 0 && (
                  <button
                    onClick={handleImportSelectedFathomCalls}
                    disabled={importingMultiple}
                    className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    {importingMultiple ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {importingMultiple ? 'Importing...' : `Import ${selectedFathomCalls.size} Selected`}
                  </button>
                )}
              </div>

              {/* Calls List */}
              <div className="max-h-80 overflow-y-auto space-y-3">
                {fathomCalls.map((meeting: any) => {
                  const meetingId = String(meeting.id)
                  return (
                  <div
                    key={meetingId}
                    onClick={() => toggleFathomCallSelection(meetingId)}
                    className={`bg-[rgba(255,255,255,0.02)] border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      selectedFathomCalls.has(meetingId)
                        ? 'border-[#5eead4] bg-[rgba(94,234,212,0.05)]'
                        : 'border-[rgba(255,255,255,0.05)] hover:border-[rgba(94,234,212,0.2)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFathomCalls.has(meetingId)}
                      onChange={() => toggleFathomCallSelection(meetingId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-600 bg-transparent accent-[#5eead4]"
                    />
                    <div className="w-10 h-10 rounded-lg bg-[rgba(94,234,212,0.1)] flex items-center justify-center">
                      <Video className="w-5 h-5 text-[#5eead4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">
                        {meeting.title || meeting.name || `Meeting ${meetingId}`}
                      </h4>
                      <p className="text-sm text-gray-400">
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
                      className="btn-secondary text-sm py-2 px-3 flex items-center gap-2"
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

          <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
            <a
              href="https://fathom.video/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#5eead4] hover:underline flex items-center gap-1"
            >
              Open Fathom <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={fetchFathomCalls}
              disabled={loadingFathom}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
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

// Missing Analysis View Component
interface MissingAnalysisViewProps {
  recordingId: string
  transcript: string | null
  onReanalyze: () => void
  isReanalyzing?: boolean
}

function MissingAnalysisView({ recordingId, transcript, onReanalyze, isReanalyzing }: MissingAnalysisViewProps) {
  const [showTranscript, setShowTranscript] = useState(false)

  return (
    <div className="border-t border-[rgba(255,255,255,0.05)] p-6">
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-[#5eead4]/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-[#5eead4]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Analysis Data Missing</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          This call was marked as analyzed but the analysis data is not available.
          {transcript ? ' The transcript is available - you can re-run the analysis.' : ' No transcript data found.'}
        </p>

        {transcript && (
          <button
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="btn-primary inline-flex items-center gap-2"
          >
            {isReanalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Re-analyze Call
              </>
            )}
          </button>
        )}
      </div>

      {/* Show transcript if available */}
      {transcript && (
        <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.05)]">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-[#5eead4] hover:underline text-sm"
          >
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>
          {showTranscript && (
            <div className="mt-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{transcript}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Analysis View Component
interface AnalysisViewProps {
  analysis: CallAnalysis
  transcript: string | null
  recordingId?: string
  onCreateScenario?: (recordingId: string) => void
  isCreatingScenario?: boolean
}

function AnalysisView({ analysis, transcript, recordingId, onCreateScenario, isCreatingScenario }: AnalysisViewProps) {
  const [showTranscript, setShowTranscript] = useState(false)

  // Safety check for malformed analysis data
  if (!analysis) {
    return (
      <div className="border-t border-[rgba(255,255,255,0.05)] p-6">
        <p className="text-gray-400">Analysis data not available</p>
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
    <div className="border-t border-[rgba(255,255,255,0.05)]">
      {/* Summary */}
      <div className="p-6 bg-[rgba(94,234,212,0.02)]">
        <h4 className="font-semibold text-white mb-2">Summary</h4>
        <p className="text-gray-300">{analysis.summary || 'No summary available'}</p>
      </div>

      {/* Scores Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className={`rounded-xl p-4 border ${getScoreBg(data.score || 0)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(data.score || 0)}`}>{data.score || 0}</p>
          </div>
        ))}
      </div>

      {/* Talk/Listen Ratio */}
      {analysis.talk_listen_ratio && (
        <div className="px-6 pb-6">
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Talk/Listen Ratio</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">You</span>
                  <span className="text-white">{analysis.talk_listen_ratio.rep_percentage || 0}%</span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5eead4]"
                    style={{ width: `${analysis.talk_listen_ratio.rep_percentage || 0}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Prospect</span>
                  <span className="text-white">{analysis.talk_listen_ratio.prospect_percentage || 0}%</span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5eead4]"
                    style={{ width: `${analysis.talk_listen_ratio.prospect_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">{analysis.talk_listen_ratio.feedback || ''}</p>
          </div>
        </div>
      )}

      {/* Detailed Feedback */}
      <div className="px-6 pb-6 space-y-4">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#5eead4]" />
                <span className="font-medium text-white">{label}</span>
              </div>
              <span className={`font-bold ${getScoreColor(data.score || 0)}`}>{data.score || 0}/100</span>
            </div>
            <p className="text-gray-300 text-sm mb-3">{data.feedback || 'No feedback available'}</p>
            {data.highlights && data.highlights.length > 0 && (
              <div className="space-y-2">
                {data.highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="text-sm text-gray-400 pl-3 border-l-2 border-[rgba(94,234,212,0.3)] italic"
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
        <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#5eead4]" />
            <h4 className="font-medium text-white">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {(analysis.strengths || []).map((strength, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4] mt-0.5 shrink-0" />
                {strength}
              </li>
            ))}
            {(!analysis.strengths || analysis.strengths.length === 0) && (
              <li className="text-sm text-gray-400">No strengths identified</li>
            )}
          </ul>
        </div>

        <div className="bg-[rgba(94,234,212,0.05)] border border-[rgba(94,234,212,0.1)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-[#5eead4]" />
            <h4 className="font-medium text-white">Key Improvements</h4>
          </div>
          <ul className="space-y-2">
            {(analysis.key_improvements || []).map((improvement, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <Target className="w-4 h-4 text-[#5eead4] mt-0.5 shrink-0" />
                {improvement}
              </li>
            ))}
            {(!analysis.key_improvements || analysis.key_improvements.length === 0) && (
              <li className="text-sm text-gray-400">No improvements identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Create AI Scenario CTA */}
      {recordingId && onCreateScenario && transcript && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-[rgba(0,255,193,0.1)] to-[rgba(139,92,246,0.1)] border border-[rgba(0,255,193,0.2)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ffc1] to-[#8b5cf6] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-1">Practice This Call Again</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Create an AI scenario from this call. The AI will roleplay as the prospect with their
                  personality, objections, and pain points - so you can practice handling it better.
                </p>
                <button
                  onClick={() => onCreateScenario(recordingId)}
                  disabled={isCreatingScenario}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {isCreatingScenario ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Scenario...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Create AI Scenario
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Toggle */}
      {transcript && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-[#5eead4] hover:underline text-sm"
          >
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showTranscript ? 'Hide Transcript' : 'Show Full Transcript'}
          </button>
          {showTranscript && (
            <div className="mt-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{transcript}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
