---
title: PartitUp OMR
emoji: 🎵
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# PartitUp OMR backend

Optical Music Recognition API for [PartitUp](https://github.com/ieje1-ua/partitup).
Accepts an image or PDF of a choral score and returns MusicXML, using the
[Audiveris](https://github.com/Audiveris/audiveris) OMR engine.

Endpoints:
- `POST /api/omr` — multipart form field `file` (PNG/JPG/PDF) → `{ status, musicXml }`
- `GET /health` — liveness probe

This Space runs on the free CPU Basic tier (2 vCPU / 16GB RAM) and sleeps after
48h of inactivity; the first request after sleeping wakes it (~30-60s cold start).

> Deployed from the `server/` directory of the PartitUp repo. `Dockerfile.hf`
> is renamed to `Dockerfile` and this file to `README.md` in the Space repo.
