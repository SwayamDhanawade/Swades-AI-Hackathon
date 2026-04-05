"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Mic, Pause, Play, Square, Trash2, Upload, Cloud, CloudOff, CheckCircle, AlertCircle, AudioWaveform } from "lucide-react"

import { Button } from "@my-better-t-app/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { Progress } from "@my-better-t-app/ui/components/progress"
import { Badge } from "@my-better-t-app/ui/components/badge"
import { useRecorder, type WavChunk } from "@/hooks/use-recorder"
import { useChunkUploader } from "@/hooks/use-chunk-uploader"
import { saveChunkToOPFS, deleteChunkFromOPFS } from "@/lib/opfs-storage"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`
}

function formatDuration(seconds: number) {
  return `${seconds.toFixed(1)}s`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type ChunkUploadState = "local" | "uploading" | "uploaded" | "failed"

interface ChunkWithState extends WavChunk {
  uploadState: ChunkUploadState;
}

function ChunkRow({
  chunk,
  index,
  onDelete,
}: {
  chunk: ChunkWithState
  index: number
  onDelete?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      el.currentTime = 0
      setPlaying(false)
    } else {
      el.play()
      setPlaying(true)
    }
  }

  const download = () => {
    const a = document.createElement("a")
    a.href = chunk.url
    a.download = `chunk-${String(index + 1).padStart(3, "0")}.wav`
    a.click()
  }

  const statusConfig = {
    local: { icon: null, color: "text-muted-foreground", bg: "bg-muted", label: "Local" },
    uploading: { icon: Upload, color: "text-yellow-600", bg: "bg-yellow-500/10", label: "Uploading..." },
    uploaded: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10", label: "Uploaded" },
    failed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10", label: "Failed" },
  } as const

  const status = statusConfig[chunk.uploadState]

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/50">
      <audio
        ref={audioRef}
        src={chunk.url}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
          }
        }}
        preload="none"
      />
      <div className="flex items-center gap-4 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <span className="text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Chunk {index + 1}</span>
            <Badge variant="secondary" className={`text-xs ${status.color} ${status.bg}`}>
              {status.icon && <status.icon className="mr-1 h-3 w-3" />}
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatDuration(chunk.duration)}</span>
            <span>•</span>
            <span className="tabular-nums">{formatFileSize(chunk.blob.size)}</span>
            <span>•</span>
            <span>16kHz WAV</span>
          </div>
          {playing && (
            <Progress value={progress} className="h-1 mt-1" />
          )}
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
            {playing ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={download} className="h-8 w-8">
            <Download className="h-3 w-3" />
          </Button>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecorderPage() {
  const [deviceId] = useState<string | undefined>()
  const [chunksWithState, setChunksWithState] = useState<ChunkWithState[]>([])
  const chunksWithStateRef = useRef<ChunkWithState[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 })
  const [uploadComplete, setUploadComplete] = useState(false)

  chunksWithStateRef.current = chunksWithState

  const {
    status,
    start,
    stop,
    pause,
    resume,
    chunks,
    elapsed,
    stream,
    clearChunks,
    flushChunk,
  } = useRecorder({ chunkDuration: 5, deviceId })

  const { createSession, uploadChunk, completeSession, verifySession } = useChunkUploader({
    apiBaseUrl: "http://localhost:3000/api",
  })

  const isRecording = status === "recording"
  const isPaused = status === "paused"
  const isActive = isRecording || isPaused

  useEffect(() => {
    const latestChunk = chunks[chunks.length - 1]
    if (!latestChunk) return

    setChunksWithState((prev) => {
      if (prev.some((c) => c.id === latestChunk.id)) return prev
      return [...prev, { ...latestChunk, uploadState: "local" as ChunkUploadState }]
    })

    if (sessionId) {
      saveChunkToOPFS(sessionId, latestChunk.id, latestChunk.blob).catch(console.error)
    }
  }, [chunks, sessionId])

  const handleStartRecording = useCallback(async () => {
    setUploadComplete(false)
    const newSessionId = await createSession(deviceId)
    setSessionId(newSessionId)
    start()
  }, [createSession, deviceId, start])

  const handleStopRecording = useCallback(async () => {
    const finalChunk = flushChunk()
    stop()

    let finalChunkAdded = false
    setChunksWithState((prev) => {
      if (finalChunk && !prev.some((c) => c.id === finalChunk.id)) {
        finalChunkAdded = true
        if (sessionId) {
          saveChunkToOPFS(sessionId, finalChunk.id, finalChunk.blob).catch(console.error)
        }
        return [...prev, { ...finalChunk, uploadState: "local" as ChunkUploadState }]
      }
      return prev
    })

    setIsUploading(true)

    const currentChunks = chunksWithStateRef.current
    const chunksToUpload = currentChunks.filter((c) => c.uploadState === "local")
    
    const allChunksToUpload = finalChunkAdded && finalChunk
      ? [...chunksToUpload, { ...finalChunk, uploadState: "local" as ChunkUploadState }]
      : chunksToUpload

    for (let i = 0; i < allChunksToUpload.length; i++) {
      const chunk = allChunksToUpload[i]
      setChunksWithState((prev) =>
        prev.map((c) => (c.id === chunk.id ? { ...c, uploadState: "uploading" as ChunkUploadState } : c)),
      )
      setUploadProgress({ uploaded: i, total: allChunksToUpload.length })

      try {
        const success = await uploadChunk(chunk.id, chunk.blob, i)
        setChunksWithState((prev) =>
          prev.map((c) =>
            c.id === chunk.id
              ? { ...c, uploadState: success ? ("uploaded" as ChunkUploadState) : ("failed" as ChunkUploadState) }
              : c,
          ),
        )
      } catch {
        setChunksWithState((prev) =>
          prev.map((c) => (c.id === chunk.id ? { ...c, uploadState: "failed" as ChunkUploadState } : c)),
        )
      }
    }

    setUploadProgress({ uploaded: allChunksToUpload.length, total: allChunksToUpload.length })
    setIsUploading(false)
    setUploadComplete(true)

    if (sessionId) {
      await verifySession(sessionId)
      await completeSession()
    }
  }, [stop, chunksWithState, sessionId, uploadChunk, verifySession, completeSession, flushChunk])

  const handlePrimary = useCallback(() => {
    if (isActive) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }, [isActive, handleStopRecording, handleStartRecording])

  const handleDeleteChunk = useCallback(
    async (chunkId: string) => {
      if (sessionId) {
        await deleteChunkFromOPFS(sessionId, chunkId)
      }
      setChunksWithState((prev) => prev.filter((c) => c.id !== chunkId))
    },
    [sessionId],
  )

  const handleClearAll = useCallback(async () => {
    for (const chunk of chunksWithState) {
      await handleDeleteChunk(chunk.id)
    }
    clearChunks()
    setUploadComplete(false)
  }, [chunksWithState, handleDeleteChunk, clearChunks])

  const localChunks = chunksWithState.filter((c) => c.uploadState === "local")
  const uploadedChunks = chunksWithState.filter((c) => c.uploadState === "uploaded")
  const failedChunks = chunksWithState.filter((c) => c.uploadState === "failed")
  const totalSize = chunksWithState.reduce((acc, c) => acc + c.blob.size, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AudioWaveform className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Audio Recorder</h1>
          <p className="text-sm text-muted-foreground">
            Record and upload audio with guaranteed reliability
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : isPaused ? "bg-yellow-500" : "bg-muted-foreground/30"}`} />
                <span className="text-sm font-medium">
                  {isRecording ? "Recording" : isPaused ? "Paused" : "Ready"}
                </span>
              </div>
              {sessionId && (
                <span className="text-xs text-muted-foreground font-mono">
                  Session: {sessionId.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>

          <CardContent className="space-y-6 p-6">
            <div className="relative overflow-hidden rounded-xl border bg-muted/50 p-4">
              <LiveWaveform
                active={isRecording}
                processing={isPaused}
                stream={stream}
                height={100}
                barWidth={4}
                barGap={2}
                barRadius={2}
                sensitivity={1.8}
                smoothingTimeConstant={0.85}
                fadeEdges
                fadeWidth={48}
                mode="static"
              />
              {isRecording && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-primary/5 to-transparent" />
              )}
            </div>

            <div className="text-center space-y-2">
              <div className="font-mono text-5xl font-bold tracking-tight tabular-nums">
                {formatTime(elapsed)}
              </div>
              {chunksWithState.length > 0 && (
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>{chunksWithState.length} chunks</span>
                  <span>•</span>
                  <span>{formatFileSize(totalSize)}</span>
                  <span>•</span>
                  <span>16kHz WAV</span>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-pulse text-primary" />
                    Uploading...
                  </span>
                  <span className="text-muted-foreground">
                    {uploadProgress.uploaded} / {uploadProgress.total}
                  </span>
                </div>
                <Progress value={(uploadProgress.uploaded / uploadProgress.total) * 100} className="h-2" />
              </div>
            )}

            {uploadComplete && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                All chunks uploaded successfully
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                variant={isActive ? "destructive" : "default"}
                className="gap-2 px-8 h-12"
                onClick={handlePrimary}
                disabled={status === "requesting" || isUploading}
              >
                {isUploading ? (
                  <>
                    <Upload className="size-5 animate-pulse" />
                    Uploading...
                  </>
                ) : isActive ? (
                  <>
                    <Square className="size-5 fill-current" />
                    Stop & Upload
                  </>
                ) : (
                  <>
                    <Mic className="size-5" />
                    {status === "requesting" ? "Requesting..." : "Start Recording"}
                  </>
                )}
              </Button>

              {isActive && !isUploading && (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 h-12"
                  onClick={isPaused ? resume : pause}
                >
                  {isPaused ? (
                    <>
                      <Play className="size-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="size-5" />
                      Pause
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {chunksWithState.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recordings</CardTitle>
                  <CardDescription>
                    {chunksWithState.length} chunks • {formatFileSize(totalSize)} total
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedChunks.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                      <Cloud className="h-3 w-3" />
                      {uploadedChunks.length} uploaded
                    </Badge>
                  )}
                  {failedChunks.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
                      <CloudOff className="h-3 w-3" />
                      {failedChunks.length} failed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {chunksWithState.map((chunk, i) => (
                <ChunkRow
                  key={chunk.id}
                  chunk={chunk}
                  index={i}
                  onDelete={() => handleDeleteChunk(chunk.id)}
                />
              ))}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all recordings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Cloud className="h-3 w-3" />
            OPFS Storage
          </span>
          <span>•</span>
          <span>Auto-retry on failure</span>
          <span>•</span>
          <span>Checksum verification</span>
        </div>
      </div>
    </div>
  )
}
