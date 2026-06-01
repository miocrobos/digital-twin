import json
import os
import sys
from typing import Any

import modal

from pydantic import BaseModel

class VariantRequest(BaseModel):
    variant_position: int
    alternative: str
    genome: str
    chromosome: str


class LifestyleProfile(BaseModel):
    sleep_hours: float
    stress_level: int
    activity_minutes_per_week: int
    nutrition_quality: int
    smoking: bool


class TwinProfileRequest(BaseModel):
    name: str
    age: int
    lifestyle: LifestyleProfile
    has_dna_data: bool = False
    genome_assembly: str | None = None
    dna_summary: str | None = None


class SimulateTwinRequest(BaseModel):
    profile: TwinProfileRequest
    intervention_focus: str = "sleep"
    intervention_delta: float = 1.0


class TwinChatRequest(BaseModel):
    message: str
    profile: TwinProfileRequest
    simulation: dict[str, Any]


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _compute_risk_score(profile: TwinProfileRequest) -> float:
    lifestyle = profile.lifestyle
    score = 0.45

    score += 0.05 * _clamp(7.0 - lifestyle.sleep_hours, 0.0, 5.0)
    score += 0.05 * _clamp(lifestyle.stress_level - 3, 0.0, 7.0)
    score += 0.05 * _clamp((150 - lifestyle.activity_minutes_per_week) / 50, 0.0, 3.0)
    score += 0.05 * _clamp(3 - lifestyle.nutrition_quality, 0.0, 3.0)

    if lifestyle.smoking:
        score += 0.12

    if profile.has_dna_data:
        # Treat DNA-aware mode as higher personalization confidence.
        score += 0.02

    return _clamp(score, 0.05, 0.95)


def _build_projection(risk_score: float, years: int) -> dict[str, float]:
    return {
        "years": years,
        "risk_score": round(risk_score + (years * 0.01), 4),
        "health_index": round((1 - risk_score) * 100 - years * 1.5, 2),
    }


def _run_twin_simulation(
    profile: TwinProfileRequest,
    intervention_focus: str,
    intervention_delta: float,
) -> dict[str, Any]:
    baseline_risk = _compute_risk_score(profile)
    improved_profile = profile.model_copy(deep=True)

    if intervention_focus == "sleep":
        improved_profile.lifestyle.sleep_hours = _clamp(
            improved_profile.lifestyle.sleep_hours + intervention_delta,
            4.0,
            9.0,
        )
    elif intervention_focus == "activity":
        improved_profile.lifestyle.activity_minutes_per_week = int(
            _clamp(
                improved_profile.lifestyle.activity_minutes_per_week + intervention_delta,
                0.0,
                600.0,
            )
        )
    elif intervention_focus == "stress":
        improved_profile.lifestyle.stress_level = int(
            _clamp(
                improved_profile.lifestyle.stress_level - intervention_delta,
                1.0,
                10.0,
            )
        )

    improved_risk = _compute_risk_score(improved_profile)
    confidence_tier = "enhanced" if profile.has_dna_data else "standard"

    return {
        "confidence_tier": confidence_tier,
        "current_state_summary": {
            "baseline_risk_score": round(baseline_risk, 4),
            "primary_lever": intervention_focus,
            "dna_mode": "provided" if profile.has_dna_data else "unknown",
        },
        "future_projection_baseline": [
            _build_projection(baseline_risk, 1),
            _build_projection(baseline_risk, 5),
        ],
        "future_projection_improved": [
            _build_projection(improved_risk, 1),
            _build_projection(improved_risk, 5),
        ],
        "delta": {
            "risk_reduction": round(baseline_risk - improved_risk, 4),
            "health_index_gain_5y": round((baseline_risk - improved_risk) * 100, 2),
        },
        "top_levers": [
            "sleep_consistency",
            "weekly_activity",
            "stress_reduction",
        ],
    }


def _classify_ui_intents(message: str) -> list[dict[str, str]]:
    """Detect which UI panels the chat response should suggest opening."""
    intents: list[dict[str, str]] = []
    m = message.lower()
    if any(k in m for k in ["compar", "variant", "dna", "gene", "brca", "tp53", "mutation", "cancer gene", "genome"]):
        intents.append({"panel_type": "compare_variants"})
    if any(k in m for k in ["lifestyle", "sleep more", "exercise", "activity", "stress", "what if i", "scenario"]):
        intents.append({"panel_type": "lifestyle_what_if"})
    if any(k in m for k in ["explore", "chromosome", "sequence", "region", "look at"]):
        intents.append({"panel_type": "explore_dna_region"})
    return intents


