import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import './App.css'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const SCALE_NOTES = ['C3', 'D3', 'F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5']

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

function App() {
  const [started, setStarted] = useState(false)
  const [status, setStatus] = useState('IDLE')
  const [handsDetected, setHandsDetected] = useState(0)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (landmarkerRef.current?.close) landmarkerRef.current.close()
    }
  }, [])

  const setupAudio = async () => {
    setStatus('INITIALIZING AUDIO')
    
    try {
      // Initialize Tone.js audio context
      await Tone.start()
      
      // Create filter
      const filter = new Tone.Filter({
        frequency: 1200,
        type: 'lowpass',
      })
      
      // Create reverb
      const reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      })
      
      // Chain: synth → filter → reverb → destination
      filter.connect(reverb)
      reverb.toDestination()
      
      // Create synth and connect to filter
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 1,
        },
      }).connect(filter)
      
      // Store in refs for later control
      window.palmSynthAudio = { synth, filter, reverb }
      
      // Start with ambient note
      synth.triggerAttack('A3')
      
      console.log('Audio engine initialized')
      setStatus('ACTIVE')
    } catch (error) {
      console.error('Audio setup failed:', error)
      setStatus('FAILED')
    }
  }

  const startSession = async () => {
    if (started) return
    setStarted(true)
    setStatus('REQUESTING ACCESS')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })

      const video = videoRef.current
      if (!video) throw new Error('Video element missing')
      video.srcObject = stream
      await video.play()

      setStatus('LOADING MODEL')
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
      })

      landmarkerRef.current = handLandmarker
      await setupAudio()
      startDetection()
    } catch (error) {
      console.error('Start failed:', error)
      setStatus('FAILED')
    }
  }

  const startDetection = () => {
    const detect = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current

      if (video && canvas && landmarker && video.readyState >= 2) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const result = landmarker.detectForVideo(video, performance.now())
        const hands = result?.landmarks || []
        const handedness = result?.handedness || []

        // Hand skeleton connections (MediaPipe 21-point hand model)
        const connections = [
          // Thumb: 1->2->3->4
          [0, 1], [1, 2], [2, 3], [3, 4],
          // Index: 5->6->7->8
          [0, 5], [5, 6], [6, 7], [7, 8],
          // Middle: 9->10->11->12
          [0, 9], [9, 10], [10, 11], [11, 12],
          // Ring: 13->14->15->16
          [0, 13], [13, 14], [14, 15], [15, 16],
          // Pinky: 17->18->19->20
          [0, 17], [17, 18], [18, 19], [19, 20],
          // Palm connections
          [5, 9], [9, 13], [13, 17],
        ]

        // Draw skeleton lines
        hands.forEach((hand) => {
          ctx.strokeStyle = '#FF6600'
          ctx.lineWidth = 2
          connections.forEach(([start, end]) => {
            const p1 = hand[start]
            const p2 = hand[end]
            if (!p1 || !p2) return
            ctx.beginPath()
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height)
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height)
            ctx.stroke()
          })
        })

        // Draw landmark dots
        hands.forEach((hand) => {
          hand.forEach((point) => {
            if (!point) return
            const x = point.x * canvas.width
            const y = point.y * canvas.height
            ctx.beginPath()
            ctx.fillStyle = '#FF6600'
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.fill()
          })
        })

        // Update synth volume based on hand height
        if (hands.length > 0 && window.palmSynthAudio) {
          const avgY = hands.reduce((sum, hand) => {
            const wrist = hand[0]
            return sum + (wrist?.y || 0)
          }, 0) / hands.length
          
          // Hand high on screen (low Y) = louder, hand low (high Y) = quieter
          const volume = clamp(1 - avgY, 0, 1)
          window.palmSynthAudio.synth.volume.value = -20 + volume * 20 // Range: -20dB to 0dB
        }

        // Update pitch based on left hand index finger height
        if (window.palmSynthAudio) {
          const leftHandIndex = handedness.findIndex(h => h[0].categoryName === 'Left')
          if (leftHandIndex >= 0) {
            const leftHand = hands[leftHandIndex]
            const indexTip = leftHand?.[8] // Index finger tip
            if (indexTip) {
              // Map finger Y position to scale notes (0 = high = C5, 1 = low = C3)
              const noteIndex = Math.floor(clamp(1 - indexTip.y, 0, 1) * (SCALE_NOTES.length - 1))
              const note = SCALE_NOTES[noteIndex]
              window.palmSynthAudio.synth.frequency.value = Tone.Frequency(note).toFrequency()
            }
          }
        }

        setHandsDetected(hands.length)
        console.log(`Hands detected: ${hands.length}`)
      }

      animationRef.current = requestAnimationFrame(detect)
    }

    animationRef.current = requestAnimationFrame(detect)
  }

  return (
    <div className="app-shell">
      <div className="header">
        <div className="badge">[ PALM SYNTH ]</div>
        <h1>KINETIC AUDIO ENGINE</h1>
        <div className="tagline">Hand-controlled ambient synthesis system</div>
      </div>

      <div className="main-grid">
        <div className="left-panel">
          <div className="status-box">
            <div className="status-label">SYSTEM STATUS</div>
            <div className="status-value">{status}</div>
          </div>
          <div className="specs">
            <div className="spec-line">HANDS DETECTED: {handsDetected}</div>
          </div>
          <button className="start-btn" onClick={startSession} disabled={started}>
            {started ? '[ ACTIVE ]' : '[ START ]'}
          </button>
        </div>

        <div className="center-panel">
          <div className="viewer">
            <video ref={videoRef} className="video" muted playsInline />
            <canvas ref={canvasRef} className="overlay" />
          </div>
        </div>

        <div className="right-panel">
          <div className="metrics-box">
            <div className="metric">
              <div className="metric-label">TRACKING</div>
              <div className="metric-value">{handsDetected > 0 ? 'LIVE' : 'IDLE'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
