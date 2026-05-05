"""Standalone script to generate the seed SQLite file.

Run once: python -m dev_server.generate
Produces: dev_server/seed.db
"""

import os
import random
import sqlite3
import time


def _create_tables(con: sqlite3.Connection) -> None:
    con.executescript("""
        CREATE TABLE IF NOT EXISTS params (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            key TEXT NOT NULL,
            float_val REAL,
            int_val INTEGER,
            string_val TEXT,
            bool_val INTEGER,
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;

        CREATE TABLE IF NOT EXISTS metrics (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            key TEXT NOT NULL,
            value REAL NOT NULL,
            step INTEGER,
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;

        CREATE TABLE IF NOT EXISTS results (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;

        CREATE TABLE IF NOT EXISTS artifacts (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            key TEXT NOT NULL,
            filename TEXT NOT NULL DEFAULT '',
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;

        CREATE TABLE IF NOT EXISTS sweep_meta (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            git_hash TEXT,
            config TEXT,
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;

        CREATE TABLE IF NOT EXISTS trial_end (
            project TEXT NOT NULL,
            study_name TEXT NOT NULL,
            trial_id INTEGER NOT NULL,
            timestamp_ns INTEGER NOT NULL,
            seq INTEGER NOT NULL,
            UNIQUE (project, study_name, trial_id, seq)
        ) STRICT;
    """)


