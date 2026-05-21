#!/usr/bin/env python3
"""
edit.py - a small FFmpeg-powered video editing CLI.

Run `python3 edit.py --help` for the list of commands, or
`python3 edit.py <command> --help` for options on a single command.

Requires ffmpeg and ffprobe on your PATH.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
]

PRESETS = {
    # name: (width, height)
    "shorts": (1080, 1920),
    "reels": (1080, 1920),
    "tiktok": (1080, 1920),
    "vertical": (1080, 1920),
    "square": (1080, 1080),
    "youtube": (1920, 1080),
    "landscape": (1920, 1080),
}


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def need_tools():
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            fail(f"'{tool}' not found on PATH. Install FFmpeg first.")


def run(cmd, dry_run=False):
    printable = " ".join(
        (f'"{c}"' if (" " in c or "'" in c) else c) for c in cmd
    )
    print(f"\n$ {printable}\n")
    if dry_run:
        return
    result = subprocess.run(cmd)
    if result.returncode != 0:
        fail(f"ffmpeg exited with code {result.returncode}")


def probe(path):
    if not os.path.exists(path):
        fail(f"input file not found: {path}")
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", path],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        fail(f"ffprobe could not read: {path}")
    return json.loads(out.stdout)


def get_duration(path):
    info = probe(path)
    return float(info["format"]["duration"])


def get_resolution(path):
    info = probe(path)
    for s in info["streams"]:
        if s.get("codec_type") == "video":
            return int(s["width"]), int(s["height"])
    fail(f"no video stream in: {path}")


def resolve_font(font):
    if font:
        if not os.path.exists(font):
            fail(f"font file not found: {font}")
        return font
    for c in FONT_CANDIDATES:
        if os.path.exists(c):
            return c
    fail("no font file found; pass --font /path/to/font.ttf")


def ff_escape(text):
    """Escape text for use inside an ffmpeg drawtext filter value."""
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def common_encode():
    return ["-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart"]

# ---------------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------------


def cmd_info(a):
    info = probe(a.input)
    fmt = info["format"]
    print(f"file     : {a.input}")
    print(f"duration : {float(fmt['duration']):.2f} s")
    print(f"size     : {int(fmt['size']) / 1_048_576:.2f} MiB")
    for s in info["streams"]:
        if s.get("codec_type") == "video":
            print(f"video    : {s['width']}x{s['height']} "
                  f"{s.get('codec_name')} {s.get('r_frame_rate')} fps")
        elif s.get("codec_type") == "audio":
            print(f"audio    : {s.get('codec_name')} "
                  f"{s.get('sample_rate')} Hz {s.get('channels')} ch")


def cmd_trim(a):
    cmd = ["ffmpeg", "-y", "-i", a.input, "-ss", a.start]
    if a.end:
        cmd += ["-to", a.end]
    elif a.duration:
        cmd += ["-t", a.duration]
    cmd += common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_cut(a):
    """Remove one or more time ranges, keeping everything else."""
    total = get_duration(a.input)
    removes = []
    for r in a.remove:
        try:
            s, e = r.split("-")
            removes.append((float(s), float(e)))
        except ValueError:
            fail(f"--remove expects START-END in seconds, got: {r}")
    removes.sort()

    keep, cursor = [], 0.0
    for s, e in removes:
        if s > cursor:
            keep.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < total:
        keep.append((cursor, total))
    if not keep:
        fail("nothing left after removing those ranges")

    parts, concat = [], ""
    for i, (s, e) in enumerate(keep):
        parts.append(
            f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS[a{i}]"
        )
        concat += f"[v{i}][a{i}]"
    fc = ";".join(parts) + ";" + concat + \
        f"concat=n={len(keep)}:v=1:a=1[v][a]"
    cmd = ["ffmpeg", "-y", "-i", a.input, "-filter_complex", fc,
           "-map", "[v]", "-map", "[a]"] + common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_merge(a):
    if len(a.inputs) < 2:
        fail("merge needs at least 2 input files")
    w, h = get_resolution(a.inputs[0])
    cmd = ["ffmpeg", "-y"]
    for f in a.inputs:
        if not os.path.exists(f):
            fail(f"input file not found: {f}")
        cmd += ["-i", f]
    parts, concat = [], ""
    for i in range(len(a.inputs)):
        parts.append(
            f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{i}];"
            f"[{i}:a]aresample=48000[a{i}]"
        )
        concat += f"[v{i}][a{i}]"
    fc = ";".join(parts) + ";" + concat + \
        f"concat=n={len(a.inputs)}:v=1:a=1[v][a]"
    cmd += ["-filter_complex", fc, "-map", "[v]", "-map", "[a]"]
    cmd += common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_social(a):
    if a.preset not in PRESETS:
        fail(f"unknown preset '{a.preset}'. "
             f"choose from: {', '.join(PRESETS)}")
    w, h = PRESETS[a.preset]
    if a.mode == "crop":
        vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
              f"crop={w}:{h}")
    elif a.pad_blur:
        vf = (f"split[main][bg];"
              f"[bg]scale={w}:{h}:force_original_aspect_ratio=increase,"
              f"crop={w}:{h},gblur=sigma=25[bg];"
              f"[main]scale={w}:{h}:force_original_aspect_ratio=decrease"
              f"[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
    else:
        vf = (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
              f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color={a.bg}")
    flag = "-filter_complex" if a.pad_blur and a.mode == "pad" else "-vf"
    cmd = ["ffmpeg", "-y", "-i", a.input, flag, vf] + \
        common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_resize(a):
    if a.width and a.height:
        scale = f"scale={a.width}:{a.height}"
    elif a.width:
        scale = f"scale={a.width}:-2"
    elif a.height:
        scale = f"scale=-2:{a.height}"
    else:
        fail("provide --width and/or --height")
    cmd = ["ffmpeg", "-y", "-i", a.input, "-vf", scale] + \
        common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_text(a):
    font = resolve_font(a.font)
    positions = {
        "top": "x=(w-text_w)/2:y=h*0.08",
        "center": "x=(w-text_w)/2:y=(h-text_h)/2",
        "bottom": "x=(w-text_w)/2:y=h*0.85",
        "topleft": "x=w*0.05:y=h*0.08",
        "bottomleft": "x=w*0.05:y=h*0.85",
    }
    if a.position not in positions:
        fail(f"position must be one of: {', '.join(positions)}")
    draw = (
        f"drawtext=fontfile='{font}':text='{ff_escape(a.text)}':"
        f"fontsize={a.size}:fontcolor={a.color}:"
        f"{positions[a.position]}"
    )
    if a.box:
        draw += ":box=1:boxcolor=black@0.5:boxborderw=12"
    if a.start is not None or a.end is not None:
        s = a.start if a.start is not None else 0
        e = a.end if a.end is not None else get_duration(a.input)
        draw += f":enable='between(t,{s},{e})'"
    cmd = ["ffmpeg", "-y", "-i", a.input, "-vf", draw,
           "-c:a", "copy"] + common_encode()[:8] + [a.output]
    run(cmd, a.dry_run)


def cmd_subtitles(a):
    if not os.path.exists(a.srt):
        fail(f"subtitle file not found: {a.srt}")
    if a.soft:
        cmd = ["ffmpeg", "-y", "-i", a.input, "-i", a.srt,
               "-c", "copy", "-c:s", "mov_text", a.output]
    else:
        path = a.srt.replace("\\", "/").replace(":", "\\:").replace(
            "'", "\\'")
        sub = f"subtitles='{path}'"
        if a.style:
            sub += f":force_style='{a.style}'"
        cmd = ["ffmpeg", "-y", "-i", a.input, "-vf", sub,
               "-c:a", "copy"] + common_encode()[:8] + [a.output]
    run(cmd, a.dry_run)


def cmd_audio(a):
    if not os.path.exists(a.music):
        fail(f"music file not found: {a.music}")
    if a.mode == "replace":
        cmd = ["ffmpeg", "-y", "-i", a.input, "-stream_loop", "-1",
               "-i", a.music, "-map", "0:v", "-map", "1:a",
               "-shortest", "-c:v", "copy", "-c:a", "aac",
               "-b:a", "192k", a.output]
    else:  # mix
        fc = (f"[0:a]volume={a.orig_volume}[a0];"
              f"[1:a]volume={a.music_volume}[a1];"
              f"[a0][a1]amix=inputs=2:duration=first:dropout_transition=0"
              f"[aout]")
        cmd = ["ffmpeg", "-y", "-i", a.input, "-stream_loop", "-1",
               "-i", a.music, "-filter_complex", fc,
               "-map", "0:v", "-map", "[aout]", "-shortest",
               "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", a.output]
    run(cmd, a.dry_run)


def cmd_extract_audio(a):
    cmd = ["ffmpeg", "-y", "-i", a.input, "-vn",
           "-c:a", "libmp3lame", "-q:a", "2", a.output]
    run(cmd, a.dry_run)


def cmd_speed(a):
    if a.factor <= 0:
        fail("--factor must be > 0")
    vf = f"setpts=PTS/{a.factor}"
    # atempo only accepts 0.5..2.0, so decompose the factor
    remaining, chain = a.factor, []
    while remaining > 2.0:
        chain.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        chain.append("atempo=0.5")
        remaining /= 0.5
    chain.append(f"atempo={remaining:.6f}")
    if a.mute:
        cmd = ["ffmpeg", "-y", "-i", a.input, "-vf", vf, "-an"]
    else:
        fc = f"[0:v]{vf}[v];[0:a]{','.join(chain)}[a]"
        cmd = ["ffmpeg", "-y", "-i", a.input, "-filter_complex", fc,
               "-map", "[v]", "-map", "[a]"]
    cmd += common_encode() + [a.output]
    run(cmd, a.dry_run)


def cmd_fade(a):
    dur = get_duration(a.input)
    vf, af = [], []
    if a.fin > 0:
        vf.append(f"fade=t=in:st=0:d={a.fin}")
        af.append(f"afade=t=in:st=0:d={a.fin}")
    if a.fout > 0:
        st = max(0.0, dur - a.fout)
        vf.append(f"fade=t=out:st={st}:d={a.fout}")
        af.append(f"afade=t=out:st={st}:d={a.fout}")
    if not vf:
        fail("set --in and/or --out (seconds)")
    cmd = ["ffmpeg", "-y", "-i", a.input,
           "-vf", ",".join(vf), "-af", ",".join(af)]
    cmd += common_encode() + [a.output]
    run(cmd, a.dry_run)

# ---------------------------------------------------------------------------
# argument parser
# ---------------------------------------------------------------------------


def build_parser():
    p = argparse.ArgumentParser(
        prog="edit.py",
        description="FFmpeg-powered video editing CLI.")
    sub = p.add_subparsers(dest="command", required=True)

    def add(name, fn, help):
        sp = sub.add_parser(name, help=help)
        sp.add_argument("--dry-run", action="store_true",
                        help="print the ffmpeg command without running it")
        sp.set_defaults(func=fn)
        return sp

    s = add("info", cmd_info, "show duration / resolution / codecs")
    s.add_argument("input")

    s = add("trim", cmd_trim, "keep one segment (cut start/end)")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--start", default="0",
                   help="start time, e.g. 0:10 or 12.5")
    g = s.add_mutually_exclusive_group()
    g.add_argument("--end", help="end time, e.g. 1:30")
    g.add_argument("--duration", help="length to keep from --start")

    s = add("cut", cmd_cut, "remove one or more ranges, keep the rest")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--remove", action="append", required=True,
                   metavar="START-END",
                   help="seconds range to delete, e.g. 10-20 "
                        "(repeatable)")

    s = add("merge", cmd_merge, "join multiple clips into one")
    s.add_argument("output")
    s.add_argument("inputs", nargs="+")

    s = add("social", cmd_social,
            "reframe for Shorts/Reels/TikTok/square/etc.")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--preset", default="shorts",
                   help=f"one of: {', '.join(PRESETS)}")
    s.add_argument("--mode", choices=["crop", "pad"], default="crop")
    s.add_argument("--bg", default="black",
                   help="pad color when --mode pad")
    s.add_argument("--pad-blur", action="store_true",
                   help="blurred background instead of solid bars")

    s = add("resize", cmd_resize, "scale to a resolution")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--width", type=int)
    s.add_argument("--height", type=int)

    s = add("text", cmd_text, "overlay a text caption / title")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--text", required=True)
    s.add_argument("--position", default="bottom",
                   help="top, center, bottom, topleft, bottomleft")
    s.add_argument("--size", type=int, default=48)
    s.add_argument("--color", default="white")
    s.add_argument("--box", action="store_true",
                   help="draw a translucent box behind the text")
    s.add_argument("--start", type=float,
                   help="show from this second")
    s.add_argument("--end", type=float, help="hide after this second")
    s.add_argument("--font", help="path to a .ttf font file")

    s = add("subtitles", cmd_subtitles, "burn or attach an .srt file")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--srt", required=True)
    s.add_argument("--soft", action="store_true",
                   help="attach as a toggleable track (mp4 only) "
                        "instead of burning in")
    s.add_argument("--style",
                   help="libass force_style, e.g. "
                        "'Fontsize=24,PrimaryColour=&H00FFFF&'")

    s = add("audio", cmd_audio, "add background music")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--music", required=True)
    s.add_argument("--mode", choices=["mix", "replace"], default="mix")
    s.add_argument("--music-volume", type=float, default=0.3)
    s.add_argument("--orig-volume", type=float, default=1.0)

    s = add("extract-audio", cmd_extract_audio,
            "save the audio track as mp3")
    s.add_argument("input")
    s.add_argument("output")

    s = add("speed", cmd_speed, "speed up or slow down")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--factor", type=float, required=True,
                   help="2.0 = 2x faster, 0.5 = half speed")
    s.add_argument("--mute", action="store_true",
                   help="drop audio instead of pitch-shifting it")

    s = add("fade", cmd_fade, "fade video+audio in and/or out")
    s.add_argument("input")
    s.add_argument("output")
    s.add_argument("--in", dest="fin", type=float, default=0.0,
                   help="fade-in seconds")
    s.add_argument("--out", dest="fout", type=float, default=0.0,
                   help="fade-out seconds")

    return p


def main():
    need_tools()
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
