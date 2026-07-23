# Initial Capacity Math

This is a conservative starting configuration, not a performance guarantee.
Validate it with representative prompts after deployment.

## GPU budget

The Tesla T4 has 16 GiB of VRAM (15,360 MiB, per `nvidia-smi`). With:

```text
--gpu-memory-utilization 0.85
```

vLLM may use approximately:

```text
15,360 MiB × 0.85 ≈ 13,056 MiB (12.75 GiB)
```

Observed total GPU memory usage for the running vLLM pod is 11,443 MiB
(`nvidia-smi`, captured evidence), which fits inside the 13,056 MiB budget
with roughly 1,613 MiB of budgeted headroom unused, plus a further 2,304 MiB
left completely outside the 0.85 fraction as driver/OS margin.

The model uses AWQ (4-bit) quantization, which makes a 7B model practical on
a T4. The AWQ checkpoint weights are estimated at roughly 4-4.5 GiB, leaving
the remainder of the 11,443 MiB observed usage for vLLM's KV-cache block
pool, CUDA graphs, and activation buffers; exact weight and runtime
allocations should still be measured from the running pod rather than
assumed.

The deployment requests and limits exactly one `nvidia.com/gpu`, preventing
another Kubernetes GPU workload from being scheduled onto the same device via
the device plugin.

## Context and sequence budget

The serving bounds, matching `kubernetes/assistant/deployment.yaml`, are:

```text
maximum context per sequence = 4,096 tokens
maximum active sequences     = 8
theoretical token slots       = 8 × 4,096 = 32,768 tokens
```

This is a worst-case upper bound for simultaneously active sequence tokens,
not the expected token count of every batch. vLLM allocates its KV cache from
the GPU memory remaining after model and runtime allocations. If the engine
cannot initialize or latency is unstable, reduce `max-model-len` or
`max-num-seqs` before increasing GPU utilization.

## KV-cache budget (worked calculation)

Qwen2.5-7B-Instruct uses grouped-query attention with the following published
architecture parameters (`config.json`): 28 transformer layers, 4 KV heads,
and a head dimension of 128 (`hidden_size` 3,584 ÷ `num_attention_heads` 28).
Quantizing the linear weights to AWQ does not change these attention
dimensions or the KV-cache dtype, which is set independently by `--dtype half`
(FP16, 2 bytes/element).

KV-cache bytes per token:

```text
2 (K and V) × 28 layers × 4 KV heads × 128 head_dim × 2 bytes
  = 57,344 bytes/token (56 KiB/token)
```

KV-cache per fully-filled sequence (`max-model-len` = 4,096):

```text
57,344 bytes × 4,096 tokens = 234,881,024 bytes ≈ 224 MiB/sequence
```

Worst-case KV-cache demand at the configured concurrency target
(`max-num-seqs` = 8, all sequences simultaneously at the full 4,096-token
context):

```text
224 MiB × 8 sequences ≈ 1,792 MiB (1.75 GiB)
```

This worst-case 1.75 GiB fits comfortably inside the 13,056 MiB (12.75 GiB)
`gpu-memory-utilization` budget, and inside the roughly 6.9-7 GiB estimated to
remain after AWQ model weights within the 11,443 MiB actually observed in
use. In practice, average prompt/response lengths during the FR1 SLA test
(300 tokens) are far below the 4,096-token ceiling, so real KV-cache
consumption during the five-concurrent-session test was well under this
worst case — consistent with the passing throughput and TTFT results.

## System memory budget

The node has about 15.4 GiB of system RAM. The pod is configured with:

```text
memory request = 10 GiB
memory limit   = 14 GiB
/dev/shm limit = 2 GiB
```

The memory-backed `/dev/shm` volume counts toward the pod's memory usage; it is
not an additional 2 GiB beyond the 14 GiB container limit. The 14 GiB limit
leaves only about 1.4 GiB for k3s, the operating system, and other pods if fully
consumed, so actual node memory pressure must be observed. If this is a shared
node, lower the vLLM limit or reserve additional memory for system services.

## CPU budget

The GPU node exposes four allocatable CPU cores. vLLM is configured with:

```text
CPU request = 2 cores
CPU limit   = 4 cores
```

The request leaves schedulable capacity for cluster services while allowing
vLLM to burst. A CPU limit of four does not reserve all four cores; other pods
can still contend for CPU. Future services should receive explicit requests and
limits, and vLLM may need to be capped below four cores once they are added.

## Persistent cache

The Hugging Face cache requests 30 GiB of persistent storage. This is intended
to retain model artifacts across pod recreation and avoid repeated downloads.
The value includes room for the selected model plus cache metadata and partial
downloads, but available node disk and StorageClass expansion behavior should
be verified before deployment.

## Expected concurrency

`--max-num-seqs 8` allows at most eight active sequences in the scheduler. The
FR1 SLA test validated five concurrent sessions (below this ceiling), all
passing the throughput and TTFT SLAs. Requests beyond the eight-sequence bound
may queue; this is expected and should be measured with latency percentiles
rather than treated as an automatic failure.

## Empirical before/after evidence

The FR1 SLA test (`scripts/fr1_sla_test.py`) was run twice against the same
five-concurrent-session scenario at two different `--max-num-seqs` values,
giving direct experimental confirmation of the queuing behavior implied by
the theoretical budget above:

- **`max-num-seqs = 4`** (`docs/evidence/fr1/before-max-seqs-4-queuing.png`):
  four of five concurrent sessions completed with the expected ~1.3 s TTFT,
  but one session queued behind the four-slot limit and measured an 11.14 s
  TTFT — direct evidence of scheduler queuing once concurrent requests exceed
  the configured slot count.
- **`max-num-seqs = 8`** (`docs/evidence/fr1/after-max-seqs-8-uniform.png`):
  after raising the limit, the identical five-session test produced uniform
  TTFTs of 0.93-1.30 s across all sessions, with no queuing outlier.

This matches the KV-cache budget above: raising `max-num-seqs` from 4 to 8
increases the worst-case KV-cache reservation from roughly 896 MiB (0.875
GiB) to 1,792 MiB (1.75 GiB) — still well inside the available
`gpu-memory-utilization` budget — while removing the single-slot bottleneck
that caused the queuing delay at the lower setting.
