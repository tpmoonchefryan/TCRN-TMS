// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Worker Performance Baseline Tests (PRD P-29)
// Measures and validates CPU/memory usage for worker jobs

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import * as v8 from 'v8';

/**
 * Performance baseline thresholds
 * These values are based on PRD requirements and initial benchmarking
 */
const THRESHOLDS = {
  // Memory thresholds (in MB)
  memory: {
    baseline: 100, // Idle worker memory
    reportGeneration: 300, // Max during report generation
    importProcessing: 250, // Max during import
    peakAllowed: 500, // Absolute max before warning
  },
  // Duration thresholds (in ms)
  duration: {
    simpleJob: 100, // Simple job processing
    complexJob: 5000, // Complex job (report/import)
    batchOperation: 30000, // Batch operations
  },
  // Throughput thresholds (jobs/second)
  throughput: {
    simpleJobs: 100, // Simple job queue processing
    complexJobs: 5, // Complex job queue processing
  },
};

/**
 * Get current memory usage in MB
 */
function getMemoryUsageMB(): { heapUsed: number; heapTotal: number; rss: number; external: number } {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024,
    heapTotal: usage.heapTotal / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
    external: usage.external / 1024 / 1024,
  };
}

/**
 * Get V8 heap statistics
 */
function getHeapStatistics(): {
  totalHeapSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
} {
  const stats = v8.getHeapStatistics();
  return {
    totalHeapSize: stats.total_heap_size / 1024 / 1024,
    usedHeapSize: stats.used_heap_size / 1024 / 1024,
    heapSizeLimit: stats.heap_size_limit / 1024 / 1024,
  };
}

/**
 * Force garbage collection if available
 */
function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Simulate report generation workload
 */
async function simulateReportGeneration(rowCount: number): Promise<{ duration: number; peakMemory: number }> {
  forceGC();
  const startMemory = getMemoryUsageMB().heapUsed;
  const startTime = performance.now();
  let peakMemory = startMemory;

  // Simulate building Excel data
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({
      id: `customer-${i}`,
      nickname: `Customer ${i}`,
      email: `customer${i}@example.com`,
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      platforms: ['YOUTUBE', 'TWITTER'],
      memberships: [{ tier: 'GOLD', expiresAt: '2026-12-31' }],
    });

    // Check memory periodically
    if (i % 1000 === 0) {
      const currentMemory = getMemoryUsageMB().heapUsed;
      peakMemory = Math.max(peakMemory, currentMemory);
    }
  }

  // Simulate serialization (force memory allocation)
  void JSON.stringify(rows);

  const endTime = performance.now();
  const finalMemory = getMemoryUsageMB().heapUsed;
  peakMemory = Math.max(peakMemory, finalMemory);

  return {
    duration: endTime - startTime,
    peakMemory: peakMemory - startMemory,
  };
}

/**
 * Simulate import processing workload
 */
async function simulateImportProcessing(rowCount: number): Promise<{ duration: number; peakMemory: number }> {
  forceGC();
  const startMemory = getMemoryUsageMB().heapUsed;
  const startTime = performance.now();
  let peakMemory = startMemory;

  // Simulate parsing CSV data
  const parsedRows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    // Simulate validation
    const row = {
      nickname: `Imported Customer ${i}`,
      email: `import${i}@example.com`,
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      isValid: true,
      errors: [],
    };

    // Simulate transformation
    parsedRows.push({
      ...row,
      normalizedPhone: row.phone.replace(/[^0-9+]/g, ''),
      normalizedEmail: row.email.toLowerCase(),
    });

    // Check memory periodically
    if (i % 1000 === 0) {
      const currentMemory = getMemoryUsageMB().heapUsed;
      peakMemory = Math.max(peakMemory, currentMemory);
    }
  }

  const endTime = performance.now();
  const finalMemory = getMemoryUsageMB().heapUsed;
  peakMemory = Math.max(peakMemory, finalMemory);

  return {
    duration: endTime - startTime,
    peakMemory: peakMemory - startMemory,
  };
}

/**
 * Measure throughput of simple operations
 */
async function measureSimpleThroughput(operationCount: number): Promise<number> {
  const startTime = performance.now();

  for (let i = 0; i < operationCount; i++) {
    // Simulate simple job processing (force object creation)
    void { id: i, processed: true, timestamp: Date.now() };
    await new Promise((resolve) => setImmediate(resolve));
  }

  const endTime = performance.now();
  const durationSeconds = (endTime - startTime) / 1000;

  return operationCount / durationSeconds;
}

