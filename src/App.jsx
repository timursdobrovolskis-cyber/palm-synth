import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import './App.css'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const DRONE_NOTES = ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4']
const DRONE_PRESETS = [
  { label: 'Fog',    oscillator: 'triangle', attack: 0.10, release: 1.0, grungeDrive: 0.22, grungeGain: 0.18 },
  { label: 'Sine',   oscillator: 'sine',     attack: 0.30, release: 2.0, grungeDrive: 0.06, grungeGain: 0.06 },
  { label: 'Buzz',   oscillator: 'sawtooth', attack: 0.05, release: 0.7, grungeDrive: 0.42, grungeGain: 0.30 },
  { label: 'Square', oscillator: 'square',   attack: 0.04, release: 0.5, grungeDrive: 0.52, grungeGain: 0.36 },
  { label: 'Dream',  oscillator: 'sine',     attack: 0.60, release: 3.5, grungeDrive: 0.00, grungeGain: 0.00 },
]
const DRUM_PRESETS = ['Lo-Fi', 'Jungle', 'Breakbeat', 'Glitch', 'Garage']
const JUNGLE_LOOP_VARIATIONS = [
  { label: 'A', bpm: 180, beats: 16, url: '/samples/jungle/amen-break-remake-compressed-loop-180bpm.mp3' },
  { label: 'B', bpm: 180, beats: 16, url: '/samples/jungle/breakbeat-180bpm-scydan.mp3' },
  { label: 'C', bpm: 174, beats: 8, url: '/samples/jungle/dnb-break-174bpm-crash-358.mp3' },
  { label: 'D', bpm: 170, beats: 8, url: '/samples/jungle/broke-170bpm-el-bardo.mp3' },
]
const LOFI_LOOP_VARIATIONS = [
  { label: 'A', bpm: 70, beats: 16, url: '/samples/lo-fi/looperman-l-1665991-0415972-lofi-drums-chil.wav' },
  { label: 'B', bpm: 85, beats: 8, url: '/samples/lo-fi/looperman-l-7823406-0407672-lofi-drum-loop.wav' },
  { label: 'C', bpm: 86, beats: 16, url: '/samples/lo-fi/looperman-l-1929922-0121076-alabafruit-lofi-hip-hop-drum-muffled-and-dusty.wav' },
  { label: 'D', bpm: 95, beats: 16, url: '/samples/lo-fi/looperman-l-1929922-0199627-hard-lofi-boom-bap-hip-hop-old-school-drums-beat-95-bpm.wav' },
]
const GARAGE_LOOP_VARIATIONS = [
  { label: 'A', bpm: 135, beats: 4, url: '/samples/garage/looperman-l-8385368-0427172-135-ukg-swing-drums.wav' },
  { label: 'B', bpm: 132, beats: 32, url: '/samples/garage/looperman-l-7108189-0414091-uk-garage-drums-following-orders.wav' },
  { label: 'C', bpm: 140, beats: 32, url: '/samples/garage/looperman-l-7108189-0411985-uk-garage-drums-2-step-4-step.wav' },
  { label: 'D', bpm: 130, beats: 32, url: '/samples/garage/looperman-l-7108189-0410178-experimental-garage-drums-pop-pop.wav' },
]
const BASS_PATTERNS = [
  { label: 'Root Pulse', notes: [[0, 'A1', 0], [4, 'A1', 45], [8, 'A1', 0], [12, 'E2', 55], [14, 'G2', 75]] },
  { label: 'Rolling', notes: [[0, 'A1', 0], [3, 'E2', 40], [6, 'G2', 55], [8, 'A1', 0], [11, 'C2', 45], [14, 'E2', 65]] },
  { label: 'Dub Step', notes: [[0, 'A1', 0], [6, 'A2', 50], [8, 'G1', 0], [12, 'E2', 45], [15, 'C2', 70]] },
  { label: 'Jungle Roll', notes: [[0, 'A1', 0], [2, 'A2', 55], [5, 'G2', 45], [7, 'E2', 65], [8, 'A1', 0], [10, 'C2', 50], [13, 'E2', 60], [15, 'G2', 75]] },
]
const BASS_CHARACTERS = [
  { label: 'Reese', oscillator: 'sawtooth', filterFrequency: 900, presenceFrequency: 700, presenceGain: 0.34, level: 0.96, decay: 0.18, sustain: 0.38, release: 0.2, filterOctaves: 2.2 },
  { label: 'Pluck', oscillator: 'square', filterFrequency: 1500, presenceFrequency: 820, presenceGain: 0.3, level: 0.92, decay: 0.1, sustain: 0.14, release: 0.1, filterOctaves: 2.8 },
  { label: '808', oscillator: 'sine', filterFrequency: 720, presenceFrequency: 420, presenceGain: 0.5, level: 1.14, decay: 0.3, sustain: 0.62, release: 0.72, filterOctaves: 1.4 },
  { label: 'Acid', oscillator: 'square', filterFrequency: 1850, presenceFrequency: 980, presenceGain: 0.44, level: 0.98, decay: 0.12, sustain: 0.26, release: 0.14, filterOctaves: 3.5 },
]
const SYNTH_PATTERNS = [
  { label: 'Pad Chords', notes: [[0, ['A3', 'C4', 'E4'], 0], [8, ['G3', 'C4', 'E4'], 35]] },
  { label: 'Broken Chords', notes: [[0, ['A3'], 0], [2, ['C4'], 35], [4, ['E4'], 0], [6, ['G4'], 55], [8, ['A4'], 0], [10, ['E4'], 35], [12, ['C4'], 0], [14, ['G3'], 55]] },
  { label: 'Digital Pulse', notes: [[0, ['A3', 'E4'], 0], [4, ['C4', 'G4'], 45], [8, ['G3', 'D4'], 0], [12, ['E4', 'A4'], 55]] },
  { label: 'Dream Arp', notes: [[0, ['A3'], 0], [3, ['E4'], 35], [6, ['C4'], 45], [8, ['G4'], 0], [11, ['E4'], 35], [14, ['C5'], 60]] },
]
const SYNTH_PRESETS = [
  { label: '90s Digital', oscillator: 'square', filterFrequency: 3200, attack: 0.04, release: 0.45 },
  { label: 'Analog Poly', oscillator: 'sawtooth', filterFrequency: 1800, attack: 0.08, release: 0.65 },
  { label: 'FM Keys', oscillator: 'sine', filterFrequency: 4200, attack: 0.01, release: 0.28 },
  { label: 'Acid Pluck', oscillator: 'square', filterFrequency: 1400, attack: 0.005, release: 0.12 },
  { label: 'Organ Synth', oscillator: 'triangle', filterFrequency: 2600, attack: 0.03, release: 0.5 },
  { label: 'Dream Pad', oscillator: 'sine', filterFrequency: 2200, attack: 0.3, release: 1.2 },
]

