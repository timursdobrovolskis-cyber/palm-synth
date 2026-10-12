# palm-synth

A hand-controlled synth that runs in the browser. Your webcam tracks both hands with [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker), and pinch gestures play and shape four [Tone.js](https://tonejs.github.io/) layers: a **drone**, **bass**, a **melodic synth** and **drums**.

## Running it

```bash
npm install
npm run dev
```

Open the local URL Vite prints, click **Start** and allow camera access. Use a recent desktop browser; the hand-tracking model loads from Google's CDN, so you need to be online.

## Controls

The **left hand picks a layer**: pinch your thumb against one of its fingers and hold it. While you hold the pinch, the **right hand edits that layer**. When you let go of the left pinch, your settings are saved.

| Left-hand pinch (thumb +) | Layer  |
| ------------------------- | ------ |
| Index                     | Drone  |
| Middle                    | Synth  |
| Ring                      | Bass   |
| Pinky                     | Drums  |

With a layer selected, pinch your right thumb against a finger. For continuous controls, the height of the pinch sets the value (higher means more):

| Right-hand pinch (thumb +) | Drone      | Synth            | Bass             | Drums                         |
| -------------------------- | ---------- | ---------------- | ---------------- | ----------------------------- |
| Index                      | Volume     | Volume           | Volume           | Volume                        |
| Middle                     | Reverb     | Motion           | Activity         | Tempo                         |
| Ring                       | Brightness | Next pattern     | Next pattern     | Next loop variation           |
| Pinky                      | Next preset| Next preset      | Next character   | Next style                    |

In drone mode, the height of your **left index finger** also sets the pitch of the drone note.

The on-screen button turns the selected layer on or off, and the tempo slider sets the BPM.

### Presets

- **Drone:** Fog, Sine, Buzz, Square, Dream
- **Synth:** 90s Digital, Analog Poly, FM Keys, Acid Pluck, Organ Synth, Dream Pad
- **Drum styles:** Lo-Fi, Jungle, Breakbeat, Glitch, Garage. The Jungle, Lo-Fi and Garage styles use sampled loops, with four variations each.

## Stack

React 19, Vite, Tone.js, and `@mediapipe/tasks-vision`.

## Sample credits

- `public/samples/jungle/`: CC0 loops from Freesound. See [SOURCE.md](public/samples/jungle/SOURCE.md) for creators and links.
- `public/samples/lo-fi/` and `public/samples/garage/`: drum loops from [Looperman](https://www.looperman.com/). The filenames contain the Looperman loop IDs, and the loops are subject to Looperman's terms of use.
