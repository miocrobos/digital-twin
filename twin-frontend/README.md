# Twin Frontend (Hackathon Build)

Plain-language web app for the Digital Future Health Twin demo.

## What this frontend does

- Collects user lifestyle and optional DNA context.
- Shows future health trend summaries in non-technical language.
- Lets users explore ClinVar variants and run Evo2 comparison.
- Adds a 3D visual twin section (with fallback visuals if model files are missing).
- Supports chat responses with action suggestion, expected impact, and safety framing.

## Local development

```bash
cd twin-frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `twin-frontend/.env` with:

- `NEXT_PUBLIC_ANALYZE_SINGLE_VARIANT_BASE_URL`
- `NEXT_PUBLIC_TWIN_PROFILE_BASE_URL`
- `NEXT_PUBLIC_TWIN_SIMULATE_BASE_URL`
- `NEXT_PUBLIC_TWIN_CHAT_BASE_URL`

These should point to deployed Modal endpoints from `twin-backend`.

## Optional 3D model assets

To use custom GLB models, add:

- `public/models/dna-helix.glb`
- `public/models/human-body.glb`

If absent, fallback 3D shapes are shown automatically.

## Demo flow (quick script)

1. Create twin baseline (name + lifestyle).
2. Show future trend summary and what-if update.
3. Open DNA variant table with relationships and concise definitions.
4. Run Evo2 on a variant and compare with ClinVar.
5. Ask chat: "What should I do this week?"
6. Export the variant table view as PDF.
