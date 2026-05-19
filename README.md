# Video-Editing

A small FFmpeg-powered command-line video editor: `edit.py`.

You describe an edit in words, run one command, and get an edited file
back. No timeline UI — it's a script you run on your own machine where
your videos live.

## Requirements

- Python 3.8+
- [FFmpeg](https://ffmpeg.org/download.html) (`ffmpeg` and `ffprobe` on
  your PATH)

## Usage

```
python3 edit.py --help            # list all commands
python3 edit.py <command> --help  # options for one command
```

Add `--dry-run` to any command to print the FFmpeg command without
running it.

### Commands

| Command         | What it does                                            |
|-----------------|---------------------------------------------------------|
| `info`          | Show duration, resolution, codecs                       |
| `trim`          | Keep one segment (cut the start/end)                    |
| `cut`           | Remove one or more time ranges, keep the rest           |
| `merge`         | Join multiple clips into one                            |
| `social`        | Reframe for Shorts/Reels/TikTok/square/landscape        |
| `resize`        | Scale to a resolution                                   |
| `text`          | Overlay a text caption or title                         |
| `subtitles`     | Burn in or attach an `.srt` file                        |
| `audio`         | Add background music (mix or replace)                   |
| `extract-audio` | Save the audio track as mp3                             |
| `speed`         | Speed up or slow down                                   |
| `fade`          | Fade video + audio in and/or out                        |

### Examples

```bash
# Trim to the 0:10 - 1:30 section
python3 edit.py trim raw.mp4 clip.mp4 --start 0:10 --end 1:30

# Delete two boring stretches, keep everything else
python3 edit.py cut raw.mp4 tight.mp4 --remove 12-18 --remove 95-110

# Join three clips
python3 edit.py merge final.mp4 intro.mp4 body.mp4 outro.mp4

# Make a vertical Short with a blurred background
python3 edit.py social clip.mp4 short.mp4 --preset shorts --mode pad --pad-blur

# Add a title for the first 4 seconds
python3 edit.py text clip.mp4 titled.mp4 --text "My Trip 2026" --position center --box --start 0 --end 4

# Burn in subtitles
python3 edit.py subtitles clip.mp4 subbed.mp4 --srt captions.srt

# Add quiet background music under the original audio
python3 edit.py audio clip.mp4 scored.mp4 --music track.mp3 --music-volume 0.25

# 2x speed-up
python3 edit.py speed clip.mp4 fast.mp4 --factor 2.0
```
