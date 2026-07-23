# Initial Capacity Math

This is a conservative starting configuration, not a performance guarantee.
Validate it with representative prompts after deployment.

## GPU budget

The Tesla T4 has 16 GiB of VRAM. With:

```text
--gpu-memory-utilization 0.85
```

vLLM may use approximately:

```text
16 GiB × 0.85 = 13.6 GiB
```

The remaining approximately 2.4 GiB provides headroom for CUDA context,
non-vLLM GPU consumers, and variance in runtime allocation. The model uses AWQ
quantization, which makes a 7B model practical on a T4, but actual model weight
and runtime allocations must be measured from the running pod.

The deployment requests and limits exactly one `nvidia.com/gpu`, preventing
another Kubernetes GPU workload from being scheduled onto the same device via
the device plugin.

## Context and sequence budget

The serving bounds are:

```text
maximum context per sequence = 4,096 tokens
maximum active sequences     = 4
theoretical token slots       = 4 × 4,096 = 16,384 tokens
```

This is a worst-case upper bound for simultaneously active sequence tokens, not
the expected token count of every batch. vLLM allocates its KV cache from the
GPU memory remaining after model and runtime allocations. If the engine cannot
initialize or latency is unstable, reduce `max-model-len` or `max-num-seqs`
before increasing GPU utilization.

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

`--max-num-seqs 4` allows at most four active sequences in the scheduler. The
included concurrency test therefore sends four parallel requests by default.
Requests beyond this bound may queue; this is expected and should be measured
with latency percentiles rather than treated as an automatic failure.

## Empirical before/after evidence

The screenshots confirm the calculated capacity behavior. Before, with
`max-num-seqs=4`, one of five concurrent requests was queued and had a TTFT of
approximately 11.14 seconds. After increasing `max-num-seqs` to 8, all five
concurrent sessions completed with TTFTs between 0.93 and 1.30 seconds.

Although increasing `max-num-seqs` increased the theoretical KV-cache budget,
it removed the queuing bottleneck, matching the capacity calculations above.