def main() -> None:
    rng = random.Random(42)
    base_ts = 1700000000_000000000

    out_path = "dev_server/seed.db"

    if os.path.exists(out_path):
        os.remove(out_path)

    con = sqlite3.connect(out_path)
    _create_tables(con)

    sweeps = [
        ("image-classification", "resnet50", 0, 25, 3, 50),
        ("image-classification", "resnet50", 86400, 20, 0, 50),
        ("image-classification", "vgg16", 172800, 30, 5, 50),
        ("language-model", "transformer-base", 0, 22, 2, 50),
        ("language-model", "transformer-large", 86400, 28, 4, 50),
        ("language-model", "lstm-baseline", 259200, 15, 0, 50),
        ("embedding-search", "hnsw-sweep", 0, 500, 40, 8),
        ("embedding-search", "ivf-sweep", 86400, 200, 10, 5),
        ("embedding-search", "flat-sweep", 172800, 1000, 0, 3),
        # New sweeps for expanded chart testing
        ("multi-objective", "pareto-test", 345600, 30, 5, 30),
        ("image-classification", "lr-wd-interaction", 432000, 40, 0, 30),
        ("image-classification", "sparse-test", 518400, 5, 0, 10),
        ("image-classification", "optimizer-sweep", 604800, 30, 0, 30),
        ("language-model", "negative-loss", 691200, 20, 0, 40),
        ("language-model", "paused-run", 777600, 15, 0, 50),
    ]

    param_defs = {
        "image-classification": [
            ("learning_rate", "float", 1e-5, 1e-2),
            ("batch_size", "int", 16, 128),
            ("optimizer", "string", ["adam", "sgd", "adamw"], None),
            ("use_augmentation", "bool", None, None),
            ("weight_decay", "float", 0.0, 0.1),
        ],
        "language-model": [
            ("learning_rate", "float", 1e-5, 5e-4),
            ("batch_size", "int", 8, 64),
            ("optimizer", "string", ["adam", "adamw"], None),
            ("n_layers", "int", 2, 12),
            ("hidden_dim", "int", 128, 512),
            ("dropout", "float", 0.0, 0.5),
        ],
        "embedding-search": [
            ("ef_construction", "int", 50, 500),
            ("m", "int", 8, 64),
            ("ef_search", "int", 10, 200),
            ("metric", "string", ["cosine", "l2", "ip"], None),
            ("n_lists", "int", 10, 256),
            ("n_probes", "int", 1, 50),
        ],
        "multi-objective": [
            ("learning_rate", "float", 1e-5, 1e-2),
            ("batch_size", "int", 16, 256),
            ("model_size", "string", ["small", "medium", "large", "xlarge"], None),
        ],
    }

    print(f"Generating {out_path}...")
    t0 = time.time()

    # Accumulate all rows as Python lists, bulk-insert at end
    all_params: list[tuple] = []
    all_metrics: list[tuple] = []
    all_results: list[tuple] = []
    all_artifacts: list[tuple] = []
    all_sweep_meta: list[tuple] = []
    all_trial_end: list[tuple] = []

    # Per-config overrides for param definitions
    config_param_overrides: dict[str, list[tuple]] = {
        "optimizer-sweep": [
            ("learning_rate", "float", 1e-5, 1e-2),
            ("optimizer", "string", ["adam", "sgd", "adamw", "rmsprop", "lion", "adagrad"], None),
        ],
        "sparse-test": [
            ("learning_rate", "float", 1e-5, 1e-2),
            ("batch_size", "int", 16, 128),
            ("dropout", "float", 0.0, 0.5),
        ],
        "lr-wd-interaction": [
            ("learning_rate", "float", 1e-5, 1e-2),
            ("weight_decay", "float", 0.0, 0.1),
            ("dropout", "float", 0.0, 0.5),
        ],
        "negative-loss": [
            ("learning_rate", "float", 1e-5, 5e-4),
            ("n_layers", "int", 2, 12),
            ("hidden_dim", "int", 128, 512),
        ],
        "paused-run": [
            ("learning_rate", "float", 1e-5, 5e-4),
            ("batch_size", "int", 8, 64),
        ],
    }

    for project, config_stem, ts_offset, num_trials, num_active, num_steps in sweeps:
        study_name = f"{project}_{config_stem}_{base_ts + ts_offset * 1_000_000_000}"
        sweep_ts = base_ts + ts_offset * 1_000_000_000
        pdefs = config_param_overrides.get(config_stem, param_defs[project])

        for trial_id in range(num_trials):
            trial_ts = sweep_ts + trial_id * 60_000_000_000
            seq = 0

            if trial_id == 0:
                git_hash = f"a1b2c3d{rng.randint(0, 9)}"
                config = f"configs/{config_stem}.yaml"
                all_sweep_meta.append((project, study_name, trial_id, trial_ts, seq, git_hash, config))
                seq += 1

            # params
            param_values: dict[str, float | int | str | bool] = {}
            for pkey, ptype, plo, phi in pdefs:
                if ptype == "float":
                    val = rng.uniform(plo, phi)
                    param_values[pkey] = val
                    all_params.append((project, study_name, trial_id, trial_ts, seq, pkey, val, None, None, None))
                elif ptype == "int":
                    val = rng.randint(plo, phi)
                    param_values[pkey] = val
                    all_params.append((project, study_name, trial_id, trial_ts, seq, pkey, None, val, None, None))
                elif ptype == "string":
                    val = rng.choice(plo)
                    param_values[pkey] = val
                    all_params.append((project, study_name, trial_id, trial_ts, seq, pkey, None, None, val, None))
                elif ptype == "bool":
                    val = rng.choice([True, False])
                    param_values[pkey] = val
                    all_params.append((project, study_name, trial_id, trial_ts, seq, pkey, None, None, None, int(val)))
                seq += 1

            # metrics/results/artifacts
            # Active trials get fewer steps (simulating in-progress)
            is_active = trial_id >= num_trials - num_active
            steps_to_gen = num_steps
            if is_active:
                steps_to_gen = rng.randint(max(1, num_steps // 4), max(2, num_steps - 1))

            if project == "embedding-search":
                _gen_embedding(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                               all_metrics, all_results, all_artifacts)
            elif project == "multi-objective":
                _gen_multi_objective(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                                     all_metrics, all_results, all_artifacts)
            elif config_stem == "lr-wd-interaction":
                _gen_correlated(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                                all_metrics, all_results, all_artifacts)
            elif config_stem == "negative-loss":
                _gen_negative(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                              all_metrics, all_results, all_artifacts)
            elif config_stem == "paused-run":
                _gen_paused(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                            all_metrics, all_results, all_artifacts)
            else:
                _gen_ml(rng, project, study_name, trial_id, trial_ts, seq, steps_to_gen, param_values,
                        all_metrics, all_results, all_artifacts)

            if trial_id < num_trials - num_active:
                all_trial_end.append((project, study_name, trial_id, trial_ts + num_steps * 1_000_000_000, 0))

        print(f"  {project}/{config_stem}: {num_trials} trials ({num_active} active)")

    t1 = time.time()
    print(f"\nGenerated data in {t1-t0:.1f}s")
    print(f"  params: {len(all_params)}")
    print(f"  metrics: {len(all_metrics)}")
    print(f"  results: {len(all_results)}")
    print(f"  artifacts: {len(all_artifacts)}")
    print(f"  sweep_meta: {len(all_sweep_meta)}")
    print(f"  trial_end: {len(all_trial_end)}")

    # Bulk insert via executemany in a single transaction
    print("Writing to SQLite...")
    t2 = time.time()

    con.execute("BEGIN")
    con.executemany(
        "INSERT OR IGNORE INTO params VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        all_params,
    )
    con.executemany(
        "INSERT OR IGNORE INTO metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        all_metrics,
    )
    con.executemany(
        "INSERT OR IGNORE INTO results VALUES (?, ?, ?, ?, ?, ?, ?)",
        all_results,
    )
    con.executemany(
        "INSERT OR IGNORE INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?)",
        all_artifacts,
    )
    con.executemany(
        "INSERT OR IGNORE INTO sweep_meta VALUES (?, ?, ?, ?, ?, ?, ?)",
        all_sweep_meta,
    )
    con.executemany(
        "INSERT OR IGNORE INTO trial_end VALUES (?, ?, ?, ?, ?)",
        all_trial_end,
    )
    con.execute("COMMIT")

    t3 = time.time()
    print(f"Wrote in {t3-t2:.1f}s")

    # Summary
    for table in ["params", "metrics", "results", "artifacts", "sweep_meta", "trial_end"]:
        count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    con.close()
    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"\nFile size: {size_mb:.1f} MB")


def _gen_ml(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    lr = param_values["learning_rate"]
    base_loss = 2.0 + rng.uniform(-0.3, 0.3)
    loss_floor = 0.05 + lr * 5 + rng.uniform(0, 0.1)
    base_acc = 0.1
    acc_ceiling = min(0.95, 0.7 + rng.uniform(0, 0.25) - lr * 20)

    seq = seq_start
    for step in range(num_steps):
        progress = step / num_steps
        loss = base_loss * (1 - progress) ** 2 + loss_floor + rng.uniform(-0.05, 0.05)
        acc = base_acc + (acc_ceiling - base_acc) * (1 - (1 - progress) ** 2) + rng.uniform(-0.02, 0.02)

        metric_ts = trial_ts + step * 1_000_000_000
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "training_loss", max(0.01, loss), step))
        seq += 1
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "accuracy", min(1.0, max(0.0, acc)), step))
        seq += 1

    final_loss = max(0.01, base_loss * 0.01 + loss_floor + rng.uniform(-0.02, 0.02))
    final_acc = min(1.0, max(0.0, acc_ceiling + rng.uniform(-0.03, 0.03)))
    best_acc = min(1.0, max(0.0, acc_ceiling + rng.uniform(0, 0.02)))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_loss", f"{final_loss:.6f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_accuracy", f"{final_acc:.6f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "best_accuracy", f"{best_acc:.6f}"))
    seq += 1

    for key, filename in [
        ("confusion_matrix", "confusion_matrix.png"),
        ("training_log", "training_log.csv"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _gen_embedding(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    m = param_values.get("m", 16)
    base_recall = 0.4 + m / 200 + rng.uniform(-0.05, 0.05)
    recall_ceiling = min(0.99, base_recall + 0.3 + rng.uniform(0, 0.1))
    base_latency = 0.5 + rng.uniform(0, 0.5)
    index_size_gb = 0.1 + m * 0.02 + rng.uniform(0, 0.1)

    seq = seq_start
    for step in range(num_steps):
        progress = step / max(num_steps, 1)
        recall = base_recall + (recall_ceiling - base_recall) * progress + rng.uniform(-0.02, 0.02)
        latency = base_latency * (1 - 0.3 * progress) + rng.uniform(-0.05, 0.05)

        metric_ts = trial_ts + step * 1_000_000_000
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "recall@10", min(1.0, max(0.0, recall)), step))
        seq += 1
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "latency_ms", max(0.01, latency), step))
        seq += 1

    final_recall = min(1.0, max(0.0, recall_ceiling + rng.uniform(-0.02, 0.02)))
    final_latency = max(0.01, base_latency * 0.7 + rng.uniform(-0.05, 0.05))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_recall", f"{final_recall:.6f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_latency_ms", f"{final_latency:.6f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "index_size_gb", f"{index_size_gb:.4f}"))
    seq += 1

    for key, filename in [
        ("index_stats", "index_stats.json"),
        ("recall_curve", "recall_curve.csv"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _gen_multi_objective(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    """Multi-objective: accuracy (maximize) vs inference_latency_ms (minimize).

    Larger models get better accuracy but worse latency.
    Learning rate has a sweet spot — too high hurts both.
    Produces a clear Pareto front with dominated points.
    """
    lr = param_values["learning_rate"]
    model_size = param_values["model_size"]
    size_factor = {"small": 0.5, "medium": 0.75, "large": 0.9, "xlarge": 0.95}.get(str(model_size), 0.75)
    batch = param_values["batch_size"]

    # Accuracy: larger model helps, LR sweet spot around 1e-3
    lr_penalty = abs(lr - 1e-3) * 50
    acc_ceiling = min(0.98, size_factor + 0.1 - lr_penalty + rng.uniform(-0.03, 0.03))
    acc_ceiling = max(0.3, acc_ceiling)

    # Latency: larger model hurts, smaller batch hurts
    base_latency = 5.0 + size_factor * 50 + (256 - batch) * 0.05 + rng.uniform(-2, 2)

    seq = seq_start
    for step in range(num_steps):
        progress = step / num_steps
        acc = 0.1 + (acc_ceiling - 0.1) * (1 - (1 - progress) ** 2) + rng.uniform(-0.01, 0.01)
        latency = base_latency * (1 - 0.1 * progress) + rng.uniform(-0.5, 0.5)

        metric_ts = trial_ts + step * 1_000_000_000
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "accuracy", min(1.0, max(0.0, acc)), step))
        seq += 1
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "inference_latency_ms", max(0.1, latency), step))
        seq += 1

    final_acc = min(1.0, max(0.0, acc_ceiling + rng.uniform(-0.02, 0.02)))
    final_latency = max(0.1, base_latency * 0.9 + rng.uniform(-1, 1))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_accuracy", f"{final_acc:.6f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_inference_latency_ms", f"{final_latency:.2f}"))
    seq += 1

    for key, filename in [
        ("model_architecture", "architecture.json"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _gen_correlated(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    """Correlated params: LR × weight_decay interaction.

    High LR + high WD → very bad (over-regularized, can't converge).
    Low LR + low WD → bad (under-regularized, noisy).
    Sweet spot: moderate LR with moderate WD.
    The interaction term creates visible structure in heatmaps/SPLOMs.
    """
    lr = param_values["learning_rate"]
    wd = param_values["weight_decay"]
    dropout = param_values["dropout"]

    # Log-scale LR for the interaction computation
    log_lr = _log10(lr)
    # Interaction: high LR + high WD is bad
    interaction = (log_lr + 2) * wd * 5  # positive when both are high
    # Low LR + low WD is also suboptimal
    under_regularized = max(0, (-log_lr - 3) * 2) * max(0, 0.05 - wd) * 3
    # Dropout has a mild beneficial effect
    dropout_effect = dropout * 0.1

    base_loss = 0.3 + interaction + under_regularized - dropout_effect + rng.uniform(-0.1, 0.1)
    loss_floor = 0.05 + abs(interaction) * 0.3 + rng.uniform(0, 0.05)

    seq = seq_start
    for step in range(num_steps):
        progress = step / num_steps
        loss = base_loss * (1 - progress) ** 2 + loss_floor + rng.uniform(-0.03, 0.03)

        metric_ts = trial_ts + step * 1_000_000_000
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "training_loss", max(0.01, loss), step))
        seq += 1

    final_loss = max(0.01, loss_floor + rng.uniform(-0.02, 0.02))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_loss", f"{final_loss:.6f}"))
    seq += 1

    for key, filename in [
        ("training_log", "training_log.csv"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _gen_negative(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    """Negative-valued results (log-likelihood).

    Log-likelihood ranges from roughly -500 to -50.
    Also produces a positive perplexity result.
    """
    lr = param_values["learning_rate"]
    n_layers = param_values["n_layers"]
    hidden_dim = param_values["hidden_dim"]

    # Better model → less negative log-likelihood (closer to 0)
    model_capacity = n_layers * hidden_dim / 1000
    base_ll = -400 + model_capacity * 200 + rng.uniform(-20, 20)
    ll_ceiling = min(-30, base_ll + 150 + rng.uniform(0, 50))
    # LR has sweet spot
    lr_effect = -abs(lr - 1e-4) * 100000
    ll_ceiling += lr_effect

    seq = seq_start
    for step in range(num_steps):
        progress = step / num_steps
        ll = base_ll + (ll_ceiling - base_ll) * (1 - (1 - progress) ** 2) + rng.uniform(-5, 5)
        ppl = max(1.0, 2.718281828 ** (-ll / 100))  # rough proxy

        metric_ts = trial_ts + step * 1_000_000_000
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "log_likelihood", ll, step))
        seq += 1
        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "perplexity", ppl, step))
        seq += 1

    final_ll = ll_ceiling + rng.uniform(-10, 10)
    final_ppl = max(1.0, 2.718281828 ** (-final_ll / 100))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "log_likelihood", f"{final_ll:.2f}"))
    seq += 1
    all_results.append((project, study_name, trial_id, trial_ts, seq, "perplexity", f"{final_ppl:.2f}"))
    seq += 1

    for key, filename in [
        ("training_log", "training_log.csv"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _gen_paused(
    rng: random.Random,
    project: str,
    study_name: str,
    trial_id: int,
    trial_ts: int,
    seq_start: int,
    num_steps: int,
    param_values: dict[str, float | int | str | bool],
    all_metrics: list[tuple],
    all_results: list[tuple],
    all_artifacts: list[tuple],
) -> None:
    """Irregular timestamps with a pause/resume gap.

    First half: 1-second intervals.
    Then a 3600-second (1-hour) gap.
    Second half: 1-second intervals again.
    """
    lr = param_values["learning_rate"]
    base_loss = 2.5 + rng.uniform(-0.3, 0.3)
    loss_floor = 0.1 + lr * 100 + rng.uniform(0, 0.1)

    seq = seq_start
    half = num_steps // 2
    for step in range(num_steps):
        progress = step / num_steps
        loss = base_loss * (1 - progress) ** 2 + loss_floor + rng.uniform(-0.03, 0.03)

        # Normal 1-second spacing, with a 3600-second gap at the midpoint
        if step < half:
            metric_ts = trial_ts + step * 1_000_000_000
        else:
            # 3600s gap after the first half
            metric_ts = trial_ts + (step + 3600) * 1_000_000_000

        all_metrics.append((project, study_name, trial_id, metric_ts, seq, "training_loss", max(0.01, loss), step))
        seq += 1

    final_loss = max(0.01, loss_floor + rng.uniform(-0.02, 0.02))

    all_results.append((project, study_name, trial_id, trial_ts, seq, "final_loss", f"{final_loss:.6f}"))
    seq += 1

    for key, filename in [
        ("training_log", "training_log.csv"),
        ("config_snapshot", "config.json"),
    ]:
        all_artifacts.append((project, study_name, trial_id, trial_ts, seq, key, filename))
        seq += 1


def _log10(x: float) -> float:
    import math
    return math.log10(max(x, 1e-20))


if __name__ == "__main__":
    main()