def _call_chat_llm(request: TwinChatRequest) -> dict[str, object]:
    import requests
    import re

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "assistant_message": (
                "Twin LLM is not configured yet. Add OPENAI_API_KEY in your backend "
                "environment to enable live conversational responses."
            ),
            "action_suggestion": "Increase sleep by 45-60 minutes for the next 7 days.",
            "expected_impact": "Small but measurable risk reduction in the 1-year projection.",
            "uncertainty_note": "This is a directional estimate, not a diagnosis.",
            "safety_note": "For medical decisions, speak with a qualified clinician.",
            "ui_intents": _classify_ui_intents(request.message),
        }

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    url = f"{base_url.rstrip('/')}/chat/completions"

    system_prompt = (
        "You are Twin, a preventive-health digital twin assistant. "
        "Be concise, practical, and non-diagnostic. Use plain language for non-experts."
    )
    user_prompt = (
        f"Profile: {request.profile.model_dump()}\n"
        f"Simulation: {request.simulation}\n"
        f"User message: {request.message}\n"
        "Return JSON only with these keys:\n"
        "- plain_explanation: one short paragraph in everyday language\n"
        "- action_suggestion: one practical action for this week\n"
        "- expected_impact: one sentence with expected trend change\n"
        "- uncertainty_note: one sentence about uncertainty\n"
        "- safety_note: one sentence that this is not medical diagnosis"
    )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "temperature": 0.3,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
        timeout=45,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]

    parsed: dict[str, str] = {}
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        json_match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                parsed = {}

    return {
        "assistant_message": str(parsed.get("plain_explanation", content)).strip(),
        "action_suggestion": str(
            parsed.get(
                "action_suggestion",
                "Use one manageable behavior change this week and track consistency.",
            )
        ).strip(),
        "expected_impact": str(
            parsed.get(
                "expected_impact",
                "Steady progress can improve your future health trend over time.",
            )
        ).strip(),
        "uncertainty_note": str(
            parsed.get(
                "uncertainty_note",
                "This is a probability-based estimate and may change with more data.",
            )
        ).strip(),
        "safety_note": str(
            parsed.get(
                "safety_note",
                "This tool is educational and does not replace professional medical advice.",
            )
        ).strip(),
        "ui_intents": _classify_ui_intents(request.message),
    }

evo2_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.12"
    )
    .apt_install(
        [
            "build-essential",
            "cmake",
            "ninja-build",
            "git",
            "gcc",
            "g++",
            "libcudnn9-dev-cuda-12",
        ]
    )
    .env({
        "CXX": "/usr/bin/g++",
    })
    .run_commands("pip install wheel")
    .run_commands("pip install torch --index-url https://download.pytorch.org/whl/cu124")
    .run_commands("pip install 'transformer-engine[pytorch]==2.6.0.post1'")
    .run_commands("pip install packaging")
    .run_commands("git clone --recurse-submodules https://github.com/ArcInstitute/evo2.git && cd evo2 && pip install -e .")
    .run_commands("pip install 'flash-attn==2.7.4.post1' --no-build-isolation")
    .pip_install_from_requirements("requirements.txt")
)

app = modal.App("variant-analysis-evo2", image=evo2_image)

volume = modal.Volume.from_name("hf_cache", create_if_missing=True)
mount_path = "/root/.cache/huggingface"


