# Assemble screencast frames into video, synthesize click/typing/chime SFX, mix with music.
import json, subprocess, numpy as np, wave, os
from scipy.signal import butter, lfilter
D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
d = json.load(open('events.json')); fr = d['frames']; t0 = fr[0]; dur = fr[-1] - t0
# 1) frames -> constant 30fps video
with open('frames.txt', 'w') as f:
    for i in range(len(fr) - 1):
        f.write(f"file 'frames/{i:05d}.jpg'\nduration {fr[i+1]-fr[i]:.4f}\n")
    f.write(f"file 'frames/{len(fr)-2:05d}.jpg'\n")
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-an', 'video-only.mp4'], check=True)
# 2) SFX
SR = 48000; n = int((dur + 0.5) * SR); sfx = np.zeros(n)
rng = np.random.default_rng(7)
def env(L, a=0.002, decay=0.03): t = np.arange(L) / SR; return np.minimum(t / a, 1) * np.exp(-t / decay)
def lp(x, fc): b, a = butter(2, fc / (SR / 2)); return lfilter(b, a, x)
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def click():
    L = int(0.06 * SR); t = np.arange(L) / SR
    body = np.sin(2 * np.pi * 1800 * t) * env(L, 0.001, 0.008) * 0.5
    tick = bp(rng.standard_normal(L), 1500, 6000) * env(L, 0.0005, 0.006) * 0.6
    return (body + tick) * 0.55
def key():
    L = int(0.03 * SR); return bp(rng.standard_normal(L), 2000, 7000) * env(L, 0.0005, 0.004) * rng.uniform(0.12, 0.22)
def chime():
    out = np.zeros(int(1.2 * SR))
    for k, (f0, st) in enumerate([(1318.5, 0.0), (1975.5, 0.11)]):
        L = len(out) - int(st * SR); t = np.arange(L) / SR
        tone = (np.sin(2 * np.pi * f0 * t) + 0.3 * np.sin(2 * np.pi * 2 * f0 * t)) * env(L, 0.004, 0.35)
        out[int(st * SR):] += tone * 0.22
    return out
def put(sig, at):
    i = int(at * SR); j = min(n, i + len(sig)); sfx[i:j] += sig[:j - i]
ev = d['events']; ts = {}
for e in ev:
    at = e['epoch'] - t0
    if e['type'] == 'click': put(click(), at)
    elif e['type'] == 'chime': put(chime(), at)
    else: ts[e['type']] = at
if 'typestart' in ts:
    t = ts['typestart']
    while t < ts['typeend']: put(key(), t); t += rng.uniform(0.045, 0.11)
# 3) music
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'music.mp3', '-t', f'{dur+0.5:.2f}', '-ac', '2', '-ar', str(SR), '-f', 's16le', 'music.raw'], check=True)
m = np.frombuffer(open('music.raw', 'rb').read(), dtype=np.int16).reshape(-1, 2).astype(float) / 32768
m = np.pad(m, ((0, max(0, n - len(m))), (0, 0)))[:n]
fade = np.ones(n); fi = int(1.5 * SR); fo = int(2.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix = m * 0.42 * fade[:, None] + sfx[:, None]
mix = np.clip(mix / max(1.0, np.abs(mix).max() / 0.95), -1, 1)
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
# 4) mux
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'video-only.mp4', '-i', 'audio.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', 'demo-phone.mp4'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'video-only.mp4', '-i', 'audio.wav', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-c:a', 'libopus', '-b:a', '96k', '-shortest', 'demo-phone.webm'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', '0.8', '-i', 'video-only.mp4', '-frames:v', '1', 'poster.png'], check=True)
from PIL import Image; Image.open('poster.png').save('demo-phone-poster.webp', quality=82)
print('marks', {k: round(v - (fr[0] - d['events'][0]['epoch']) , 2) for k, v in d['marks'].items()} if False else d['marks'])
print('dur', round(dur, 2))