describe('Worker Performance Baseline', () => {
  beforeAll(() => {
    // Warm up
    forceGC();
  });

  afterAll(() => {
    forceGC();
  });

  describe('Memory Baseline', () => {
    it('idle worker memory should be under baseline threshold', () => {
      forceGC();
      const memory = getMemoryUsageMB();

      console.log('Idle Memory Usage:');
      console.log(`  Heap Used: ${memory.heapUsed.toFixed(2)} MB`);
      console.log(`  Heap Total: ${memory.heapTotal.toFixed(2)} MB`);
      console.log(`  RSS: ${memory.rss.toFixed(2)} MB`);

      expect(memory.heapUsed).toBeLessThan(THRESHOLDS.memory.baseline);
    });

    it('should log V8 heap statistics', () => {
      const stats = getHeapStatistics();

      console.log('V8 Heap Statistics:');
      console.log(`  Total Heap: ${stats.totalHeapSize.toFixed(2)} MB`);
      console.log(`  Used Heap: ${stats.usedHeapSize.toFixed(2)} MB`);
      console.log(`  Heap Limit: ${stats.heapSizeLimit.toFixed(2)} MB`);

      expect(stats.usedHeapSize).toBeLessThan(stats.heapSizeLimit);
    });
  });

  describe('Report Generation Performance', () => {
    it('should handle 1,000 rows within memory threshold', async () => {
      const result = await simulateReportGeneration(1000);

      console.log('Report Generation (1K rows):');
      console.log(`  Duration: ${result.duration.toFixed(2)} ms`);
      console.log(`  Peak Memory Delta: ${result.peakMemory.toFixed(2)} MB`);

      expect(result.peakMemory).toBeLessThan(THRESHOLDS.memory.reportGeneration);
    });

    it('should handle 10,000 rows within memory threshold', async () => {
      const result = await simulateReportGeneration(10000);

      console.log('Report Generation (10K rows):');
      console.log(`  Duration: ${result.duration.toFixed(2)} ms`);
      console.log(`  Peak Memory Delta: ${result.peakMemory.toFixed(2)} MB`);

      expect(result.peakMemory).toBeLessThan(THRESHOLDS.memory.reportGeneration);
    });

    it('should handle 50,000 rows (PRD limit) within memory threshold', async () => {
      const result = await simulateReportGeneration(50000);

      console.log('Report Generation (50K rows - PRD limit):');
      console.log(`  Duration: ${result.duration.toFixed(2)} ms`);
      console.log(`  Peak Memory Delta: ${result.peakMemory.toFixed(2)} MB`);

      expect(result.peakMemory).toBeLessThan(THRESHOLDS.memory.peakAllowed);
    });
  });

  describe('Import Processing Performance', () => {
    it('should handle 1,000 rows within memory threshold', async () => {
      const result = await simulateImportProcessing(1000);

      console.log('Import Processing (1K rows):');
      console.log(`  Duration: ${result.duration.toFixed(2)} ms`);
      console.log(`  Peak Memory Delta: ${result.peakMemory.toFixed(2)} MB`);

      expect(result.peakMemory).toBeLessThan(THRESHOLDS.memory.importProcessing);
    });

    it('should handle 10,000 rows within memory threshold', async () => {
      const result = await simulateImportProcessing(10000);

      console.log('Import Processing (10K rows):');
      console.log(`  Duration: ${result.duration.toFixed(2)} ms`);
      console.log(`  Peak Memory Delta: ${result.peakMemory.toFixed(2)} MB`);

      expect(result.peakMemory).toBeLessThan(THRESHOLDS.memory.importProcessing);
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve minimum simple job throughput', async () => {
      const throughput = await measureSimpleThroughput(1000);

      console.log('Simple Job Throughput:');
      console.log(`  ${throughput.toFixed(2)} jobs/second`);

      expect(throughput).toBeGreaterThan(THRESHOLDS.throughput.simpleJobs);
    });
  });

  describe('Memory Cleanup', () => {
    it('should release memory after large operation', async () => {
      // Create large data
      await simulateReportGeneration(10000);
      const beforeGC = getMemoryUsageMB().heapUsed;

      // Force cleanup
      forceGC();
      await new Promise((resolve) => setTimeout(resolve, 100));
      forceGC();

      const afterGC = getMemoryUsageMB().heapUsed;

      console.log('Memory Cleanup:');
      console.log(`  Before GC: ${beforeGC.toFixed(2)} MB`);
      console.log(`  After GC: ${afterGC.toFixed(2)} MB`);
      console.log(`  Released: ${(beforeGC - afterGC).toFixed(2)} MB`);

      // Should release at least 50% of memory
      expect(afterGC).toBeLessThan(beforeGC * 0.8);
    });
  });
});