@app.function(gpu="H100", volumes={mount_path: volume}, timeout=1000)
def run_brca1_analysis():
    import base64
    from io import BytesIO
    from Bio import SeqIO
    import gzip
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    import os
    import seaborn as sns
    from sklearn.metrics import roc_auc_score, roc_curve

    from evo2 import Evo2

    WINDOW_SIZE = 8192

    print("Loading evo2 model...")
    model = Evo2('evo2_7b')
    print("Evo2 model loaded")

    brca1_df = pd.read_excel(
        '/evo2/notebooks/brca1/41586_2018_461_MOESM3_ESM.xlsx',
        header=2,
    )
    brca1_df = brca1_df[[
        'chromosome', 'position (hg19)', 'reference', 'alt', 'function.score.mean', 'func.class',
    ]]

    brca1_df.rename(columns={
        'chromosome': 'chrom',
        'position (hg19)': 'pos',
        'reference': 'ref',
        'alt': 'alt',
        'function.score.mean': 'score',
        'func.class': 'class',
    }, inplace=True)

    # Convert to two-class system
    brca1_df['class'] = brca1_df['class'].replace(['FUNC', 'INT'], 'FUNC/INT')

    with gzip.open('/evo2/notebooks/brca1/GRCh37.p13_chr17.fna.gz', "rt") as handle:
        for record in SeqIO.parse(handle, "fasta"):
            seq_chr17 = str(record.seq)
            break

    # Build mappings of unique reference sequences
    ref_seqs = []
    ref_seq_to_index = {}

    # Parse sequences and store indexes
    ref_seq_indexes = []
    var_seqs = []

    brca1_subset = brca1_df.iloc[:500].copy()

    for _, row in brca1_subset.iterrows():
        p = row["pos"] - 1  # Convert to 0-indexed position
        full_seq = seq_chr17

        ref_seq_start = max(0, p - WINDOW_SIZE//2)
        ref_seq_end = min(len(full_seq), p + WINDOW_SIZE//2)
        ref_seq = seq_chr17[ref_seq_start:ref_seq_end]
        snv_pos_in_ref = min(WINDOW_SIZE//2, p)
        var_seq = ref_seq[:snv_pos_in_ref] + \
            row["alt"] + ref_seq[snv_pos_in_ref+1:]

        # Get or create index for reference sequence
        if ref_seq not in ref_seq_to_index:
            ref_seq_to_index[ref_seq] = len(ref_seqs)
            ref_seqs.append(ref_seq)

        ref_seq_indexes.append(ref_seq_to_index[ref_seq])
        var_seqs.append(var_seq)

    ref_seq_indexes = np.array(ref_seq_indexes)

    print(
        f'Scoring likelihoods of {len(ref_seqs)} reference sequences with Evo 2...')
    ref_scores = model.score_sequences(ref_seqs)

    print(
        f'Scoring likelihoods of {len(var_seqs)} variant sequences with Evo 2...')
    var_scores = model.score_sequences(var_seqs)

    # Subtract score of corresponding reference sequences from scores of variant sequences
    delta_scores = np.array(var_scores) - np.array(ref_scores)[ref_seq_indexes]

    # Add delta scores to dataframe
    brca1_subset[f'evo2_delta_score'] = delta_scores

    y_true = (brca1_subset['class'] == 'LOF')
    auroc = roc_auc_score(y_true, -brca1_subset['evo2_delta_score'])

    # --- Calculate threshold START
    y_true = (brca1_subset["class"] == "LOF")

    fpr, tpr, thresholds = roc_curve(y_true, -brca1_subset["evo2_delta_score"])

    optimal_idx = (tpr - fpr).argmax()

    optimal_threshold = -thresholds[optimal_idx]

    lof_scores = brca1_subset.loc[brca1_subset["class"]
                                  == "LOF", "evo2_delta_score"]
    func_scores = brca1_subset.loc[brca1_subset["class"]
                                   == "FUNC/INT", "evo2_delta_score"]

    lof_std = lof_scores.std()
    func_std = func_scores.std()

    confidence_params = {
        "threshold": optimal_threshold,
        "lof_std": lof_std,
        "func_std": func_std
    }

    print("Confidence params:", confidence_params)

    # --- Calculate threshold END

    plt.figure(figsize=(4, 2))

    # Plot stripplot of distributions
    p = sns.stripplot(
        data=brca1_subset,
        x='evo2_delta_score',
        y='class',
        hue='class',
        order=['FUNC/INT', 'LOF'],
        palette=['#777777', 'C3'],
        size=2,
        jitter=0.3,
    )

    # Mark medians from each distribution
    sns.boxplot(showmeans=True,
                meanline=True,
                meanprops={'visible': False},
                medianprops={'color': 'k', 'ls': '-', 'lw': 2},
                whiskerprops={'visible': False},
                zorder=10,
                x="evo2_delta_score",
                y="class",
                data=brca1_subset,
                showfliers=False,
                showbox=False,
                showcaps=False,
                ax=p)
    plt.xlabel('Delta likelihood score, Evo 2')
    plt.ylabel('BRCA1 SNV class')
    plt.tight_layout()

    buffer = BytesIO()
    plt.savefig(buffer, format="png")
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {'variants': brca1_subset.to_dict(orient="records"), "plot": plot_data, "auroc": auroc}


@app.function()
def brca1_example():
    import base64
    from io import BytesIO
    import matplotlib.pyplot as plt
    import matplotlib.image as mpimg

    print("Running BRCA1 variant analysis with Evo2...")

    # Run inference
    result = run_brca1_analysis.remote()

    if "plot" in result:
        plot_data = base64.b64decode(result["plot"])
        with open("brca1_analysis_plot.png", "wb") as f:
            f.write(plot_data)

        img = mpimg.imread(BytesIO(plot_data))
        plt.figure(figsize=(10, 5))
        plt.imshow(img)
        plt.axis("off")
        plt.show()


def get_genome_sequence(position, genome: str, chromosome: str, window_size=8192):
    import requests

    half_window = window_size // 2
    start = max(0, position - 1 - half_window)
    end = position - 1 + half_window + 1

    print(
        f"Fetching {window_size}bp window around position {position} from UCSC API..")
    print(f"Coordinates: {chromosome}:{start}-{end} ({genome})")

    api_url = f"https://api.genome.ucsc.edu/getData/sequence?genome={genome};chrom={chromosome};start={start};end={end}"
    response = requests.get(api_url)

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch genome sequence from UCSC API: {response.status_code}")

    genome_data = response.json()

    if "dna" not in genome_data:
        error = genome_data.get("error", "Unknown error")
        raise Exception(f"UCSC API errpr: {error}")

    sequence = genome_data.get("dna", "").upper()
    expected_length = end - start
    if len(sequence) != expected_length:
        print(
            f"Warning: received sequence length ({len(sequence)}) differs from expected ({expected_length})")

    print(
        f"Loaded reference genome sequence window (length: {len(sequence)} bases)")

    return sequence, start


def analyze_variant(relative_pos_in_window, reference, alternative, window_seq, model):
    var_seq = window_seq[:relative_pos_in_window] + \
        alternative + window_seq[relative_pos_in_window+1:]

    ref_score = model.score_sequences([window_seq])[0]
    var_score = model.score_sequences([var_seq])[0]

    delta_score = var_score - ref_score

    threshold = -0.0009178519
    lof_std = 0.0015140239
    func_std = 0.0009016589

    if delta_score < threshold:
        prediction = "Likely pathogenic"
        confidence = min(1.0, abs(delta_score - threshold) / lof_std)
    else:
        prediction = "Likely benign"
        confidence = min(1.0, abs(delta_score - threshold) / func_std)

    return {
        "reference": reference,
        "alternative": alternative,
        "delta_score": float(delta_score),
        "prediction": prediction,
        "classification_confidence": float(confidence),
        "model_backend": "evo2",
    }


@app.cls(gpu="H100", volumes={mount_path: volume}, max_containers=3, retries=2, scaledown_window=120)
class Evo2Model:
    @modal.enter()
    def load_evo2_model(self):
        from evo2 import Evo2
        print("Loading evo2 model...")
        # Use the 8k-base checkpoint to avoid FP8-only input projections
        # while preserving true Evo2 inference for the 8192 window workflow.
        self.model = Evo2('evo2_7b_base')
        print("Evo2 model loaded")

    # @modal.method()
    @modal.fastapi_endpoint(method="POST")
    def analyze_single_variant(self, request: VariantRequest):
        variant_position = request.variant_position
        alternative = request.alternative
        genome = request.genome
        chromosome = request.chromosome

        print("Genome:", genome)
        print("Chromosome:", chromosome)
        print("Variant position:", variant_position)
        print("Variant alternative:", alternative)

        WINDOW_SIZE = 8192

        window_seq, seq_start = get_genome_sequence(
            position=variant_position,
            genome=genome,
            chromosome=chromosome,
            window_size=WINDOW_SIZE
        )

        print(f"Fetched genome seauence window, first 100: {window_seq[:100]}")

        relative_pos = variant_position - 1 - seq_start
        print(f"Relative position within window: {relative_pos}")

        if relative_pos < 0 or relative_pos >= len(window_seq):
            raise ValueError(
                f"Variant position {variant_position} is outside the fetched window (start={seq_start+1}, end={seq_start+len(window_seq)})")

        reference = window_seq[relative_pos]
        print("Reference is: " + reference)

        # Analyze the variant
        result = analyze_variant(
            relative_pos_in_window=relative_pos,
            reference=reference,
            alternative=alternative,
            window_seq=window_seq,
            model=self.model
        )

        result["position"] = variant_position

        return result


@app.cls(secrets=[modal.Secret.from_name("twin-openai")])
class TwinService:
    @modal.fastapi_endpoint(method="POST")
    def profile(self, request: TwinProfileRequest):
        profile = request.model_dump()
        profile["mode"] = "genome-enhanced" if request.has_dna_data else "lifestyle-only"
        return profile

    @modal.fastapi_endpoint(method="POST")
    def simulate(self, request: SimulateTwinRequest):
        return _run_twin_simulation(
            request.profile,
            request.intervention_focus,
            request.intervention_delta,
        )

    @modal.fastapi_endpoint(method="POST")
    def chat(self, request: TwinChatRequest):
        return _call_chat_llm(request)


@app.local_entrypoint()
def main():
    # Example of how you'd call the deployed Modal Function from your client
    import requests
    import json    # brca1_example.remote()

    evo2Model = Evo2Model()

    url = evo2Model.analyze_single_variant.web_url

    payload = {
        "variant_position": 43119628,
        "alternative": "G",
        "genome": "hg38",
        "chromosome": "chr17"
    }

    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    result = response.json()
    print(result)