// Each step entry: [stepIndex, toneVelocity, minDensity]
// minDensity = the density% threshold below which this step is silent
const DRUM_GROOVE_PRESETS = {
  'Lo-Fi': {
    drumBusGain: 1.08, drumOutputGain: 1.18, drumSendGain: 0.11,
    cymbalBusGain: 1.12, cymbalOutputGain: 1.08, cymbalSendGain: 0.1,
    cymbalFilterFrequency: 4200, cymbalFilterQ: 0.85,
    filterFrequency: 1800, filterQ: 0.78,
    kick:  { volume: 3, pitchDecay: 0.045, octaves: 2.0 },
    snare: { volume: 1, decay: 0.26, noise: 'pink' },
    hat:   { volume: -7, decay: 0.07 },
    openHat: { volume: -2, decay: 0.14 },
    ride: { volume: 1, decay: 0.28, noise: 'white' },
    crash: { volume: 3, decay: 0.75, noise: 'white' },
    ghostSnare: { volume: -8, decay: 0.08, noise: 'pink' },
    rim: { volume: -4, decay: 0.05, noise: 'white' },
    lowTom: { volume: -7, pitchDecay: 0.02, octaves: 1.2 },
    texture: { volume: -18 },
    patterns: {
      kick:  [[0, 0.58, 0], [8, 0.54, 0]],
      snare: [[4, 0.22, 0], [12, 0.22, 0]],
      hat:   [[0, 0.07, 0], [8, 0.06, 0], [4, 0.05, 25], [12, 0.05, 25]],
      openHat: [[7, 0.04, 55], [15, 0.04, 55]],
      ride: [[3, 0.05, 55], [7, 0.05, 55], [11, 0.05, 55], [15, 0.05, 55]],
      crash: [[0, 0.06, 85]],
      ghostSnare: [[11, 0.04, 70]],
      rim: [[2, 0.03, 65], [10, 0.03, 65]],
      lowTom: [],
      texture: [[15, 0.04, 0]],
    },
  },
  'Jungle': {
    drumBusGain: 1.22, drumOutputGain: 1.3, drumSendGain: 0.08,
    cymbalBusGain: 1.24, cymbalOutputGain: 1.12, cymbalSendGain: 0.12,
    cymbalFilterFrequency: 5200, cymbalFilterQ: 0.9,
    filterFrequency: 4200, filterQ: 1.3,
    kick:  { volume: 2, pitchDecay: 0.015, octaves: 1.9 },
    snare: { volume: 0, decay: 0.08, noise: 'white' },
    hat:   { volume: -4, decay: 0.016 },
    openHat: { volume: 0, decay: 0.06 },
    ride: { volume: 3, decay: 0.22, noise: 'white' },
    crash: { volume: 4, decay: 0.8, noise: 'white' },
    ghostSnare: { volume: -10, decay: 0.05, noise: 'white' },
    rim: { volume: -3, decay: 0.03, noise: 'white' },
    lowTom: { volume: -10, pitchDecay: 0.015, octaves: 1.4 },
    texture: { volume: -20 },
    patterns: {
      kick:  [[0, 0.70, 0], [3, 0.62, 0], [7, 0.58, 0], [10, 0.54, 0], [5, 0.48, 55], [13, 0.46, 55]],
      snare: [[4, 0.30, 0], [12, 0.28, 0], [9, 0.12, 35], [15, 0.10, 35]],
      hat:   [
        [0, 0.13, 0], [1, 0.11, 0], [2, 0.12, 0], [3, 0.11, 0],
        [4, 0.13, 0], [5, 0.11, 0], [6, 0.12, 0], [7, 0.11, 0],
        [8, 0.13, 0], [9, 0.11, 0], [10, 0.12, 0], [11, 0.11, 0],
        [12, 0.13, 0], [13, 0.11, 0], [14, 0.12, 0], [15, 0.11, 0],
      ],
      openHat: [[3, 0.06, 45], [7, 0.06, 45], [11, 0.06, 45], [15, 0.06, 45]],
      ride: [[0, 0.06, 55], [2, 0.06, 55], [4, 0.06, 55], [6, 0.06, 55], [8, 0.06, 55], [10, 0.06, 55], [12, 0.06, 55], [14, 0.06, 55]],
      crash: [[0, 0.08, 70], [8, 0.08, 75]],
      ghostSnare: [[1, 0.06, 35], [3, 0.08, 35], [9, 0.08, 35], [15, 0.07, 35]],
      rim: [[2, 0.06, 55], [6, 0.06, 55], [10, 0.06, 55], [14, 0.06, 55]],
      lowTom: [[5, 0.08, 65], [11, 0.08, 65], [13, 0.07, 75]],
      texture: [[1, 0.04, 30], [5, 0.04, 45], [7, 0.04, 55], [13, 0.04, 70]],
    },
  },
  'Breakbeat': {
    drumBusGain: 1.24, drumOutputGain: 1.34, drumSendGain: 0.12,
    cymbalBusGain: 1.2, cymbalOutputGain: 1.1, cymbalSendGain: 0.11,
    cymbalFilterFrequency: 5000, cymbalFilterQ: 0.88,
    filterFrequency: 2800, filterQ: 0.86,
    kick:  { volume: 4, pitchDecay: 0.05, octaves: 2.2 },
    snare: { volume: 3, decay: 0.20, noise: 'pink' },
    hat:   { volume: -2, decay: 0.05 },
    openHat: { volume: 1, decay: 0.08 },
    ride: { volume: 2, decay: 0.2, noise: 'white' },
    crash: { volume: 4, decay: 0.7, noise: 'white' },
    ghostSnare: { volume: -9, decay: 0.08, noise: 'pink' },
    rim: { volume: -4, decay: 0.04, noise: 'white' },
    lowTom: { volume: -8, pitchDecay: 0.02, octaves: 1.5 },
    texture: { volume: -20 },
    patterns: {
      kick:  [[0, 0.70, 0], [6, 0.60, 0], [8, 0.66, 0], [14, 0.58, 0], [2, 0.46, 65], [10, 0.44, 65]],
      snare: [[4, 0.36, 0], [12, 0.34, 0]],
      hat:   [
        [0, 0.13, 0], [2, 0.11, 0], [4, 0.12, 0], [6, 0.11, 0],
        [8, 0.12, 0], [10, 0.11, 0], [12, 0.12, 0], [14, 0.11, 0],
        [13, 0.09, 65], [15, 0.09, 65],
      ],
      openHat: [[3, 0.06, 55], [7, 0.06, 55], [11, 0.06, 55], [15, 0.06, 55]],
      ride: [[0, 0.06, 55], [4, 0.06, 55], [8, 0.06, 55], [12, 0.06, 55]],
      crash: [[0, 0.08, 75], [8, 0.08, 75], [15, 0.08, 85]],
      ghostSnare: [[3, 0.08, 40], [7, 0.08, 40], [11, 0.08, 40], [14, 0.08, 40]],
      rim: [[5, 0.06, 50], [13, 0.06, 50]],
      lowTom: [[9, 0.08, 65], [15, 0.08, 70]],
      texture: [[1, 0.04, 40], [7, 0.04, 60], [14, 0.04, 70]],
    },
  },
  'Glitch': {
    drumBusGain: 1.1, drumOutputGain: 1.22, drumSendGain: 0.08,
    cymbalBusGain: 1.16, cymbalOutputGain: 1.12, cymbalSendGain: 0.1,
    cymbalFilterFrequency: 6200, cymbalFilterQ: 0.9,
    filterFrequency: 6200, filterQ: 1.1,
    kick:  { volume: 2, pitchDecay: 0.012, octaves: 1.6 },
    snare: { volume: 0, decay: 0.08, noise: 'white' },
    hat:   { volume: -3, decay: 0.018 },
    openHat: { volume: 0, decay: 0.04 },
    ride: { volume: 1, decay: 0.14, noise: 'white' },
    crash: { volume: 3, decay: 0.55, noise: 'white' },
    ghostSnare: { volume: -12, decay: 0.04, noise: 'white' },
    rim: { volume: 0, decay: 0.02, noise: 'white' },
    lowTom: { volume: -12, pitchDecay: 0.01, octaves: 1.0 },
    texture: { volume: -16 },
    patterns: {
      kick:  [[0, 0.65, 0], [5, 0.58, 0], [10, 0.52, 0], [2, 0.42, 65], [13, 0.40, 75]],
      snare: [[8, 0.28, 0], [3, 0.10, 35], [11, 0.09, 55], [14, 0.08, 75]],
      hat:   [
        [1, 0.06, 0], [3, 0.11, 0], [6, 0.06, 0], [7, 0.11, 0],
        [8, 0.12, 0], [10, 0.05, 0], [14, 0.05, 0], [15, 0.10, 0],
        [0, 0.06, 70], [9, 0.06, 70],
      ],
      openHat: [[7, 0.06, 60], [15, 0.06, 70]],
      ride: [[1, 0.05, 65], [3, 0.05, 65], [6, 0.05, 65], [9, 0.05, 65], [12, 0.05, 65], [15, 0.05, 75]],
      crash: [[0, 0.06, 80], [8, 0.06, 85], [14, 0.06, 90]],
      ghostSnare: [[2, 0.06, 50], [6, 0.06, 60], [10, 0.06, 70], [12, 0.06, 75]],
      rim: [[1, 0.05, 55], [5, 0.05, 65], [9, 0.05, 70], [13, 0.05, 75]],
      lowTom: [[11, 0.07, 75]],
      texture: [[4, 0.04, 50], [8, 0.04, 60], [12, 0.04, 70]],
    },
  },
  'Garage': {
    drumBusGain: 1.2, drumOutputGain: 1.3, drumSendGain: 0.1,
    cymbalBusGain: 1.18, cymbalOutputGain: 1.08, cymbalSendGain: 0.11,
    cymbalFilterFrequency: 4500, cymbalFilterQ: 0.86,
    filterFrequency: 3000, filterQ: 0.88,
    kick:  { volume: 6, pitchDecay: 0.028, octaves: 2.4 },
    snare: { volume: 3, decay: 0.18, noise: 'pink' },
    hat:   { volume: -2, decay: 0.04 },
    openHat: { volume: 0, decay: 0.08 },
    ride: { volume: 1, decay: 0.22, noise: 'white' },
    crash: { volume: 3, decay: 0.6, noise: 'white' },
    ghostSnare: { volume: -8, decay: 0.06, noise: 'pink' },
    rim: { volume: -2, decay: 0.035, noise: 'white' },
    lowTom: { volume: -9, pitchDecay: 0.02, octaves: 1.2 },
    texture: { volume: -18 },
    patterns: {
      kick:  [[0, 0.70, 0], [7, 0.62, 0], [10, 0.56, 0], [5, 0.48, 60], [13, 0.42, 75]],
      snare: [[12, 0.30, 0], [4, 0.28, 35]],
      hat:   [[2, 0.13, 0], [6, 0.12, 0], [10, 0.12, 0], [14, 0.12, 0]],
      openHat: [[1, 0.06, 55], [5, 0.06, 55], [9, 0.06, 55], [13, 0.06, 55]],
      ride: [[3, 0.06, 60], [7, 0.06, 60], [11, 0.06, 60], [15, 0.06, 65]],
      crash: [[0, 0.07, 80], [8, 0.07, 80]],
      ghostSnare: [[11, 0.06, 60], [15, 0.06, 75]],
      rim: [[3, 0.05, 55], [7, 0.05, 65], [11, 0.05, 70]],
      lowTom: [[8, 0.07, 70]],
      texture: [[15, 0.04, 0]],
    },
  },
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
const brightnessToFrequency = (percent) => 200 + (percent / 100) * 4800
const drumFilterToFrequency = (percent) => 500 + (percent / 100) * 6500
const drumVolumeToBusGain = (percent) => percent <= 0 ? 0 : 0.35 + (percent / 100) * 1.45
const drumVolumeToLoopGain = (percent) => percent <= 0 ? 0 : 0.2 + (percent / 100) * 1
const loopPlaybackRate = (loop, bpm, variation) => {
  const targetDuration = (variation.beats * 60) / bpm
  return loop?.buffer?.duration ? loop.buffer.duration / targetDuration : bpm / variation.bpm
}

function App() {
  const [started, setStarted] = useState(false)
  const [selectedLayer, setSelectedLayer] = useState('drone')
  const [status, setStatus] = useState('IDLE')
  const [handsDetected, setHandsDetected] = useState(0)
  const [droneStatus, setDroneStatus] = useState('Idle')
  const [volumePercent, setVolumePercent] = useState(50)
  const [reverbPercent, setReverbPercent] = useState(30)
  const [brightnessPercent, setBrightnessPercent] = useState(20)
  const [drumsOn, setDrumsOn] = useState(false)
  const [droneOn, setDroneOn] = useState(true)
  const [tempoBpm, setTempoBpm] = useState(80)
  const [drumVolumePercent, setDrumVolumePercent] = useState(50)
  const [, setDrumDensityPercent] = useState(50)
  const [drumPreset, setDrumPreset] = useState('Lo-Fi')
  const [drumLoopVariationIndex, setDrumLoopVariationIndex] = useState(0)
  const [lofiLoopVariationIndex, setLofiLoopVariationIndex] = useState(0)
  const [garageLoopVariationIndex, setGarageLoopVariationIndex] = useState(0)
  const [bassOn, setBassOn] = useState(false)
  const [bassVolumePercent, setBassVolumePercent] = useState(50)
  const [bassActivityPercent, setBassActivityPercent] = useState(50)
  const [bassPatternIndex, setBassPatternIndex] = useState(0)
  const [bassCharacterIndex, setBassCharacterIndex] = useState(0)
  const [synthOn, setSynthOn] = useState(false)
  const [synthVolumePercent, setSynthVolumePercent] = useState(50)
  const [synthMotionPercent, setSynthMotionPercent] = useState(50)
  const [synthPatternIndex, setSynthPatternIndex] = useState(0)
  const [synthPresetIndex, setSynthPresetIndex] = useState(0)
  const [dronePresetIndex, setDronePresetIndex] = useState(0)

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
  const drumsOnRef = useRef(false)
  const droneOnRef = useRef(true)
  const drumVolumePinchActiveRef = useRef(false)
  const drumDensityPinchActiveRef = useRef(false)
  const drumTempoPinchActiveRef = useRef(false)
  const drumLoopPinchActiveRef = useRef(false)
  const drumPresetPinchActiveRef = useRef(false)
  const drumPresetIndexRef = useRef(0)
  const savedDrumVolumePercentRef = useRef(50)
  const currentDrumVolumePercentRef = useRef(50)
  const savedDrumDensityPercentRef = useRef(50)
  const currentDrumDensityPercentRef = useRef(50)
  const savedDrumPresetRef = useRef('Lo-Fi')
  const currentDrumPresetRef = useRef('Lo-Fi')
  const currentDrumLoopVariationIndexRef = useRef(0)
  const currentLofiLoopVariationIndexRef = useRef(0)
  const currentGarageLoopVariationIndexRef = useRef(0)
  const bassOnRef = useRef(false)
  const currentBassVolumePercentRef = useRef(50)
  const currentBassActivityPercentRef = useRef(50)
  const bassVolumePinchActiveRef = useRef(false)
  const bassActivityPinchActiveRef = useRef(false)
  const bassPatternPinchActiveRef = useRef(false)
  const bassCharacterPinchActiveRef = useRef(false)
  const currentBassPatternIndexRef = useRef(0)
  const currentBassCharacterIndexRef = useRef(0)
  const synthOnRef = useRef(false)
  const currentSynthVolumePercentRef = useRef(50)
  const currentSynthMotionPercentRef = useRef(50)
  const synthVolumePinchActiveRef = useRef(false)
  const synthMotionPinchActiveRef = useRef(false)
  const synthPatternPinchActiveRef = useRef(false)
  const synthPresetPinchActiveRef = useRef(false)
  const currentSynthPatternIndexRef = useRef(0)
  const currentSynthPresetIndexRef = useRef(0)
  const pendingNoteRef = useRef('A3')
  const dronePresetIndexRef = useRef(0)
  const dronePresetPinchActiveRef = useRef(false)
  const selectedLayerRef = useRef('drone')

  useEffect(() => {
    selectedLayerRef.current = selectedLayer
  }, [selectedLayer])

  const updateJungleLoopMix = () => {
    const audio = window.palmSynthAudio?.drums
    if (!audio?.jungleLoopGain) return

    const loopIsActive = drumsOnRef.current && currentDrumPresetRef.current === 'Jungle'
    audio.jungleLoopGain.gain.rampTo(loopIsActive ? drumVolumeToLoopGain(currentDrumVolumePercentRef.current) : 0, 0.08)
    audio.jungleVariationGains?.forEach((gain, index) => {
      gain.gain.rampTo(index === currentDrumLoopVariationIndexRef.current ? 1 : 0, 0.08)
    })
  }

  const updateJungleLoopTempo = (bpm) => {
    window.palmSynthAudio?.drums?.jungleLoops?.forEach((loop, index) => {
      loop.playbackRate = loopPlaybackRate(loop, bpm, JUNGLE_LOOP_VARIATIONS[index])
    })
  }

  const cycleJungleLoopVariation = () => {
    if (currentDrumPresetRef.current !== 'Jungle') {
      setDroneStatus('Loop variations are available in Jungle')
      return
    }

    const nextIndex = (currentDrumLoopVariationIndexRef.current + 1) % JUNGLE_LOOP_VARIATIONS.length
    currentDrumLoopVariationIndexRef.current = nextIndex
    setDrumLoopVariationIndex(nextIndex)
    const nextTempo = JUNGLE_LOOP_VARIATIONS[nextIndex].bpm
    setTempoBpm(nextTempo)
    Tone.Transport.bpm.value = nextTempo
    updateJungleLoopTempo(nextTempo)
    updateJungleLoopMix()
    setDroneStatus(`Jungle loop: ${JUNGLE_LOOP_VARIATIONS[nextIndex].label}`)
  }

  const updateLofiLoopMix = () => {
    const audio = window.palmSynthAudio?.drums
    if (!audio?.lofiLoopGain) return
    const loopIsActive = drumsOnRef.current && currentDrumPresetRef.current === 'Lo-Fi'
    audio.lofiLoopGain.gain.rampTo(loopIsActive ? drumVolumeToLoopGain(currentDrumVolumePercentRef.current) : 0, 0.08)
    audio.lofiVariationGains?.forEach((gain, index) => {
      gain.gain.rampTo(index === currentLofiLoopVariationIndexRef.current ? 1 : 0, 0.08)
    })
  }

  const updateLofiLoopTempo = (bpm) => {
    window.palmSynthAudio?.drums?.lofiLoops?.forEach((loop, index) => {
      loop.playbackRate = loopPlaybackRate(loop, bpm, LOFI_LOOP_VARIATIONS[index])
    })
  }

  const cycleLofiLoopVariation = () => {
    if (currentDrumPresetRef.current !== 'Lo-Fi') {
      setDroneStatus('Loop variations are available in Lo-Fi')
      return
    }
    const nextIndex = (currentLofiLoopVariationIndexRef.current + 1) % LOFI_LOOP_VARIATIONS.length
    currentLofiLoopVariationIndexRef.current = nextIndex
    setLofiLoopVariationIndex(nextIndex)
    const nextTempo = LOFI_LOOP_VARIATIONS[nextIndex].bpm
    setTempoBpm(nextTempo)
    Tone.Transport.bpm.value = nextTempo
    updateLofiLoopTempo(nextTempo)
    updateLofiLoopMix()
    setDroneStatus(`Lo-Fi loop: ${LOFI_LOOP_VARIATIONS[nextIndex].label}`)
  }

  const updateGarageLoopMix = () => {
    const audio = window.palmSynthAudio?.drums
    if (!audio?.garageLoopGain) return
    const loopIsActive = drumsOnRef.current && currentDrumPresetRef.current === 'Garage'
    audio.garageLoopGain.gain.rampTo(loopIsActive ? drumVolumeToLoopGain(currentDrumVolumePercentRef.current) : 0, 0.08)
    audio.garageVariationGains?.forEach((gain, index) => {
      gain.gain.rampTo(index === currentGarageLoopVariationIndexRef.current ? 1 : 0, 0.08)
    })
  }

  const updateGarageLoopTempo = (bpm) => {
    window.palmSynthAudio?.drums?.garageLoops?.forEach((loop, index) => {
      loop.playbackRate = loopPlaybackRate(loop, bpm, GARAGE_LOOP_VARIATIONS[index])
    })
  }

  const cycleGarageLoopVariation = () => {
    if (currentDrumPresetRef.current !== 'Garage') {
      setDroneStatus('Loop variations are available in Garage')
      return
    }
    const nextIndex = (currentGarageLoopVariationIndexRef.current + 1) % GARAGE_LOOP_VARIATIONS.length
    currentGarageLoopVariationIndexRef.current = nextIndex
    setGarageLoopVariationIndex(nextIndex)
    const nextTempo = GARAGE_LOOP_VARIATIONS[nextIndex].bpm
    setTempoBpm(nextTempo)
    Tone.Transport.bpm.value = nextTempo
    updateGarageLoopTempo(nextTempo)
    updateGarageLoopMix()
    setDroneStatus(`Garage loop: ${GARAGE_LOOP_VARIATIONS[nextIndex].label}`)
  }

  const cycleBassPattern = () => {
    const nextIndex = (currentBassPatternIndexRef.current + 1) % BASS_PATTERNS.length
    currentBassPatternIndexRef.current = nextIndex
    setBassPatternIndex(nextIndex)
    setDroneStatus(`Bass pattern: ${BASS_PATTERNS[nextIndex].label}`)
  }

  const updateBassMix = () => {
    const audio = window.palmSynthAudio?.bass
    if (!audio) return

    const character = BASS_CHARACTERS[currentBassCharacterIndexRef.current]
    const volume = currentBassVolumePercentRef.current / 100
    const activeGain = bassOnRef.current ? (0.3 + volume * 0.95) * character.level : 0
    audio.gain.gain.rampTo(activeGain, 0.08)
    audio.presenceGain.gain.rampTo(bassOnRef.current ? character.presenceGain * (0.35 + volume * 0.65) : 0, 0.08)
  }

  const cycleBassCharacter = () => {
    const audio = window.palmSynthAudio?.bass
    const nextIndex = (currentBassCharacterIndexRef.current + 1) % BASS_CHARACTERS.length
    const character = BASS_CHARACTERS[nextIndex]
    currentBassCharacterIndexRef.current = nextIndex
    setBassCharacterIndex(nextIndex)
    if (audio) {
      audio.synth.oscillator.type = character.oscillator
      audio.synth.envelope.decay = character.decay
      audio.synth.envelope.sustain = character.sustain
      audio.synth.envelope.release = character.release
      audio.synth.filterEnvelope.octaves = character.filterOctaves
      audio.filter.frequency.rampTo(character.filterFrequency, 0.08)
      audio.presenceFilter.frequency.rampTo(character.presenceFrequency, 0.08)
      updateBassMix()
    }
    setDroneStatus(`Bass character: ${character.label}`)
  }

  const cycleSynthPattern = () => {
    const nextIndex = (currentSynthPatternIndexRef.current + 1) % SYNTH_PATTERNS.length
    currentSynthPatternIndexRef.current = nextIndex
    setSynthPatternIndex(nextIndex)
    setDroneStatus(`Synth pattern: ${SYNTH_PATTERNS[nextIndex].label}`)
  }

  const cycleSynthPreset = () => {
    const audio = window.palmSynthAudio?.melodicSynth
    const nextIndex = (currentSynthPresetIndexRef.current + 1) % SYNTH_PRESETS.length
    const preset = SYNTH_PRESETS[nextIndex]
    currentSynthPresetIndexRef.current = nextIndex
    setSynthPresetIndex(nextIndex)
    if (audio) {
      audio.synth.set({
        oscillator: { type: preset.oscillator },
        envelope: { attack: preset.attack, release: preset.release },
      })
      audio.filter.frequency.rampTo(preset.filterFrequency, 0.08)
    }
    setDroneStatus(`Synth preset: ${preset.label}`)
  }

  const cycleDronePreset = () => {
    const audio = window.palmSynthAudio
    const nextIndex = (dronePresetIndexRef.current + 1) % DRONE_PRESETS.length
    const preset = DRONE_PRESETS[nextIndex]
    dronePresetIndexRef.current = nextIndex
    setDronePresetIndex(nextIndex)
    if (audio?.synth) {
      audio.synth.set({
        oscillator: { type: preset.oscillator },
        envelope: { attack: preset.attack, release: preset.release },
      })
      audio.droneGrungeDrive.distortion = preset.grungeDrive
      audio.droneGrungeGain.gain.rampTo(preset.grungeGain, 0.1)
    }
    setDroneStatus(`Drone preset: ${preset.label}`)
  }

  const applyDrumPreset = (presetName) => {
    const audio = window.palmSynthAudio?.drums
    if (!audio) return

    const preset = DRUM_GROOVE_PRESETS[presetName] ?? DRUM_GROOVE_PRESETS['Lo-Fi']
    audio.drumBus.gain.value = preset.drumBusGain * drumVolumeToBusGain(currentDrumVolumePercentRef.current)
    audio.drumOutput.gain.value = preset.drumOutputGain
    audio.drumSend.gain.value = preset.drumSendGain
    audio.cymbalBus && preset.cymbalBusGain && (audio.cymbalBus.gain.value = preset.cymbalBusGain)
    audio.cymbalOutput && preset.cymbalOutputGain && (audio.cymbalOutput.gain.value = preset.cymbalOutputGain)
    audio.cymbalSend && preset.cymbalSendGain && (audio.cymbalSend.gain.value = preset.cymbalSendGain)
    audio.cymbalFilter && preset.cymbalFilterFrequency && (audio.cymbalFilter.frequency.value = preset.cymbalFilterFrequency)
    audio.cymbalFilter && preset.cymbalFilterQ && (audio.cymbalFilter.Q.value = preset.cymbalFilterQ)
    audio.drumFilter.frequency.value = preset.filterFrequency
    audio.drumFilter.Q.value = preset.filterQ

    audio.kick.volume.value = preset.kick.volume
    audio.kick.pitchDecay = preset.kick.pitchDecay
    audio.kick.octaves = preset.kick.octaves

    audio.snare.volume.value = preset.snare.volume
    audio.snare.noise.type = preset.snare.noise
    audio.snare.envelope.decay = preset.snare.decay

    audio.hat.volume.value = preset.hat.volume
    audio.hat.envelope.decay = preset.hat.decay
    audio.openHat && preset.openHat && (audio.openHat.volume.value = preset.openHat.volume)
    audio.openHat && preset.openHat && (audio.openHat.envelope.decay = preset.openHat.decay)
    audio.ride && preset.ride && (audio.ride.volume.value = preset.ride.volume)
    audio.ride && preset.ride && (audio.ride.envelope.decay = preset.ride.decay)
    audio.crash && preset.crash && (audio.crash.volume.value = preset.crash.volume)
    audio.crash && preset.crash && (audio.crash.envelope.decay = preset.crash.decay)
    audio.ghostSnare && preset.ghostSnare && (audio.ghostSnare.volume.value = preset.ghostSnare.volume)
    audio.ghostSnare && preset.ghostSnare && (audio.ghostSnare.envelope.decay = preset.ghostSnare.decay)
    audio.rim && preset.rim && (audio.rim.volume.value = preset.rim.volume)
    audio.rim && preset.rim && (audio.rim.envelope.decay = preset.rim.decay)
    audio.lowTom && preset.lowTom && (audio.lowTom.volume.value = preset.lowTom.volume)
    audio.lowTom && preset.lowTom && (audio.lowTom.pitchDecay = preset.lowTom.pitchDecay)
    audio.lowTom && preset.lowTom && (audio.lowTom.octaves = preset.lowTom.octaves)
    audio.textureNoise && preset.texture && (audio.textureNoise.volume.value = preset.texture.volume)
    audio.drumPattern = preset.patterns
    drumPresetIndexRef.current = DRUM_PRESETS.indexOf(presetName)
    currentDrumPresetRef.current = presetName
    const nextTempo = presetName === 'Jungle'
      ? JUNGLE_LOOP_VARIATIONS[currentDrumLoopVariationIndexRef.current].bpm
      : presetName === 'Lo-Fi'
        ? LOFI_LOOP_VARIATIONS[currentLofiLoopVariationIndexRef.current].bpm
        : presetName === 'Garage'
          ? GARAGE_LOOP_VARIATIONS[currentGarageLoopVariationIndexRef.current].bpm
          : tempoBpm
    setTempoBpm(nextTempo)
    Tone.Transport.bpm.value = nextTempo
    updateJungleLoopTempo(nextTempo)
    updateJungleLoopMix()
    updateLofiLoopTempo(nextTempo)
    updateLofiLoopMix()
    updateGarageLoopTempo(nextTempo)
    updateGarageLoopMix()
    setDrumPreset(presetName)
  }

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
      const droneLowCut = new Tone.Filter({
        frequency: 95,
        type: 'highpass',
      })

      const reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      })
      const masterCompressor = new Tone.Compressor({
        threshold: -20,
        ratio: 3,
        attack: 0.01,
        release: 0.2,
      })
      const masterLimiter = new Tone.Limiter(-1)

      await reverb.generate()

      filter.connect(reverb)
      reverb.connect(masterCompressor)

      const textureFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: 2600,
        Q: 0.45,
      })

      const textureGain = new Tone.Gain(0).connect(reverb)
      textureGain.connect(masterCompressor)
      textureFilter.connect(textureGain)
      const droneGrungeGain = new Tone.Gain(0.18).connect(reverb)
      droneGrungeGain.connect(masterCompressor)
      const droneGrungeDrive = new Tone.Distortion(0.22).connect(droneGrungeGain)

      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 1,
        },
      }).connect(droneLowCut)
      droneLowCut.connect(filter)
      droneLowCut.connect(droneGrungeDrive)

      const texture = new Tone.Noise({ type: 'brown', volume: -24 }).connect(textureFilter)
      texture.start()

      const drumBus = new Tone.Gain(0.9)
      const drumFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: drumFilterToFrequency(70),
        Q: 0.8,
      })
      const drumOutput = new Tone.Gain(0.95).connect(masterCompressor)
      const drumSend = new Tone.Gain(0.18).connect(reverb)
      const cymbalBus = new Tone.Gain(1.1)
      const cymbalFilter = new Tone.Filter({
        type: 'highpass',
        frequency: 4200,
        Q: 0.85,
      })
      const cymbalOutput = new Tone.Gain(1.08).connect(masterCompressor)
      const cymbalSend = new Tone.Gain(0.1).connect(reverb)
      drumBus.connect(drumFilter)
      drumFilter.connect(drumOutput)
      drumFilter.connect(drumSend)
      cymbalBus.connect(cymbalFilter)
      cymbalFilter.connect(cymbalOutput)
      cymbalFilter.connect(cymbalSend)
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.025,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.02, release: 0.2 },
        volume: 8,
      }).connect(drumBus)
      const snare = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.24, sustain: 0 },
        volume: 6,
      }).connect(drumBus)
      const hat = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
        volume: 0,
      }).connect(drumBus)
      const openHat = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
        volume: -10,
      }).connect(cymbalBus)
      const ride = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
        volume: -12,
      }).connect(cymbalBus)
      const crash = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.55, sustain: 0 },
        volume: -9,
      }).connect(cymbalBus)
      const ghostSnare = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
        volume: -10,
      }).connect(drumBus)
      const rim = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0 },
        volume: -12,
      }).connect(cymbalBus)
      const lowTom = new Tone.MembraneSynth({
        pitchDecay: 0.03,
        octaves: 1.4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.12 },
        volume: -8,
      }).connect(drumBus)
      const textureNoise = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0 },
        volume: -28,
      }).connect(cymbalBus)
      const jungleLoopGain = new Tone.Gain(0).connect(masterCompressor)
      const jungleVariationGains = JUNGLE_LOOP_VARIATIONS.map(() => new Tone.Gain(0).connect(jungleLoopGain))
      const jungleLoops = JUNGLE_LOOP_VARIATIONS.map(({ url }, index) => new Tone.Player({
        url,
        loop: true,
      }).connect(jungleVariationGains[index]))
      const lofiLoopGain = new Tone.Gain(0).connect(masterCompressor)
      const lofiVariationGains = LOFI_LOOP_VARIATIONS.map(() => new Tone.Gain(0).connect(lofiLoopGain))
      const lofiLoops = LOFI_LOOP_VARIATIONS.map(({ url }, index) => new Tone.Player({
        url,
        loop: true,
      }).connect(lofiVariationGains[index]))
      const garageLoopGain = new Tone.Gain(0).connect(masterCompressor)
      const garageVariationGains = GARAGE_LOOP_VARIATIONS.map(() => new Tone.Gain(0).connect(garageLoopGain))
      const garageLoops = GARAGE_LOOP_VARIATIONS.map(({ url }, index) => new Tone.Player({
        url,
        loop: true,
      }).connect(garageVariationGains[index]))
      const bassGain = new Tone.Gain(0).connect(masterCompressor)
      const bassPresenceGain = new Tone.Gain(0).connect(masterCompressor)
      const bassPresenceFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: BASS_CHARACTERS[0].presenceFrequency,
        Q: 0.75,
      }).connect(bassPresenceGain)
      const bassPresenceDrive = new Tone.Distortion(0.16).connect(bassPresenceFilter)
      const bassFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: BASS_CHARACTERS[0].filterFrequency,
        Q: 1.2,
      }).connect(bassGain)
      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: BASS_CHARACTERS[0].oscillator },
        envelope: { attack: 0.01, decay: BASS_CHARACTERS[0].decay, sustain: BASS_CHARACTERS[0].sustain, release: BASS_CHARACTERS[0].release },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.18,
          sustain: 0.15,
          release: 0.2,
          baseFrequency: 80,
          octaves: BASS_CHARACTERS[0].filterOctaves,
        },
      }).connect(bassFilter)
      bassSynth.connect(bassPresenceDrive)
      const melodicSynthGain = new Tone.Gain(0).connect(masterCompressor)
      const melodicSynthFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: SYNTH_PRESETS[0].filterFrequency,
        Q: 0.9,
      }).connect(melodicSynthGain)
      const melodicSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: SYNTH_PRESETS[0].oscillator },
        envelope: {
          attack: SYNTH_PRESETS[0].attack,
          decay: 0.18,
          sustain: 0.45,
          release: SYNTH_PRESETS[0].release,
        },
      }).connect(melodicSynthFilter)
      await Tone.loaded()
      jungleLoops.forEach((loop) => loop.sync().start(0))
      lofiLoops.forEach((loop) => loop.sync().start(0))
      garageLoops.forEach((loop) => loop.sync().start(0))
      const bassSeq = new Tone.Sequence((time, step) => {
        if (!bassOnRef.current || step === undefined) return

        const activity = currentBassActivityPercentRef.current
        const notes = BASS_PATTERNS[currentBassPatternIndexRef.current].notes
        const hit = notes.find(([s, , minActivity]) => s === step && activity >= minActivity)
        const duration = activity < 25 ? '2n' : activity < 50 ? '4n' : activity < 75 ? '8n' : '16n'
        if (hit) bassSynth.triggerAttackRelease(hit[1], duration, time, 0.72)
      }, Array.from({ length: 16 }, (_, i) => i), '16n').start(0)
      const melodicSynthSeq = new Tone.Sequence((time, step) => {
        if (!synthOnRef.current || step === undefined) return

        const motion = currentSynthMotionPercentRef.current
        const notes = SYNTH_PATTERNS[currentSynthPatternIndexRef.current].notes
        const hit = notes.find(([s, , minMotion]) => s === step && motion >= minMotion)
        const duration = motion < 25 ? '1m' : motion < 50 ? '2n' : motion < 75 ? '4n' : '8n'
        if (hit) melodicSynth.triggerAttackRelease(hit[1], duration, time, 0.44)
      }, Array.from({ length: 16 }, (_, i) => i), '16n').start(0)

      const drumSeq = new Tone.Sequence((time, step) => {
        if (!drumsOnRef.current || step === undefined) return
        if (currentDrumPresetRef.current === 'Jungle' || currentDrumPresetRef.current === 'Lo-Fi' || currentDrumPresetRef.current === 'Garage') return

        const density = currentDrumDensityPercentRef.current
        const activePattern = window.palmSynthAudio?.drums?.drumPattern ?? DRUM_GROOVE_PRESETS['Lo-Fi'].patterns

        const kickHit = activePattern.kick.find(([s, , minD]) => s === step && density >= minD)
        const snareHit = activePattern.snare.find(([s, , minD]) => s === step && density >= minD)
        const hatHit = activePattern.hat.find(([s, , minD]) => s === step && density >= minD)
        const openHatHit = activePattern.openHat?.find(([s, , minD]) => s === step && density >= minD)
        const rideHit = activePattern.ride?.find(([s, , minD]) => s === step && density >= minD)
        const crashHit = activePattern.crash?.find(([s, , minD]) => s === step && density >= minD)
        const ghostSnareHit = activePattern.ghostSnare?.find(([s, , minD]) => s === step && density >= minD)
        const rimHit = activePattern.rim?.find(([s, , minD]) => s === step && density >= minD)
        const lowTomHit = activePattern.lowTom?.find(([s, , minD]) => s === step && density >= minD)
        const textureHit = activePattern.texture?.find(([s, , minD]) => s === step && density >= minD)

        if (kickHit) kick.triggerAttackRelease('C1', '16n', time, kickHit[1])
        if (snareHit) snare.triggerAttackRelease('16n', time, snareHit[1])
        if (hatHit) hat.triggerAttackRelease('32n', time, hatHit[1])
        if (openHatHit) openHat.triggerAttackRelease('16n', time, openHatHit[1])
        if (rideHit) ride.triggerAttackRelease('8n', time, rideHit[1])
        if (crashHit) crash.triggerAttackRelease('4n', time, crashHit[1])
        if (ghostSnareHit) ghostSnare.triggerAttackRelease('32n', time, ghostSnareHit[1])
        if (rimHit) rim.triggerAttackRelease('32n', time, rimHit[1])
        if (lowTomHit) lowTom.triggerAttackRelease('C2', '16n', time, lowTomHit[1])
        if (textureHit) textureNoise.triggerAttackRelease('64n', time, textureHit[1])
      }, Array.from({ length: 16 }, (_, i) => i), '16n').start(0)

      const droneQuantizeSeq = new Tone.Sequence((time, step) => {
        if (step % 4 !== 0 || !droneOnRef.current) return
        const pending = pendingNoteRef.current
        if (pending !== currentNoteRef.current) {
          synth.setNote(pending, time)
          currentNoteRef.current = pending
        }
      }, Array.from({ length: 16 }, (_, i) => i), '16n').start(0)

      window.palmSynthAudio = {
        synth,
        filter,
        droneLowCut,
        droneGrungeDrive,
        droneGrungeGain,
        reverb,
        texture,
        textureGain,
        textureFilter,
        droneQuantizeSeq,
      }
      window.palmSynthAudio.masterCompressor = masterCompressor
      window.palmSynthAudio.masterLimiter = masterLimiter
      window.palmSynthAudio.bass = {
        synth: bassSynth,
        filter: bassFilter,
        gain: bassGain,
        presenceDrive: bassPresenceDrive,
        presenceFilter: bassPresenceFilter,
        presenceGain: bassPresenceGain,
        seq: bassSeq,
      }
      window.palmSynthAudio.melodicSynth = {
        synth: melodicSynth,
        filter: melodicSynthFilter,
        gain: melodicSynthGain,
        seq: melodicSynthSeq,
      }
      window.palmSynthAudio.drums = {
        kick,
        snare,
        hat,
        openHat,
        ride,
        crash,
        ghostSnare,
        rim,
        lowTom,
        textureNoise,
        drumBus,
        drumFilter,
        drumOutput,
        drumSend,
        cymbalBus,
        cymbalFilter,
        cymbalOutput,
        cymbalSend,
        jungleLoops,
        jungleVariationGains,
        jungleLoopGain,
        lofiLoops,
        lofiVariationGains,
        lofiLoopGain,
        garageLoops,
        garageVariationGains,
        garageLoopGain,
        drumSeq,
        drumPattern: DRUM_GROOVE_PRESETS['Lo-Fi'].patterns,
      }
      applyDrumPreset('Lo-Fi')

      Tone.Transport.start()

      synth.triggerAttack('A3')
      currentNoteRef.current = 'A3'
      savedVolumePercentRef.current = 50
      currentVolumePercentRef.current = 50
      savedReverbPercentRef.current = 30
      currentReverbPercentRef.current = 30
      savedBrightnessPercentRef.current = 20
      currentBrightnessPercentRef.current = 20
      savedDrumVolumePercentRef.current = 50
      currentDrumVolumePercentRef.current = 50
      savedDrumDensityPercentRef.current = 50
      currentDrumDensityPercentRef.current = 50
      savedDrumPresetRef.current = 'Lo-Fi'
      currentDrumPresetRef.current = 'Lo-Fi'
      setVolumePercent(50)
      setReverbPercent(30)
      setBrightnessPercent(20)
      setDrumVolumePercent(50)
      setDrumDensityPercent(50)
      setDrumPreset('Lo-Fi')
      setDrumLoopVariationIndex(0)
      setLofiLoopVariationIndex(0)
      setGarageLoopVariationIndex(0)
      drumPresetIndexRef.current = 0
      currentDrumLoopVariationIndexRef.current = 0
      currentLofiLoopVariationIndexRef.current = 0
      currentGarageLoopVariationIndexRef.current = 0
      setBassOn(false)
      bassOnRef.current = false
      setBassVolumePercent(50)
      currentBassVolumePercentRef.current = 50
      setBassActivityPercent(50)
      currentBassActivityPercentRef.current = 50
      setBassPatternIndex(0)
      currentBassPatternIndexRef.current = 0
      setBassCharacterIndex(0)
      currentBassCharacterIndexRef.current = 0
      setSynthOn(false)
      synthOnRef.current = false
      setSynthVolumePercent(50)
      currentSynthVolumePercentRef.current = 50
      setSynthMotionPercent(50)
      currentSynthMotionPercentRef.current = 50
      setSynthPatternIndex(0)
      currentSynthPatternIndexRef.current = 0
      setSynthPresetIndex(0)
      currentSynthPresetIndexRef.current = 0
      setDronePresetIndex(0)
      dronePresetIndexRef.current = 0
      pendingNoteRef.current = 'A3'
      setDrumsOn(false)
      drumsOnRef.current = false
      setDroneOn(true)
      droneOnRef.current = true
      window.palmSynthAudio.drums.drumBus.gain.value = DRUM_GROOVE_PRESETS['Lo-Fi'].drumBusGain * drumVolumeToBusGain(50)
      currentDrumVolumePercentRef.current = 50
      currentDrumDensityPercentRef.current = 50
      currentDrumPresetRef.current = 'Lo-Fi'
      filter.frequency.value = brightnessToFrequency(20)
      synth.volume.value = -4
      synth.detune.value = 0

      masterCompressor.connect(masterLimiter)
      masterLimiter.toDestination()

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
      window.palmSynthAudio.droneLowCut?.dispose?.()
      window.palmSynthAudio.droneGrungeDrive?.dispose?.()
      window.palmSynthAudio.droneGrungeGain?.dispose?.()
      window.palmSynthAudio.reverb?.dispose?.()
      window.palmSynthAudio.masterCompressor?.dispose?.()
      window.palmSynthAudio.masterLimiter?.dispose?.()
      window.palmSynthAudio.texture?.dispose?.()
      window.palmSynthAudio.textureGain?.dispose?.()
      window.palmSynthAudio.textureFilter?.dispose?.()
      window.palmSynthAudio.droneQuantizeSeq?.dispose?.()
      window.palmSynthAudio.bass?.seq?.dispose?.()
      window.palmSynthAudio.bass?.synth?.dispose?.()
      window.palmSynthAudio.bass?.filter?.dispose?.()
      window.palmSynthAudio.bass?.gain?.dispose?.()
      window.palmSynthAudio.bass?.presenceDrive?.dispose?.()
      window.palmSynthAudio.bass?.presenceFilter?.dispose?.()
      window.palmSynthAudio.bass?.presenceGain?.dispose?.()
      window.palmSynthAudio.melodicSynth?.seq?.dispose?.()
      window.palmSynthAudio.melodicSynth?.synth?.dispose?.()
      window.palmSynthAudio.melodicSynth?.filter?.dispose?.()
      window.palmSynthAudio.melodicSynth?.gain?.dispose?.()
      window.palmSynthAudio.drums?.drumSeq?.dispose?.()
      window.palmSynthAudio.drums?.kick?.dispose?.()
      window.palmSynthAudio.drums?.snare?.dispose?.()
      window.palmSynthAudio.drums?.hat?.dispose?.()
      window.palmSynthAudio.drums?.openHat?.dispose?.()
      window.palmSynthAudio.drums?.ride?.dispose?.()
      window.palmSynthAudio.drums?.crash?.dispose?.()
      window.palmSynthAudio.drums?.ghostSnare?.dispose?.()
      window.palmSynthAudio.drums?.rim?.dispose?.()
      window.palmSynthAudio.drums?.lowTom?.dispose?.()
      window.palmSynthAudio.drums?.textureNoise?.dispose?.()
      window.palmSynthAudio.drums?.drumBus?.dispose?.()
      window.palmSynthAudio.drums?.drumFilter?.dispose?.()
      window.palmSynthAudio.drums?.drumOutput?.dispose?.()
      window.palmSynthAudio.drums?.drumSend?.dispose?.()
      window.palmSynthAudio.drums?.cymbalBus?.dispose?.()
      window.palmSynthAudio.drums?.cymbalFilter?.dispose?.()
      window.palmSynthAudio.drums?.cymbalOutput?.dispose?.()
      window.palmSynthAudio.drums?.cymbalSend?.dispose?.()
      window.palmSynthAudio.drums?.jungleLoops?.forEach((loop) => loop.dispose())
      window.palmSynthAudio.drums?.jungleVariationGains?.forEach((gain) => gain.dispose())
      window.palmSynthAudio.drums?.jungleLoopGain?.dispose?.()
      window.palmSynthAudio.drums?.lofiLoops?.forEach((loop) => loop.dispose())
      window.palmSynthAudio.drums?.lofiVariationGains?.forEach((gain) => gain.dispose())
      window.palmSynthAudio.drums?.lofiLoopGain?.dispose?.()
      window.palmSynthAudio.drums?.garageLoops?.forEach((loop) => loop.dispose())
      window.palmSynthAudio.drums?.garageVariationGains?.forEach((gain) => gain.dispose())
      window.palmSynthAudio.drums?.garageLoopGain?.dispose?.()
      window.palmSynthAudio = null
    }

    Tone.Transport.stop()
    Tone.Transport.cancel()

    currentNoteRef.current = 'A3'
    pendingNoteRef.current = 'A3'
    dronePresetIndexRef.current = 0
    dronePresetPinchActiveRef.current = false
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
    savedDrumVolumePercentRef.current = 50
    currentDrumVolumePercentRef.current = 50
    savedDrumDensityPercentRef.current = 50
    currentDrumDensityPercentRef.current = 50
    savedDrumPresetRef.current = 'Lo-Fi'
    currentDrumPresetRef.current = 'Lo-Fi'
    drumLoopPinchActiveRef.current = false
    setVolumePercent(50)
    setReverbPercent(30)
    setBrightnessPercent(20)
    setDrumVolumePercent(50)
    setDrumDensityPercent(50)
    setDrumPreset('Lo-Fi')
    setDrumLoopVariationIndex(0)
    setLofiLoopVariationIndex(0)
    setGarageLoopVariationIndex(0)
    drumPresetIndexRef.current = 0
    currentDrumLoopVariationIndexRef.current = 0
    currentLofiLoopVariationIndexRef.current = 0
    currentGarageLoopVariationIndexRef.current = 0
    setBassOn(false)
    bassOnRef.current = false
    setBassVolumePercent(50)
    currentBassVolumePercentRef.current = 50
    setBassActivityPercent(50)
    currentBassActivityPercentRef.current = 50
    setBassPatternIndex(0)
    currentBassPatternIndexRef.current = 0
    setBassCharacterIndex(0)
    currentBassCharacterIndexRef.current = 0
    bassVolumePinchActiveRef.current = false
    bassActivityPinchActiveRef.current = false
    bassPatternPinchActiveRef.current = false
    bassCharacterPinchActiveRef.current = false
    setSynthOn(false)
    synthOnRef.current = false
    setSynthVolumePercent(50)
    currentSynthVolumePercentRef.current = 50
    setSynthMotionPercent(50)
    currentSynthMotionPercentRef.current = 50
    setSynthPatternIndex(0)
    currentSynthPatternIndexRef.current = 0
    setSynthPresetIndex(0)
    currentSynthPresetIndexRef.current = 0
    synthVolumePinchActiveRef.current = false
    synthMotionPinchActiveRef.current = false
    synthPatternPinchActiveRef.current = false
    synthPresetPinchActiveRef.current = false
    setDroneStatus('Idle')
    setDronePresetIndex(0)
    setDrumsOn(false)
    drumsOnRef.current = false
    setDroneOn(true)
    droneOnRef.current = true
    setTempoBpm(80)
    Tone.Transport.bpm.value = 80
    setHandsDetected(0)
    setStatus('STOPPED')
    setStarted(false)
  }

  const toggleSelectedLayerPower = () => {
    if (selectedLayer === 'drone') {
      const next = !droneOnRef.current
      droneOnRef.current = next
      setDroneOn(next)
      if (window.palmSynthAudio?.synth) {
        window.palmSynthAudio.synth.volume.value = next
          ? -18 + (currentVolumePercentRef.current / 100) * 24
          : -80
      }
      setDroneStatus(`Drone toggled ${next ? 'on' : 'off'}`)
      return
    }

    if (selectedLayer === 'bass') {
      const next = !bassOnRef.current
      bassOnRef.current = next
      setBassOn(next)
      if (window.palmSynthAudio?.bass) {
        updateBassMix()
      }
      setDroneStatus(`Bass toggled ${next ? 'on' : 'off'}`)
      return
    }

    if (selectedLayer === 'synth') {
      const next = !synthOnRef.current
      synthOnRef.current = next
      setSynthOn(next)
      if (window.palmSynthAudio?.melodicSynth) {
        window.palmSynthAudio.melodicSynth.gain.gain.rampTo(next ? 0.12 + (currentSynthVolumePercentRef.current / 100) * 0.55 : 0, 0.08)
      }
      setDroneStatus(`Synth toggled ${next ? 'on' : 'off'}`)
      return
    }

    const next = !drumsOnRef.current
    drumsOnRef.current = next
    setDrumsOn(next)
    updateJungleLoopMix()
    updateLofiLoopMix()
    updateGarageLoopMix()
    setDroneStatus(`Drums toggled ${next ? 'on' : 'off'}`)
  }

  const handleTempoChange = (event) => {
    const next = Number(event.target.value)
    setTempoBpm(next)
    Tone.Transport.bpm.value = next
    updateJungleLoopTempo(next)
    updateLofiLoopTempo(next)
    updateGarageLoopTempo(next)
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
          const leftMiddleTip = leftHand?.[12]
          const leftRingTip = leftHand?.[16]
          const leftPinkyTip = leftHand?.[20]
          const leftPinched =
            !!leftThumbTip &&
            !!leftIndexTip &&
            Math.hypot(leftThumbTip.x - leftIndexTip.x, leftThumbTip.y - leftIndexTip.y) < 0.05
          const leftDrumsPinched =
            !!leftThumbTip &&
            !!leftPinkyTip &&
            Math.hypot(leftThumbTip.x - leftPinkyTip.x, leftThumbTip.y - leftPinkyTip.y) < 0.05
          const leftBassPinched =
            !!leftThumbTip &&
            !!leftRingTip &&
            Math.hypot(leftThumbTip.x - leftRingTip.x, leftThumbTip.y - leftRingTip.y) < 0.05
          const leftSynthPinched =
            !!leftThumbTip &&
            !!leftMiddleTip &&
            Math.hypot(leftThumbTip.x - leftMiddleTip.x, leftThumbTip.y - leftMiddleTip.y) < 0.05
          const leftSelectionPinched = leftPinched || leftSynthPinched || leftBassPinched || leftDrumsPinched

          if (leftDrumsPinched) {
            setSelectedLayer('drums')
            selectedLayerRef.current = 'drums'
          } else if (leftBassPinched) {
            setSelectedLayer('bass')
            selectedLayerRef.current = 'bass'
          } else if (leftSynthPinched) {
            setSelectedLayer('synth')
            selectedLayerRef.current = 'synth'
          } else if (leftPinched) {
            setSelectedLayer('drone')
            selectedLayerRef.current = 'drone'
          }

          if (leftSelectionPinched && !leftPinchActiveRef.current) {
            leftPinchActiveRef.current = true
            setDroneStatus(`${selectedLayerRef.current === 'drums' ? 'Drums' : selectedLayerRef.current === 'bass' ? 'Bass' : selectedLayerRef.current === 'synth' ? 'Synth' : 'Drone'} edit mode`)
          } else if (!leftSelectionPinched && leftPinchActiveRef.current) {
            leftPinchActiveRef.current = false
            if (selectedLayerRef.current === 'drums') {
              drumVolumePinchActiveRef.current = false
              drumDensityPinchActiveRef.current = false
              drumTempoPinchActiveRef.current = false
              drumLoopPinchActiveRef.current = false
              drumPresetPinchActiveRef.current = false
              savedDrumVolumePercentRef.current = currentDrumVolumePercentRef.current
              savedDrumDensityPercentRef.current = currentDrumDensityPercentRef.current
              savedDrumPresetRef.current = currentDrumPresetRef.current
              setDrumVolumePercent(savedDrumVolumePercentRef.current)
              setDrumDensityPercent(savedDrumDensityPercentRef.current)
              setDrumPreset(savedDrumPresetRef.current)
              setDroneStatus(`Drum settings saved`)
            } else if (selectedLayerRef.current === 'bass') {
              bassVolumePinchActiveRef.current = false
              bassActivityPinchActiveRef.current = false
              bassPatternPinchActiveRef.current = false
              bassCharacterPinchActiveRef.current = false
              setDroneStatus('Bass settings saved')
            } else if (selectedLayerRef.current === 'synth') {
              synthVolumePinchActiveRef.current = false
              synthMotionPinchActiveRef.current = false
              synthPatternPinchActiveRef.current = false
              synthPresetPinchActiveRef.current = false
              setDroneStatus('Synth settings saved')
            } else {
              dronePresetPinchActiveRef.current = false
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
                rightPinchActiveRef.current = false
                savedVolumePercentRef.current = currentVolumePercentRef.current
                setVolumePercent(savedVolumePercentRef.current)
                setDroneStatus(`Volume saved: ${savedVolumePercentRef.current}%`)
              }
            }
          }

          if (leftPinchActiveRef.current) {
            const rightHand = rightHandIndex >= 0 ? hands[rightHandIndex] : null
            const rightThumbTip = rightHand?.[4]
            const rightIndexTip = rightHand?.[8]
            const rightMiddleTip = rightHand?.[12]
            const rightRingTip = rightHand?.[16]
            const rightPinkyTip = rightHand?.[20]
            if (selectedLayerRef.current === 'drums') {
              const rightVolumePinched =
                !!rightThumbTip &&
                !!rightIndexTip &&
                Math.hypot(rightThumbTip.x - rightIndexTip.x, rightThumbTip.y - rightIndexTip.y) < 0.06
              const rightTempoPinched =
                !!rightThumbTip &&
                !!rightMiddleTip &&
                Math.hypot(rightThumbTip.x - rightMiddleTip.x, rightThumbTip.y - rightMiddleTip.y) < 0.05
              const rightLoopPinched =
                !!rightThumbTip &&
                !!rightRingTip &&
                Math.hypot(rightThumbTip.x - rightRingTip.x, rightThumbTip.y - rightRingTip.y) < 0.05
              const rightPresetPinched =
                !!rightThumbTip &&
                !!rightPinkyTip &&
                Math.hypot(rightThumbTip.x - rightPinkyTip.x, rightThumbTip.y - rightPinkyTip.y) < 0.05

              if (rightVolumePinched) {
                drumDensityPinchActiveRef.current = false
                drumTempoPinchActiveRef.current = false
                drumPresetPinchActiveRef.current = false
                const nextVolume = Math.round(clamp(1 - rightIndexTip.y, 0, 1) * 100)
                currentDrumVolumePercentRef.current = nextVolume
                setDrumVolumePercent(nextVolume)
                window.palmSynthAudio.drums.drumBus.gain.value = DRUM_GROOVE_PRESETS[currentDrumPresetRef.current].drumBusGain * drumVolumeToBusGain(nextVolume)
                updateJungleLoopMix()
                updateLofiLoopMix()
                updateGarageLoopMix()
                setDroneStatus(`Editing drum volume: ${nextVolume}%`)
                drumVolumePinchActiveRef.current = true
              } else if (drumVolumePinchActiveRef.current) {
                drumVolumePinchActiveRef.current = false
                savedDrumVolumePercentRef.current = currentDrumVolumePercentRef.current
                setDrumVolumePercent(savedDrumVolumePercentRef.current)
                setDroneStatus(`Drum volume saved: ${savedDrumVolumePercentRef.current}%`)
              } else if (rightTempoPinched) {
                drumVolumePinchActiveRef.current = false
                drumDensityPinchActiveRef.current = false
                if (currentDrumPresetRef.current === 'Jungle') {
                  const nativeTempo = JUNGLE_LOOP_VARIATIONS[currentDrumLoopVariationIndexRef.current].bpm
                  const nextTempo = Math.round(nativeTempo - 20 + clamp(1 - rightMiddleTip.y, 0, 1) * 40)
                  setTempoBpm(nextTempo)
                  Tone.Transport.bpm.value = nextTempo
                  updateJungleLoopTempo(nextTempo)
                  setDroneStatus(`Editing Jungle tempo: ${nextTempo} BPM`)
                } else if (currentDrumPresetRef.current === 'Lo-Fi') {
                  const nativeTempo = LOFI_LOOP_VARIATIONS[currentLofiLoopVariationIndexRef.current].bpm
                  const nextTempo = Math.round(nativeTempo - 20 + clamp(1 - rightMiddleTip.y, 0, 1) * 40)
                  setTempoBpm(nextTempo)
                  Tone.Transport.bpm.value = nextTempo
                  updateLofiLoopTempo(nextTempo)
                  setDroneStatus(`Editing Lo-Fi tempo: ${nextTempo} BPM`)
                } else if (currentDrumPresetRef.current === 'Garage') {
                  const nativeTempo = GARAGE_LOOP_VARIATIONS[currentGarageLoopVariationIndexRef.current].bpm
                  const nextTempo = Math.round(nativeTempo - 20 + clamp(1 - rightMiddleTip.y, 0, 1) * 40)
                  setTempoBpm(nextTempo)
                  Tone.Transport.bpm.value = nextTempo
                  updateGarageLoopTempo(nextTempo)
                  setDroneStatus(`Editing Garage tempo: ${nextTempo} BPM`)
                } else {
                  const nextTempo = Math.round(60 + clamp(1 - rightMiddleTip.y, 0, 1) * 60)
                  setTempoBpm(nextTempo)
                  Tone.Transport.bpm.value = nextTempo
                  updateJungleLoopTempo(nextTempo)
                  updateLofiLoopTempo(nextTempo)
                  updateGarageLoopTempo(nextTempo)
                  setDroneStatus(`Editing drum tempo: ${nextTempo} BPM`)
                }
                drumTempoPinchActiveRef.current = true
              } else if (drumTempoPinchActiveRef.current) {
                drumTempoPinchActiveRef.current = false
                setDroneStatus(`Drum tempo saved: ${tempoBpm} BPM`)
              } else if (rightLoopPinched && !drumLoopPinchActiveRef.current) {
                if (currentDrumPresetRef.current === 'Lo-Fi') cycleLofiLoopVariation()
                else if (currentDrumPresetRef.current === 'Garage') cycleGarageLoopVariation()
                else cycleJungleLoopVariation()
                drumLoopPinchActiveRef.current = true
              } else if (!rightLoopPinched && drumLoopPinchActiveRef.current) {
                drumLoopPinchActiveRef.current = false
              } else if (rightPresetPinched && !drumPresetPinchActiveRef.current) {
                drumVolumePinchActiveRef.current = false
                drumDensityPinchActiveRef.current = false
                drumTempoPinchActiveRef.current = false
                drumPresetIndexRef.current = (drumPresetIndexRef.current + 1) % DRUM_PRESETS.length
                const nextPresetIndex = drumPresetIndexRef.current
                const nextPreset = DRUM_PRESETS[nextPresetIndex]
                applyDrumPreset(nextPreset)
                setDroneStatus(`Editing drum preset: ${nextPreset}`)
                drumPresetPinchActiveRef.current = true
              } else if (!rightPresetPinched && drumPresetPinchActiveRef.current) {
                drumPresetPinchActiveRef.current = false
                savedDrumPresetRef.current = currentDrumPresetRef.current
                setDrumPreset(savedDrumPresetRef.current)
                setDroneStatus(`Drum preset saved: ${savedDrumPresetRef.current}`)
              }
            } else if (selectedLayerRef.current === 'bass') {
              const rightVolumePinched =
                !!rightThumbTip &&
                !!rightIndexTip &&
                Math.hypot(rightThumbTip.x - rightIndexTip.x, rightThumbTip.y - rightIndexTip.y) < 0.06
              const rightActivityPinched =
                !!rightThumbTip &&
                !!rightMiddleTip &&
                Math.hypot(rightThumbTip.x - rightMiddleTip.x, rightThumbTip.y - rightMiddleTip.y) < 0.05
              const rightPatternPinched =
                !!rightThumbTip &&
                !!rightRingTip &&
                Math.hypot(rightThumbTip.x - rightRingTip.x, rightThumbTip.y - rightRingTip.y) < 0.05
              const rightCharacterPinched =
                !!rightThumbTip &&
                !!rightPinkyTip &&
                Math.hypot(rightThumbTip.x - rightPinkyTip.x, rightThumbTip.y - rightPinkyTip.y) < 0.05

              if (rightVolumePinched) {
                const nextVolume = Math.round(clamp(1 - rightIndexTip.y, 0, 1) * 100)
                currentBassVolumePercentRef.current = nextVolume
                setBassVolumePercent(nextVolume)
                updateBassMix()
                setDroneStatus(`Editing bass volume: ${nextVolume}%`)
                bassVolumePinchActiveRef.current = true
              } else if (bassVolumePinchActiveRef.current) {
                bassVolumePinchActiveRef.current = false
                setDroneStatus(`Bass volume saved: ${currentBassVolumePercentRef.current}%`)
              } else if (rightActivityPinched) {
                const nextActivity = Math.round(clamp(1 - rightMiddleTip.y, 0, 1) * 100)
                currentBassActivityPercentRef.current = nextActivity
                setBassActivityPercent(nextActivity)
                setDroneStatus(`Editing bass activity: ${nextActivity}%`)
                bassActivityPinchActiveRef.current = true
              } else if (bassActivityPinchActiveRef.current) {
                bassActivityPinchActiveRef.current = false
                setDroneStatus(`Bass activity saved: ${currentBassActivityPercentRef.current}%`)
              } else if (rightPatternPinched && !bassPatternPinchActiveRef.current) {
                cycleBassPattern()
                bassPatternPinchActiveRef.current = true
              } else if (!rightPatternPinched && bassPatternPinchActiveRef.current) {
                bassPatternPinchActiveRef.current = false
              } else if (rightCharacterPinched && !bassCharacterPinchActiveRef.current) {
                cycleBassCharacter()
                bassCharacterPinchActiveRef.current = true
              } else if (!rightCharacterPinched && bassCharacterPinchActiveRef.current) {
                bassCharacterPinchActiveRef.current = false
              }
            } else if (selectedLayerRef.current === 'synth') {
              const rightVolumePinched =
                !!rightThumbTip &&
                !!rightIndexTip &&
                Math.hypot(rightThumbTip.x - rightIndexTip.x, rightThumbTip.y - rightIndexTip.y) < 0.06
              const rightMotionPinched =
                !!rightThumbTip &&
                !!rightMiddleTip &&
                Math.hypot(rightThumbTip.x - rightMiddleTip.x, rightThumbTip.y - rightMiddleTip.y) < 0.05
              const rightPatternPinched =
                !!rightThumbTip &&
                !!rightRingTip &&
                Math.hypot(rightThumbTip.x - rightRingTip.x, rightThumbTip.y - rightRingTip.y) < 0.05
              const rightPresetPinched =
                !!rightThumbTip &&
                !!rightPinkyTip &&
                Math.hypot(rightThumbTip.x - rightPinkyTip.x, rightThumbTip.y - rightPinkyTip.y) < 0.05

              if (rightVolumePinched) {
                const nextVolume = Math.round(clamp(1 - rightIndexTip.y, 0, 1) * 100)
                currentSynthVolumePercentRef.current = nextVolume
                setSynthVolumePercent(nextVolume)
                if (synthOnRef.current) window.palmSynthAudio.melodicSynth.gain.gain.rampTo(0.12 + (nextVolume / 100) * 0.55, 0.05)
                setDroneStatus(`Editing synth volume: ${nextVolume}%`)
                synthVolumePinchActiveRef.current = true
              } else if (synthVolumePinchActiveRef.current) {
                synthVolumePinchActiveRef.current = false
                setDroneStatus(`Synth volume saved: ${currentSynthVolumePercentRef.current}%`)
              } else if (rightMotionPinched) {
                const nextMotion = Math.round(clamp(1 - rightMiddleTip.y, 0, 1) * 100)
                currentSynthMotionPercentRef.current = nextMotion
                setSynthMotionPercent(nextMotion)
                setDroneStatus(`Editing synth motion: ${nextMotion}%`)
                synthMotionPinchActiveRef.current = true
              } else if (synthMotionPinchActiveRef.current) {
                synthMotionPinchActiveRef.current = false
                setDroneStatus(`Synth motion saved: ${currentSynthMotionPercentRef.current}%`)
              } else if (rightPatternPinched && !synthPatternPinchActiveRef.current) {
                cycleSynthPattern()
                synthPatternPinchActiveRef.current = true
              } else if (!rightPatternPinched && synthPatternPinchActiveRef.current) {
                synthPatternPinchActiveRef.current = false
              } else if (rightPresetPinched && !synthPresetPinchActiveRef.current) {
                cycleSynthPreset()
                synthPresetPinchActiveRef.current = true
              } else if (!rightPresetPinched && synthPresetPinchActiveRef.current) {
                synthPresetPinchActiveRef.current = false
              }
            } else {
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
              const rightPresetPinched =
                !!rightThumbTip &&
                !!rightPinkyTip &&
                Math.hypot(rightThumbTip.x - rightPinkyTip.x, rightThumbTip.y - rightPinkyTip.y) < 0.05

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
                window.palmSynthAudio.synth.volume.value = -12 + (volumePercent / 100) * 30
                setDroneStatus(`Editing volume: ${volumePercent}%`)
                rightPinchActiveRef.current = true
              } else if (rightPinchActiveRef.current) {
                rightPinchActiveRef.current = false
                savedVolumePercentRef.current = currentVolumePercentRef.current
                setVolumePercent(savedVolumePercentRef.current)
                setDroneStatus(`Volume saved: ${savedVolumePercentRef.current}%`)
              } else if (rightPresetPinched && !dronePresetPinchActiveRef.current) {
                rightPinchActiveRef.current = false
                rightReverbPinchActiveRef.current = false
                rightBrightnessPinchActiveRef.current = false
                cycleDronePreset()
                dronePresetPinchActiveRef.current = true
              } else if (!rightPresetPinched && dronePresetPinchActiveRef.current) {
                dronePresetPinchActiveRef.current = false
              }
            }
          }

          if (selectedLayerRef.current === 'drone' && leftPinchActiveRef.current && leftIndexTip) {
            const noteIndex = Math.floor(clamp(1 - leftIndexTip.y, 0, 1) * (DRONE_NOTES.length - 1))
            pendingNoteRef.current = DRONE_NOTES[noteIndex]
          } else if (selectedLayerRef.current !== 'drone') {
            pendingNoteRef.current = currentNoteRef.current
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
            <div className="control-title">Selected Layer</div>
            <div className="selected-sound">
              {selectedLayer === 'drone' ? 'Drone' : selectedLayer === 'synth' ? 'Synth' : selectedLayer === 'bass' ? 'Bass' : 'Drums'}
            </div>
            {selectedLayer === 'drone' ? (
              <>
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
                  <span>Preset:</span>
                  <span>{DRONE_PRESETS[dronePresetIndex].label}</span>
                </div>
                <div className="control-status">{droneStatus}</div>
              </>
            ) : selectedLayer === 'synth' ? (
              <>
                <div className="parameters-title">Parameters</div>
                <div className="parameter-row">
                  <span>Volume:</span>
                  <span>{synthVolumePercent}%</span>
                </div>
                <div className="parameter-row">
                  <span>Motion:</span>
                  <span>{synthMotionPercent}%</span>
                </div>
                <div className="parameter-row">
                  <span>Pattern:</span>
                  <span>{SYNTH_PATTERNS[synthPatternIndex].label}</span>
                </div>
                <div className="parameter-row">
                  <span>Preset:</span>
                  <span>{SYNTH_PRESETS[synthPresetIndex].label}</span>
                </div>
                <div className="control-status">{droneStatus}</div>
              </>
            ) : selectedLayer === 'bass' ? (
              <>
                <div className="parameters-title">Parameters</div>
                <div className="parameter-row">
                  <span>Volume:</span>
                  <span>{bassVolumePercent}%</span>
                </div>
                <div className="parameter-row">
                  <span>Activity:</span>
                  <span>{bassActivityPercent}%</span>
                </div>
                <div className="parameter-row">
                  <span>Pattern:</span>
                  <span>{BASS_PATTERNS[bassPatternIndex].label}</span>
                </div>
                <div className="parameter-row">
                  <span>Character:</span>
                  <span>{BASS_CHARACTERS[bassCharacterIndex].label}</span>
                </div>
                <div className="control-status">{droneStatus}</div>
              </>
            ) : (
              <>
                <div className="parameters-title">Parameters</div>
                <div className="parameter-row">
                  <span>Volume:</span>
                  <span>{drumVolumePercent}%</span>
                </div>
                <div className="parameter-row">
                  <span>Tempo:</span>
                  <span>
                    {drumPreset === 'Jungle'
                      ? `${tempoBpm} BPM (native ${JUNGLE_LOOP_VARIATIONS[drumLoopVariationIndex].bpm})`
                      : drumPreset === 'Lo-Fi'
                        ? `${tempoBpm} BPM (native ${LOFI_LOOP_VARIATIONS[lofiLoopVariationIndex].bpm})`
                        : drumPreset === 'Garage'
                          ? `${tempoBpm} BPM (native ${GARAGE_LOOP_VARIATIONS[garageLoopVariationIndex].bpm})`
                          : `${tempoBpm} BPM`}
                  </span>
                </div>
                <div className="parameter-row">
                  <span>Loop:</span>
                  <span>
                    {drumPreset === 'Jungle'
                      ? `${JUNGLE_LOOP_VARIATIONS[drumLoopVariationIndex].label} (${drumLoopVariationIndex + 1}/${JUNGLE_LOOP_VARIATIONS.length})`
                      : drumPreset === 'Lo-Fi'
                        ? `${LOFI_LOOP_VARIATIONS[lofiLoopVariationIndex].label} (${lofiLoopVariationIndex + 1}/${LOFI_LOOP_VARIATIONS.length})`
                        : drumPreset === 'Garage'
                          ? `${GARAGE_LOOP_VARIATIONS[garageLoopVariationIndex].label} (${garageLoopVariationIndex + 1}/${GARAGE_LOOP_VARIATIONS.length})`
                          : 'Generated'}
                  </span>
                </div>
                <div className="parameter-row">
                  <span>Preset:</span>
                  <span>{drumPreset}</span>
                </div>
                <input
                  className="tempo-slider"
                  type="range"
                  min={drumPreset === 'Jungle' ? JUNGLE_LOOP_VARIATIONS[drumLoopVariationIndex].bpm - 20 : drumPreset === 'Lo-Fi' ? LOFI_LOOP_VARIATIONS[lofiLoopVariationIndex].bpm - 20 : drumPreset === 'Garage' ? GARAGE_LOOP_VARIATIONS[garageLoopVariationIndex].bpm - 20 : 60}
                  max={drumPreset === 'Jungle' ? JUNGLE_LOOP_VARIATIONS[drumLoopVariationIndex].bpm + 20 : drumPreset === 'Lo-Fi' ? LOFI_LOOP_VARIATIONS[lofiLoopVariationIndex].bpm + 20 : drumPreset === 'Garage' ? GARAGE_LOOP_VARIATIONS[garageLoopVariationIndex].bpm + 20 : 120}
                  value={tempoBpm}
                  onChange={handleTempoChange}
                />
                <div className="control-status">{droneStatus}</div>
              </>
            )}
            <button className="drums-btn" onClick={toggleSelectedLayerPower} disabled={!started}>
              {selectedLayer === 'drone'
                ? droneOn
                  ? 'Drone: on'
                  : 'Drone: off'
                : selectedLayer === 'bass'
                  ? bassOn
                    ? 'Bass: on'
                    : 'Bass: off'
                : selectedLayer === 'synth'
                  ? synthOn
                    ? 'Synth: on'
                    : 'Synth: off'
                : drumsOn
                  ? 'Drums: on'
                  : 'Drums: off'}
            </button>
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
