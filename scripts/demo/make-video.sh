set -e
cd "$(dirname "$0")"
rm -rf vid && node record.cjs video | tee marks.txt
f=$(ls vid/*.webm)
ffmpeg -loglevel error -y -ss 0.6 -i $f -vf "fps=30" -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart -an demo.mp4
ffmpeg -loglevel error -y -ss 0.6 -i $f -vf "fps=30" -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good -cpu-used 5 -an demo.webm
ffmpeg -loglevel error -y -ss 1.2 -i demo.mp4 -frames:v 1 poster.png
python3 -c "from PIL import Image; Image.open('poster.png').save('demo-poster.webp', quality=80)"
ls -la demo.webm demo.mp4 demo-poster.webp
