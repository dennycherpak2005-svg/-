#!/usr/bin/env bash
# Audio-Mix für "Skunk Ape – Wildkamera" (Referenz). Pfade anpassen.
# Ergebnis: mix.wav, -14 LUFS, Stimme vorne, Hintergrund wird beim Sprechen abgesenkt (Sidechain-Ducking).
set -euo pipefail
A=${A:-audio}   # Ordner mit vo.mp3 + SFX
OUT=${OUT:-mix.wav}
ffmpeg -hide_banner -loglevel error -y \
 -i $A/vo.mp3 -i $A/cans.mp3 -stream_loop -1 -i $A/swamp.mp3 -stream_loop -1 -i $A/flies.mp3 \
 -stream_loop -1 -i $A/drone.mp3 -i $A/clicks.mp3 -i $A/trig.mp3 -i $A/stinger.mp3 -i $A/growl.mp3 -i $A/glitch.mp3 \
 -filter_complex "
[0]aformat=sample_rates=48000:channel_layouts=stereo,atempo=1.06,volume=5.5dB,acompressor=threshold=0.125:ratio=2.5:attack=8:release=200:makeup=1.6,aecho=1:1:50:0.06,adelay=800|800,apad,atrim=0:63.5,asplit=2[vo][sc];
[1]aformat=sample_rates=48000:channel_layouts=stereo,volume=-8dB,asplit=2[ca][cb];[ca]adelay=4100|4100[c1];[cb]adelay=21600|21600,volume=-4dB[c2];
[2]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:63.5,asetpts=N/SR/TB,volume=-9.5dB,volume='if(lt(t,8.35),1,if(lt(t,28.25),0.35,if(lt(t,33.44),0,if(lt(t,53.91),0.5,if(lt(t,60.4),1,0)))))':eval=frame[swamp];
[3]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:63.5,asetpts=N/SR/TB,volume=-12dB,volume='if(between(t,8.35,16.08),1,0)':eval=frame[flies];
[4]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:63.5,asetpts=N/SR/TB,volume=-23dB,volume='if(lt(t,28.25),min(1,t/2),if(lt(t,36.84),0.6,if(lt(t,60.4),1.5,0)))':eval=frame[drone];
[5]aformat=sample_rates=48000:channel_layouts=stereo,volume=8dB,asplit=2[k1][k2];[k1]atrim=0:2,adelay=28800|28800[kk1];[k2]atrim=0:2.2,adelay=31370|31370[kk2];
[6]aformat=sample_rates=48000:channel_layouts=stereo,volume=-16dB,asplit=2[t1][t2];[t1]adelay=36550|36550[tt1];[t2]adelay=50450|50450[tt2];
[7]aformat=sample_rates=48000:channel_layouts=stereo,volume=-11dB,asplit=2[s1][s2];[s1]adelay=36840|36840[ss1];[s2]adelay=60900|60900,volume=3dB[ss2];
[8]aformat=sample_rates=48000:channel_layouts=stereo,volume=-12dB,asplit=2[r1][r2];[r1]adelay=41100|41100[g1];[r2]adelay=57200|57200,volume=-4dB[g2];
[9]aformat=sample_rates=48000:channel_layouts=stereo,volume=-24dB,adelay=48440|48440[gl];
[c1][c2][swamp][flies][drone][kk1][kk2][tt1][tt2][ss1][ss2][g1][g2][gl]amix=inputs=14:normalize=0:duration=longest,apad,atrim=0:63.5[bed];
[bed][sc]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=450[duck];
[vo][duck]amix=inputs=2:normalize=0,volume=2dB,alimiter=limit=0.89:attack=5:release=60:level=false[a]" \
 -map "[a]" -ar 48000 -c:a pcm_s16le "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1   # Ziel: ca. -14 LUFS
