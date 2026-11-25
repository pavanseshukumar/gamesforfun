#!/usr/bin/env python3
"""
Synthesizes every sound effect in assets/sounds/ from scratch: original,
royalty-free, and tiny. Re-run after tweaking a recipe:

    python3 scripts/generate-sounds.py

Needs numpy. Output: 22.05 kHz, 16-bit mono WAV.
"""
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- building blocks


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def note(name):
    """Note name like 'C6' or 'F#5' → frequency in Hz."""
    steps = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3,
             "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((steps[pitch] + (octave - 4) * 12) / 12)


def env(n, attack=0.004, decay=6.0, hold=0.0):
    """Fast attack, optional hold, then exponential decay (rate in 1/s)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.clip(t - attack - hold, 0, None) * decay)
    return a * d


def osc(freq, dur, shape="sine"):
    """Oscillator; `freq` may be a number or an array (for sweeps)."""
    n = int(SR * dur)
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    phase = 2 * np.pi * np.cumsum(f) / SR
    if shape == "sine":
        return np.sin(phase)
    if shape == "tri":
        return 2 / np.pi * np.arcsin(np.sin(phase))
    if shape == "soft-square":  # first few odd harmonics: warm, not harsh
        return sum(np.sin(k * phase) / k for k in (1, 3, 5, 7)) * 0.8
    raise ValueError(shape)


def sweep(f0, f1, dur, curve=1.0):
    t = np.linspace(0, 1, int(SR * dur))
    return f0 + (f1 - f0) * t**curve


def bell(freq, dur, decay=7.0, bright=0.5):
    """Bell-ish tone from inharmonic partials."""
    t_n = int(SR * dur)
    out = np.zeros(t_n)
    for ratio, amp, dk in ((1, 1, 1), (2.76, 0.4 * bright, 1.8), (5.4, 0.2 * bright, 3.0)):
        out += amp * osc(freq * ratio, dur) * env(t_n, 0.002, decay * dk)
    return out


def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def mix(*parts):
    """Mix (signal, start_seconds) pairs into one buffer."""
    end = max(int(start * SR) + len(sig) for sig, start in parts)
    out = np.zeros(end)
    for sig, start in parts:
        i = int(start * SR)
        out[i:i + len(sig)] += sig
    return out


def echo(x, delay=0.07, feedback=0.3, taps=3):
    d = int(delay * SR)
    out = np.concatenate([x, np.zeros(d * taps)])
    for k in range(1, taps + 1):
        out[k * d:k * d + len(x)] += x * feedback**k
    return out


def finish(x, peak=0.7):
    fade = min(len(x), int(0.01 * SR))
    x = x.copy()
    x[-fade:] *= np.linspace(1, 0, fade)  # no click at the end
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def save(name, x, peak=0.7):
    data = (finish(x, peak) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------------------------------------------------------------- recipes


def ui_tap():
    d = 0.05
    return osc(sweep(1250, 880, d), d) * env(int(SR * d), 0.002, 70)


def ui_select():
    d = 0.03
    return osc(1700, d, "tri") * env(int(SR * d), 0.001, 120)


def pop(mult):
    """Bubble pop; higher `mult` = higher pitch for combos."""
    d = 0.1
    body = osc(sweep(380 * mult, 980 * mult, d, 0.6), d) * env(int(SR * d), 0.002, 38)
    click = highpass(noise(0.008), 2500) * 0.25
    return mix((body, 0), (click, 0))


def star():
    parts = [(bell(note(n), 0.35, 9), i * 0.055) for i, n in enumerate(("E6", "G#6", "B6"))]
    return echo(mix(*parts), 0.06, 0.25)


def wrong():
    a = osc(sweep(240, 190, 0.16), 0.16, "soft-square") * env(int(SR * 0.16), 0.004, 10)
    b = osc(sweep(185, 140, 0.22), 0.22, "soft-square") * env(int(SR * 0.22), 0.004, 9)
    return lowpass(mix((a, 0), (b, 0.13)), 1800)


def whoosh():
    d = 0.16
    n = int(SR * d)
    swell = np.sin(np.linspace(0, np.pi, n)) ** 2
    return lowpass(highpass(noise(d), 600), 3500) * swell * 0.8


def merge():
    d = 0.11
    tone = osc(sweep(320, 640, d, 0.5), d, "tri") * env(int(SR * d), 0.002, 25)
    thump = osc(sweep(160, 90, 0.06), 0.06) * env(int(SR * 0.06), 0.001, 50)
    return mix((tone, 0), (thump * 0.7, 0))


def flip():
    swish = highpass(noise(0.05), 1800) * env(int(SR * 0.05), 0.001, 70)
    tick = osc(1400, 0.03, "tri") * env(int(SR * 0.03), 0.001, 120) * 0.4
    return mix((swish, 0), (tick, 0.012))


def match():
    return echo(mix((bell(note("C6"), 0.4, 6), 0), (bell(note("G6"), 0.5, 5), 0.09)), 0.08, 0.2)


def jump():
    d = 0.2
    t = t_axis(d)
    f = sweep(260, 760, d, 0.7) * (1 + 0.04 * np.sin(2 * np.pi * 28 * t))
    return osc(f, d) * env(int(SR * d), 0.003, 12)


def land():
    d = 0.1
    thud = osc(sweep(150, 70, d), d) * env(int(SR * d), 0.001, 30)
    tap = lowpass(noise(0.015), 1500) * 0.4
    return mix((thud, 0), (tap, 0))


def perfect():
    parts = [(bell(note(n), 0.3, 10, 0.7), i * 0.045) for i, n in enumerate(("C6", "E6", "G6", "C7"))]
    return echo(mix(*parts), 0.05, 0.25)


def catch():
    d = 0.08
    f = sweep(520, 860, d, 0.5)
    return (osc(f, d) + 0.3 * osc(2 * f, d)) * env(int(SR * d), 0.002, 40)


def powerup():
    d = 0.42
    t = t_axis(d)
    tone = osc(sweep(380, 1600, d, 1.4), d, "tri") * (0.75 + 0.25 * np.sin(2 * np.pi * 22 * t))
    return tone * env(int(SR * d), 0.01, 3, hold=0.25)


def shield():
    return echo(bell(1760, 0.3, 9, 0.9), 0.05, 0.3)


def tick():
    d = 0.06
    wood = osc(820, d) * env(int(SR * d), 0.001, 70)
    click = highpass(noise(0.006), 3000) * 0.3
    return mix((wood, 0), (click, 0))


def go():
    return echo(bell(note("C6"), 0.35, 6, 0.8) + bell(note("G6"), 0.35, 6, 0.4) * 0.6, 0.06, 0.2)


def win():
    seq = ("C5", "E5", "G5", "C6")
    parts = [(osc(note(n), 0.16, "soft-square") * env(int(SR * 0.16), 0.004, 9) * 0.6, i * 0.1)
             for i, n in enumerate(seq)]
    chord = sum(osc(note(n), 0.6, "tri") for n in ("C6", "E6", "G6")) * env(int(SR * 0.6), 0.01, 4)
    parts.append((chord * 0.5, 0.42))
    parts.append((bell(note("C7"), 0.6, 5) * 0.4, 0.42))
    return lowpass(echo(mix(*parts), 0.08, 0.2), 6000)


def gameover():
    seq = ("G4", "E4", "C4")
    parts = [(osc(note(n), 0.24, "tri") * env(int(SR * 0.24), 0.005, 7), i * 0.17)
             for i, n in enumerate(seq)]
    return lowpass(mix(*parts), 2500)


def levelup():
    d = 0.35
    gliss = osc(sweep(note("C5"), note("C7"), d, 1.6), d, "tri") * env(int(SR * d), 0.01, 3, 0.2) * 0.5
    return echo(mix((gliss, 0), (bell(note("C7"), 0.5, 5), 0.3), (bell(note("G7"), 0.4, 6) * 0.5, 0.38)), 0.07, 0.25)


def slide():
    d = 0.045
    knock = osc(sweep(640, 520, d), d) * env(int(SR * d), 0.001, 80)
    click = lowpass(noise(0.01), 2500) * 0.35
    return mix((knock, 0), (click, 0))


def solved():
    parts = [(bell(note(n), 0.9, 3.5, 0.6), i * 0.08) for i, n in enumerate(("C6", "E6", "G6", "B6", "D7"))]
    return echo(mix(*parts), 0.09, 0.3, 4)


def warn():
    a = osc(1320, 0.05, "tri") * env(int(SR * 0.05), 0.001, 60)
    return mix((a, 0), (a, 0.1))


def switch():
    return mix((bell(note("E6"), 0.25, 8), 0), (bell(note("A6"), 0.35, 7), 0.1))


SOUNDS = {
    "tap": (ui_tap, 0.45),
    "select": (ui_select, 0.4),
    "pop1": (lambda: pop(1.0), 0.6),
    "pop2": (lambda: pop(1.12), 0.6),
    "pop3": (lambda: pop(1.26), 0.6),
    "pop4": (lambda: pop(1.5), 0.6),
    "star": (star, 0.6),
    "wrong": (wrong, 0.55),
    "whoosh": (whoosh, 0.45),
    "merge": (merge, 0.6),
    "flip": (flip, 0.5),
    "match": (match, 0.6),
    "jump": (jump, 0.5),
    "land": (land, 0.6),
    "perfect": (perfect, 0.6),
    "catch": (catch, 0.55),
    "powerup": (powerup, 0.5),
    "shield": (shield, 0.55),
    "tick": (tick, 0.6),
    "go": (go, 0.65),
    "win": (win, 0.65),
    "gameover": (gameover, 0.6),
    "levelup": (levelup, 0.6),
    "slide": (slide, 0.55),
    "solved": (solved, 0.6),
    "warn": (warn, 0.45),
    "switch": (switch, 0.55),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, (fn, peak) in SOUNDS.items():
        save(name, fn(), peak)
    print(f"wrote {len(SOUNDS)} sounds to {os.path.normpath(OUT)}")
