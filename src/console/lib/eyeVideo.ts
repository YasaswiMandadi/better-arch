import { EYE_MAX_CLIP_SECONDS, EYE_MAX_STORED_MB, EYE_MAX_UPLOAD_MB } from '../../data/homeEye'

/**
 * Turns the client's video file into the small greyscale loop the homepage eye uses,
 * entirely in the browser: trim → scale down → greyscale → record (WebM, or MP4 in Safari).
 * Recording runs in real time, so a 10-second clip takes about 10 seconds.
 */

export const QUALITIES = {
  light: { label: 'Light (smallest file)', width: 480, bitrate: 350_000 },
  standard: { label: 'Standard (recommended)', width: 640, bitrate: 600_000 },
  high: { label: 'High (sharper, bigger)', width: 800, bitrate: 1_000_000 },
} as const
export type Quality = keyof typeof QUALITIES

/** Checks a picked file before anything is loaded. Returns an error message, or null when it's fine. */
export function checkVideoFile(file: File): string | null {
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|ogv|mkv)$/i.test(file.name)) return 'That is not a video file. Pick an MP4, MOV or WebM video.'
  const mb = file.size / 1048576
  if (mb > EYE_MAX_UPLOAD_MB) return `This file is ${mb.toFixed(0)} MB; the maximum is ${EYE_MAX_UPLOAD_MB} MB. Trim or export a shorter/smaller version first.`
  if (file.size === 0) return 'This file is empty.'
  return null
}

export function canConvertHere(): string | null {
  if (typeof MediaRecorder === 'undefined') return "This browser can't convert videos. Use Chrome, Edge or Firefox on a computer."
  const c = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: unknown }
  if (typeof c.captureStream !== 'function') return "This browser can't convert videos. Use Chrome, Edge or Firefox on a computer."
  return null
}

function pickMime(): string {
  const options = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4']
  for (const m of options) if (MediaRecorder.isTypeSupported(m)) return m
  return ''
}

/** Loads a file into a hidden video element and resolves once its length is known. */
export function probeVideo(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.preload = 'metadata'
    const done = () => { const r = { duration: v.duration, width: v.videoWidth, height: v.videoHeight }; v.removeAttribute('src'); v.load(); resolve(r) }
    v.onloadedmetadata = () => {
      if (isFinite(v.duration) && v.duration > 0) done()
      else { v.currentTime = 1e9; v.ontimeupdate = () => { v.ontimeupdate = null; done() } } // some files report their length late
    }
    v.onerror = () => reject(new Error("This browser can't play that video. Try exporting it as MP4 (H.264)."))
    v.src = url
  })
}

export interface ConvertResult { blob: Blob; mime: string; duration: number; width: number; height: number }

export async function convertEyeVideo(
  url: string,
  opts: { start: number; end: number; quality: Quality },
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<ConvertResult> {
  const why = canConvertHere()
  if (why) throw new Error(why)
  const start = Math.max(0, opts.start)
  const end = Math.min(opts.end, start + EYE_MAX_CLIP_SECONDS)
  if (end - start < 0.5) throw new Error('Choose at least half a second of video.')
  const q = QUALITIES[opts.quality]

  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
  await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("This browser can't play that video.")) })
  await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = start })

  const w = Math.min(q.width, v.videoWidth || q.width)
  const h = Math.max(2, Math.round((w * (v.videoHeight || 9)) / (v.videoWidth || 16) / 2) * 2)
  const canvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not start the converter.')
  const filterOk = 'filter' in ctx
  if (filterOk) ctx.filter = 'grayscale(1)'
  const grey = () => { // browsers without canvas filters: greyscale by hand
    const img = ctx.getImageData(0, 0, w, h), d = img.data
    for (let i = 0; i < d.length; i += 4) { const y = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = d[i + 1] = d[i + 2] = y }
    ctx.putImageData(img, 0, 0)
  }
  const draw = () => { ctx.drawImage(v, 0, 0, w, h); if (!filterOk) grey() }
  draw()

  const mime = pickMime()
  if (!mime) throw new Error("This browser can't record video. Use Chrome, Edge or Firefox on a computer.")
  const stream = canvas.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: q.bitrate })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  let stopResolve: () => void = () => {}
  const stopped = new Promise<void>((res) => { stopResolve = res; rec.onstop = () => res() })

  // The clip is done when the video reaches the end point, or the file itself ends. A video's
  // clock can stop a few milliseconds short of its own length, and no new frame arrives after the
  // last one, so "ended", a one-frame tolerance, a watchdog and a hard time limit all finish it.
  const FRAME = 1 / 30
  const atEnd = () => v.ended || v.currentTime >= end - FRAME
  let finished = false
  let watchdog: ReturnType<typeof setInterval> | undefined
  const finish = () => {
    if (finished) return
    finished = true
    clearInterval(watchdog)
    v.removeEventListener('ended', finish)
    draw() // keep the very last frame
    v.pause()
    if (rec.state !== 'inactive') rec.stop()
    setTimeout(() => stopResolve(), 5000) // the recorder never confirmed: carry on with what it gave
  }
  signal.addEventListener('abort', finish)
  v.addEventListener('ended', finish)
  const tick = () => {
    if (finished) return
    draw()
    onProgress(Math.min(0.99, (v.currentTime - start) / (end - start)))
    if (atEnd()) { finish(); return }
    const rv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
    if (rv.requestVideoFrameCallback) rv.requestVideoFrameCallback(tick); else requestAnimationFrame(tick)
  }
  const deadline = Date.now() + ((end - start) * 2 + 15) * 1000 // never wait forever
  let lastTime = -1, stalledSince = Date.now()
  watchdog = setInterval(() => {
    if (finished) return
    if (atEnd() || Date.now() > deadline) { finish(); return }
    if (v.currentTime !== lastTime) { lastTime = v.currentTime; stalledSince = Date.now(); return }
    if (v.paused) v.play().catch(() => {}) // e.g. paused by the browser: carry on
    if (Date.now() - stalledSince > 4000) finish() // stuck on one frame for 4 s: keep what we have
  }, 250)
  rec.start(250)
  try { await v.play() } catch { finish() }
  tick()
  await stopped
  signal.removeEventListener('abort', finish)
  v.removeAttribute('src'); v.load()
  stream.getTracks().forEach((t) => t.stop())
  if (signal.aborted) throw new Error('Conversion cancelled.')
  const blob = new Blob(chunks, { type: mime.split(';')[0] })
  if (!blob.size) throw new Error('The conversion produced no video. Try another browser (Chrome works best).')
  if (blob.size > EYE_MAX_STORED_MB * 1048576) {
    throw new Error(`The converted video is ${(blob.size / 1048576).toFixed(1)} MB; the limit is ${EYE_MAX_STORED_MB} MB. Choose a shorter part or a lighter quality.`)
  }
  onProgress(1)
  return { blob, mime: mime.split(';')[0], duration: end - start, width: w, height: h }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''))
    r.onerror = () => reject(new Error('Could not read the converted video.'))
    r.readAsDataURL(blob)
  })
}
