'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Phone,
  Upload,
  Play,
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
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/20 border-green-500/30'
  if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

export default function CallsPage() {
  const [recordings, setRecordings] = useState<CallRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
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
        .from('CALL_RECORDINGS')
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
      await supabase.storage.from('CALL_RECORDINGS').remove([fileUrl])

      // Delete from database
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
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'transcribing':
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-[#00ffc1] animate-spin" />
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

        {/* Upload Progress */}
        {uploading && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-[#00ffc1] animate-spin" />
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
                    className="h-full bg-gradient-to-r from-[#00ffc1] to-[#00d9a6] transition-all duration-300"
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
                  <div className="w-12 h-12 rounded-xl bg-[rgba(0,255,193,0.1)] flex items-center justify-center">
                    <FileAudio className="w-6 h-6 text-[#00ffc1]" />
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
                      className="p-2 rounded-lg hover:bg-[rgba(255,0,67,0.1)] text-gray-400 hover:text-red-400 transition-colors"
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
                  <AnalysisView analysis={recording.analysis} transcript={recording.transcript} />
                )}

                {/* Error State */}
                {expandedId === recording.id && recording.status === 'failed' && (
                  <div className="p-6 border-t border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-3 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span>{recording.error_message || 'An error occurred during analysis'}</span>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {expandedId === recording.id &&
                  (recording.status === 'transcribing' || recording.status === 'analyzing') && (
                    <div className="p-6 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-3 text-[#00ffc1]">
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
              className="border-2 border-dashed border-[rgba(0,255,193,0.3)] rounded-xl p-8 hover:border-[#00ffc1] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-[#00ffc1] mx-auto mb-4" />
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

          <div className="bg-[rgba(0,255,193,0.05)] border border-[rgba(0,255,193,0.1)] rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">What you'll get:</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                Full transcript of your call
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                Scores for 6 key sales skills
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                Specific feedback with examples
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                Actionable improvement suggestions
              </li>
            </ul>
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

  const categories = [
    { key: 'opening_rapport', label: 'Opening & Rapport', icon: MessageSquare, data: analysis.opening_rapport },
    { key: 'discovery_questions', label: 'Discovery Questions', icon: Target, data: analysis.discovery_questions },
    { key: 'pain_identification', label: 'Pain Identification', icon: Zap, data: analysis.pain_identification },
    { key: 'value_proposition', label: 'Value Proposition', icon: Award, data: analysis.value_proposition },
    { key: 'objection_handling', label: 'Objection Handling', icon: TrendingUp, data: analysis.objection_handling },
    { key: 'closing_techniques', label: 'Closing Techniques', icon: CheckCircle, data: analysis.closing_techniques },
  ]

  return (
    <div className="border-t border-[rgba(255,255,255,0.05)]">
      {/* Summary */}
      <div className="p-6 bg-[rgba(0,255,193,0.02)]">
        <h4 className="font-semibold text-white mb-2">Summary</h4>
        <p className="text-gray-300">{analysis.summary}</p>
      </div>

      {/* Scores Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className={`rounded-xl p-4 border ${getScoreBg(data.score)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(data.score)}`}>{data.score}</p>
          </div>
        ))}
      </div>

      {/* Talk/Listen Ratio */}
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
                <span className="text-white">{analysis.talk_listen_ratio.rep_percentage}%</span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ffc1]"
                  style={{ width: `${analysis.talk_listen_ratio.rep_percentage}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Prospect</span>
                <span className="text-white">{analysis.talk_listen_ratio.prospect_percentage}%</span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff9855]"
                  style={{ width: `${analysis.talk_listen_ratio.prospect_percentage}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400">{analysis.talk_listen_ratio.feedback}</p>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="px-6 pb-6 space-y-4">
        {categories.map(({ key, label, icon: Icon, data }) => (
          <div
            key={key}
            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#00ffc1]" />
                <span className="font-medium text-white">{label}</span>
              </div>
              <span className={`font-bold ${getScoreColor(data.score)}`}>{data.score}/100</span>
            </div>
            <p className="text-gray-300 text-sm mb-3">{data.feedback}</p>
            {data.highlights && data.highlights.length > 0 && (
              <div className="space-y-2">
                {data.highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="text-sm text-gray-400 pl-3 border-l-2 border-[rgba(0,255,193,0.3)] italic"
                  >
                    "{highlight}"
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Strengths & Improvements */}
      <div className="px-6 pb-6 grid md:grid-cols-2 gap-4">
        <div className="bg-[rgba(0,255,193,0.05)] border border-[rgba(0,255,193,0.1)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h4 className="font-medium text-white">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[rgba(255,152,85,0.05)] border border-[rgba(255,152,85,0.1)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-orange-400" />
            <h4 className="font-medium text-white">Key Improvements</h4>
          </div>
          <ul className="space-y-2">
            {analysis.key_improvements.map((improvement, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <Target className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transcript Toggle */}
      {transcript && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-[#00ffc1] hover:underline text-sm"
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
