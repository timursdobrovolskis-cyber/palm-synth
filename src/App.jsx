import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import './App.css'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const SCALE_NOTES = ['C3', 'D3', 'F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5']

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
const brightnessToFrequency = (percent) => 200 + (percent / 100) * 4800

function App() {
  const [started, setStarted] = useState(false)
  const [status, setStatus] = useState('IDLE')
  const [handsDetected, setHandsDetected] = useState(0)
  const [droneStatus, setDroneStatus] = useState('Idle')
  const [volumePercent, setVolumePercent] = useState(50)
  const [reverbPercent, setReverbPercent] = useState(30)
  const [brightnessPercent, setBrightnessPercent] = useState(20)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animationRef = useRef(null)
  const streamRef = useRef(null)
  const isRunningRef = useRef(false)
  const currentNoteRef = useRef('A3')
  const leftPinchActiveRef = useRef(false)
  const rightPinchActiveRef = useRef(false)
  const rightReverbPinchActiveRef = useRef(false)
  const rightBrightnessPinchActiveRef = useRef(false)
  const savedVolumePercentRef = useRef(50)
  const currentVolumePercentRef = useRef(50)
  const savedReverbPercentRef = useRef(30)
  const currentReverbPercentRef = useRef(30)
  const savedBrightnessPercentRef = useRef(20)
  const currentBrightnessPercentRef = useRef(20)

  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (landmarkerRef.current?.close) landmarkerRef.current.close()
    }
  }, [])

  const setupAudio = async () => {
    setStatus('INITIALIZING AUDIO')

    try {
      await Tone.start()

      const filter = new Tone.Filter({
        frequency: 1200,
        type: 'lowpass',
      })

      const reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      })

      await reverb.generate()

      filter.connect(reverb)
      reverb.toDestination()

      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 1,
        },
      }).connect(filter)

      window.palmSynthAudio = { synth, filter, reverb }

      synth.triggerAttack('A3')
      currentNoteRef.current = 'A3'
      savedVolumePercentRef.current = 50
      currentVolumePercentRef.current = 50
      savedReverbPercentRef.current = 30
      currentReverbPercentRef.current = 30
      savedBrightnessPercentRef.current = 20
      currentBrightnessPercentRef.current = 20
      setVolumePercent(50)
      setReverbPercent(30)
      setBrightnessPercent(20)
      filter.frequency.value = brightnessToFrequency(20)
      synth.volume.value = -6

      console.log('Audio engine initialized')
      setStatus('ACTIVE')
    } catch (error) {
      console.error('Audio setup failed:', error)
      setStatus('FAILED')
    }
  }

  const startSession = async () => {
    if (started) return
    isRunningRef.current = true
    setStarted(true)
    setStatus('REQUESTING ACCESS')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })
      streamRef.current = stream

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
      isRunningRef.current = false
      setStarted(false)
    }
  }

  const stopSession = () => {
    isRunningRef.current = false

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }

    if (landmarkerRef.current?.close) {
      landmarkerRef.current.close()
      landmarkerRef.current = null
    }

    if (window.palmSynthAudio?.synth) {
      window.palmSynthAudio.synth.triggerRelease()
      window.palmSynthAudio.synth.dispose()
      window.palmSynthAudio.filter?.dispose?.()
      window.palmSynthAudio.reverb?.dispose?.()
      window.palmSynthAudio = null
    }

    currentNoteRef.current = 'A3'
    leftPinchActiveRef.current = false
    rightPinchActiveRef.current = false
    rightReverbPinchActiveRef.current = false
    rightBrightnessPinchActiveRef.current = false
    savedVolumePercentRef.current = 50
    currentVolumePercentRef.current = 50
    savedReverbPercentRef.current = 30
    currentReverbPercentRef.current = 30
    savedBrightnessPercentRef.current = 20
    currentBrightnessPercentRef.current = 20
    setVolumePercent(50)
    setReverbPercent(30)
    setBrightnessPercent(20)
    setDroneStatus('Idle')
    setHandsDetected(0)
    setStatus('STOPPED')
    setStarted(false)
  }

  const startDetection = () => {
    const detect = () => {
      if (!isRunningRef.current) return

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
        const handedness = result?.handedness ?? result?.handednesses ?? []

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

        if (window.palmSynthAudio) {
          const leftHandIndex = handedness.findIndex(h => h[0].categoryName === 'Left')
          const rightHandIndex = handedness.findIndex(h => h[0].categoryName === 'Right')

          const leftHand = leftHandIndex >= 0 ? hands[leftHandIndex] : null
          const leftThumbTip = leftHand?.[4]
          const leftIndexTip = leftHand?.[8]
          const leftPinched =
            !!leftThumbTip &&
            !!leftIndexTip &&
            Math.hypot(leftThumbTip.x - leftIndexTip.x, leftThumbTip.y - leftIndexTip.y) < 0.05

          if (leftPinched && !leftPinchActiveRef.current) {
            leftPinchActiveRef.current = true
            setDroneStatus('Drone edit mode')
          } else if (!leftPinched && leftPinchActiveRef.current) {
            leftPinchActiveRef.current = false
            rightPinchActiveRef.current = false
            if (rightReverbPinchActiveRef.current) {
              rightReverbPinchActiveRef.current = false
              savedReverbPercentRef.current = currentReverbPercentRef.current
              setReverbPercent(savedReverbPercentRef.current)
              setDroneStatus(`Reverb saved: ${savedReverbPercentRef.current}%`)
            } else if (rightBrightnessPinchActiveRef.current) {
              rightBrightnessPinchActiveRef.current = false
              savedBrightnessPercentRef.current = currentBrightnessPercentRef.current
              setBrightnessPercent(savedBrightnessPercentRef.current)
              setDroneStatus(`Brightness saved: ${savedBrightnessPercentRef.current}%`)
            } else if (rightPinchActiveRef.current) {
              savedVolumePercentRef.current = currentVolumePercentRef.current
              setVolumePercent(savedVolumePercentRef.current)
              setDroneStatus(`Volume saved: ${savedVolumePercentRef.current}%`)
            }
          }

          if (leftPinchActiveRef.current) {
            const rightHand = rightHandIndex >= 0 ? hands[rightHandIndex] : null
            const rightThumbTip = rightHand?.[4]
            const rightIndexTip = rightHand?.[8]
            const rightMiddleTip = rightHand?.[12]
            const rightRingTip = rightHand?.[16]
            const rightPinched =
              !!rightThumbTip &&
              !!rightIndexTip &&
              Math.hypot(rightThumbTip.x - rightIndexTip.x, rightThumbTip.y - rightIndexTip.y) < 0.05
            const rightReverbPinched =
              !!rightThumbTip &&
              !!rightMiddleTip &&
              Math.hypot(rightThumbTip.x - rightMiddleTip.x, rightThumbTip.y - rightMiddleTip.y) < 0.05
            const rightBrightnessPinched =
              !!rightThumbTip &&
              !!rightRingTip &&
              Math.hypot(rightThumbTip.x - rightRingTip.x, rightThumbTip.y - rightRingTip.y) < 0.05

            if (rightReverbPinched) {
              rightPinchActiveRef.current = false
              rightBrightnessPinchActiveRef.current = false
              const reverbValue = Math.round(clamp(1 - rightMiddleTip.y, 0, 1) * 100)
              currentReverbPercentRef.current = reverbValue
              setReverbPercent(reverbValue)
              window.palmSynthAudio.reverb.wet.value = reverbValue / 100
              setDroneStatus(`Editing reverb: ${reverbValue}%`)
              rightReverbPinchActiveRef.current = true
            } else if (rightReverbPinchActiveRef.current) {
              rightReverbPinchActiveRef.current = false
              savedReverbPercentRef.current = currentReverbPercentRef.current
              setReverbPercent(savedReverbPercentRef.current)
              setDroneStatus(`Reverb saved: ${savedReverbPercentRef.current}%`)
            } else if (rightBrightnessPinched) {
              rightPinchActiveRef.current = false
              rightReverbPinchActiveRef.current = false
              const brightnessValue = Math.round(clamp(1 - rightRingTip.y, 0, 1) * 100)
              currentBrightnessPercentRef.current = brightnessValue
              setBrightnessPercent(brightnessValue)
              window.palmSynthAudio.filter.frequency.value = brightnessToFrequency(brightnessValue)
              setDroneStatus(`Editing brightness: ${brightnessValue}%`)
              rightBrightnessPinchActiveRef.current = true
            } else if (rightBrightnessPinchActiveRef.current) {
              rightBrightnessPinchActiveRef.current = false
              savedBrightnessPercentRef.current = currentBrightnessPercentRef.current
              setBrightnessPercent(savedBrightnessPercentRef.current)
              setDroneStatus(`Brightness saved: ${savedBrightnessPercentRef.current}%`)
            } else if (rightPinched) {
              rightReverbPinchActiveRef.current = false
              rightBrightnessPinchActiveRef.current = false
              const volumePercent = Math.round(clamp(1 - rightIndexTip.y, 0, 1) * 100)
              currentVolumePercentRef.current = volumePercent
              setVolumePercent(volumePercent)
              window.palmSynthAudio.synth.volume.value = -18 + (volumePercent / 100) * 24
              setDroneStatus(`Editing volume: ${volumePercent}%`)
              rightPinchActiveRef.current = true
            } else if (rightPinchActiveRef.current) {
              rightPinchActiveRef.current = false
              savedVolumePercentRef.current = currentVolumePercentRef.current
              setVolumePercent(savedVolumePercentRef.current)
              setDroneStatus(`Volume saved: ${savedVolumePercentRef.current}%`)
            }
          }

          // Update pitch based on left hand index finger height
          if (leftHandIndex >= 0) {
            const pitchHand = hands[leftHandIndex]
            const indexTip = pitchHand?.[8] // Index finger tip
            if (indexTip) {
              // Map finger Y position to scale notes (0 = high = C5, 1 = low = C3)
              const noteIndex = Math.floor(clamp(1 - indexTip.y, 0, 1) * (SCALE_NOTES.length - 1))
              const note = SCALE_NOTES[noteIndex]
              if (note !== currentNoteRef.current) {
                window.palmSynthAudio.synth.setNote(note)
                currentNoteRef.current = note
              }
            }
          }
        }

        setHandsDetected(hands.length)
        console.log(`Hands detected: ${hands.length}`)
      }

      if (isRunningRef.current) {
        animationRef.current = requestAnimationFrame(detect)
      }
    }

    if (isRunningRef.current) {
      animationRef.current = requestAnimationFrame(detect)
    }
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
          <div className="control-panel">
            <div className="control-title">Selected Sound</div>
            <div className="selected-sound">DRONE</div>
            <div className="parameters-title">Parameters</div>
            <div className="parameter-row">
              <span>Volume:</span>
              <span>{volumePercent}%</span>
            </div>
            <div className="parameter-row">
              <span>Reverb:</span>
              <span>{reverbPercent}%</span>
            </div>
            <div className="parameter-row">
              <span>Brightness:</span>
              <span>{brightnessPercent}%</span>
            </div>
            <div className="parameter-row">
              <span>Texture:</span>
              <span>0%</span>
            </div>
            <div className="control-status">{droneStatus}</div>
          </div>
          <div className="specs">
            <div className="spec-line">SYSTEM: {status}</div>
            <div className="spec-line">HANDS DETECTED: {handsDetected}</div>
          </div>
          <button className="start-btn" onClick={startSession} disabled={started}>
            {started ? '[ ACTIVE ]' : '[ START ]'}
          </button>
          <button className="stop-btn" onClick={stopSession} disabled={!started}>
            [ STOP ]
          </button>
        </div>

        <div className="center-panel">
          <div className="viewer">
            <video ref={videoRef} className="video mirrored" muted playsInline />
            <canvas ref={canvasRef} className="overlay mirrored" />
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
