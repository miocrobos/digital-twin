# MY FUTURE HEALTH - MEET YOUR DIGITAL TWIN

Monash University research-driven exploration of digital twins in medicine for open application.

## Description

### A) What is the current problem?

People struggle to understand the long-term consequences of daily behavior. Most health tools show static metrics but fail to make future outcomes personal, tangible, or actionable.

### B) What is the expected final product?

The product creates a clear "Future Self" moment. A short questionnaire is used to generate future health trajectories and enable real-time, bidirectional interaction where users explore scenarios, ask questions, and see how behavior changes reshape projected outcomes.

### C) Who are the users?

- Health-conscious young professionals (25-40) tracking lifestyle data but seeking long-term clarity.
- Biohacking enthusiasts looking for deeper, personalized future-health optimization.

## Deep Dive

### 1) Data and Datasets

- User questionnaire: sleep, activity, stress, nutrition, habits.
- Public benchmarks and recommendations for grounding simulations.
- Synthetic/heuristic simulation models to provide plausible and engaging experiential feedback.

### 2) Technology Stack

- TypeScript frontend and app logic.
- LLM-based interaction layer (preferably local models such as Llama 3 or Mistral).
- Simulation layer using rule-based or lightweight model logic.
- Wearable integrations (openwearables.io, Oura Ring, Fitbit, Apple HealthKit).
- Medical data standards: HL7 FHIR, Health Samurai FHIR tooling, Synthea synthetic data.
- Documentation requirement: MkDocs.

### 3) Use Case and Business Case

Users complete a short lifestyle questionnaire and receive a personalized "Future Health Twin" showing projected trajectories (for example: morbidity, mortality, aging). They can interact with the twin, test alternatives, and observe immediate updates to future outcomes based on behavior changes.

### 4) Presentation Prototype Expectations

- End-to-end flow: input -> twin -> interaction -> updated outcome.
- Visible and understandable feedback loop.
- Demonstrable future-outcome change based on one user decision.
- Delivery format: Canva presentation plus live demo.

### 5) Point of Contact

- Prof. Dr. Robin Wilkening
- Monash University, School of Public Health and Preventive Medicine

## Setup

Follow these steps to install and run the current baseline stack.

### Clone the Repository

```bash
git clone --recurse-submodules <your-repo-url> twin
cd twin
```

### Install Python

Install Python 3.10 if not already installed: [Python Download](https://www.python.org/downloads/)

### Backend (`twin-backend`)

```bash
cd twin-backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
modal setup
modal run main.py
```

Deploy backend when needed:

```bash
modal deploy main.py
```

For fast local iteration (lower cost than repeated deploys), use:

```bash
modal serve main.py
```

### Frontend (`twin-frontend`)

Open a new terminal and go to your project folder:

```bash
cd twin
cd twin-frontend
npm i
npm run dev
```

### Optional 3D Model Assets

The 3D twin visual loads model files from:

- `twin-frontend/public/models/dna-helix.glb`
- `twin-frontend/public/models/human-body.glb`

If these files are missing, the UI automatically shows lightweight fallback shapes.

## Hackathon Demo Runbook (1-2 minutes)

Use this script for judges and non-technical users:

1. **Start with user context**
   - "This tool translates lifestyle and DNA signals into simple weekly actions."
2. **Create twin baseline**
   - Fill name, age, sleep, stress, activity, nutrition, smoking.
   - Mention DNA is optional.
3. **Show future health trend**
   - Highlight plain-language takeaway and projected 5-year improvement.
4. **Open 3D twin visual**
   - Explain it as an educational body + DNA context view.
5. **DNA signal exploration (advanced)**
   - Search `BRCA1`, open known variants, run Evo2 analysis.
   - Show comparison card: ClinVar vs Evo2 in plain-language risk terms.
6. **Chat loop**
   - Ask: "What should I change this week?"
   - Show returned format: explanation, action, expected impact, uncertainty/safety note.
7. **Close with safety framing**
   - "This is a decision-support prototype, not a diagnostic tool."

## Communication Principles Used

- Plain-language first, technical details second.
- Risk numbers are explained with words.
- Every recommendation includes uncertainty and a medical safety note.
