# Worker Performance Baseline

> Last Updated: 2026-01-23
> Reference: PRD §4.5, PRD P-29

## Overview

This document defines the performance baselines for the TCRN TMS Worker service, which processes background jobs including report generation, data import/export, and scheduled maintenance tasks.

## Runtime Environment

| Attribute | Value |
|-----------|-------|
| Runtime | Node.js 20 LTS |
| Worker Framework | BullMQ |
| Concurrency | 4 workers per queue |
| Memory Limit | 1 GB (container) |
| CPU Limit | 500m (0.5 cores) |

## Memory Baselines

### Idle State

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Heap Used | < 100 MB | > 150 MB | > 200 MB |
| RSS | < 200 MB | > 300 MB | > 400 MB |

### Report Generation

| Row Count | Expected Memory | Max Duration | Notes |
|-----------|-----------------|--------------|-------|
| 1,000 | < 50 MB delta | < 2s | Fast completion |
| 10,000 | < 100 MB delta | < 10s | Normal load |
| 50,000 | < 300 MB delta | < 60s | PRD limit |

### Import Processing

| Row Count | Expected Memory | Max Duration | Notes |
|-----------|-----------------|--------------|-------|
| 1,000 | < 30 MB delta | < 5s | Fast completion |
| 10,000 | < 100 MB delta | < 30s | Normal load |
| 50,000 | < 200 MB delta | < 120s | Large import |

## Throughput Baselines

| Job Type | Target Throughput | Notes |
|----------|-------------------|-------|
| Simple jobs (permission refresh) | > 100 jobs/sec | High frequency |
| Complex jobs (report generation) | > 5 jobs/min | Resource intensive |
| Batch operations | > 10 batches/min | Variable size |

## Queue Configuration

```typescript
// Recommended queue settings per PRD
const queueSettings = {
  'report-queue': {
    concurrency: 2,           // Limit concurrent reports
    limiter: {
      max: 10,                // Max 10 jobs
      duration: 60000,        // Per minute
    },
  },
  'import-queue': {
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000,
    },
  },
  'permission-queue': {
    concurrency: 10,          // High concurrency for simple jobs
  },
  'log-queue': {
    concurrency: 5,
  },
};
```

## Monitoring Metrics

### Prometheus Metrics

```prometheus
# Job processing duration
bullmq_job_duration_seconds{queue, status}

# Jobs waiting in queue
bullmq_queue_waiting{queue}

# Job completion rate
bullmq_jobs_completed_total{queue}

# Job failure rate  
bullmq_jobs_failed_total{queue}

# Memory usage
process_resident_memory_bytes
nodejs_heap_size_used_bytes
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Queue backlog | > 50 jobs | > 100 jobs |
| Job failure rate | > 5% | > 10% |
| Memory usage | > 70% | > 85% |
| Report P95 duration | > 2 min | > 5 min |

## Performance Test Execution

### Running Baseline Tests

```bash
# Run performance tests with GC exposed
node --expose-gc ./node_modules/.bin/vitest run \
  --project worker \
  --testNamePattern "Performance Baseline"

# Run with memory profiling
NODE_OPTIONS="--max-old-space-size=512 --expose-gc" \
  pnpm vitest run apps/worker/src/__tests__/performance-baseline.spec.ts
```

### Expected Output

```
Worker Performance Baseline
  Memory Baseline
    ✓ idle worker memory should be under baseline threshold
    ✓ should log V8 heap statistics
  Report Generation Performance
    ✓ should handle 1,000 rows within memory threshold
    ✓ should handle 10,000 rows within memory threshold
    ✓ should handle 50,000 rows (PRD limit) within memory threshold
  Import Processing Performance
    ✓ should handle 1,000 rows within memory threshold
    ✓ should handle 10,000 rows within memory threshold
  Throughput Benchmarks
    ✓ should achieve minimum simple job throughput
  Memory Cleanup
    ✓ should release memory after large operation
```

## Optimization Recommendations

### Memory Optimization

1. **Streaming for large datasets**: Use streams instead of loading entire datasets
2. **Chunked processing**: Process data in batches of 1,000-5,000 rows
3. **Explicit cleanup**: Call `gc()` after large operations (when available)
4. **Buffer reuse**: Reuse buffers for Excel/CSV generation

### Throughput Optimization

1. **Queue prioritization**: High-priority jobs first
2. **Backpressure handling**: Pause queue when system overloaded
3. **Connection pooling**: Reuse database connections
4. **Batch database operations**: Use bulk inserts/updates

### CPU Optimization

1. **Avoid blocking**: Use async operations
2. **Worker threads**: For CPU-intensive operations (Excel generation)
3. **Caching**: Cache frequently accessed data (dictionaries, permissions)

## Baseline History

| Date | Version | Notes |
|------|---------|-------|
| 2026-01-23 | 1.0.0 | Initial baseline established |

## References

- PRD §4.3 Performance Requirements
- PRD §4.5 Runtime Resource Baseline
- PRD P-29 Worker Performance Requirements
- [BullMQ Best Practices](https://docs.bullmq.io/patterns)
- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/dont-block-the-event-loop)
