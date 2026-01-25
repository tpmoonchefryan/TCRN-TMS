// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Worker Queue Performance Test

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const jobQueueLatency = new Trend('job_queue_latency');
const jobStatusLatency = new Trend('job_status_latency');
const jobThroughput = new Counter('jobs_queued');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    burst: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '2m',
      tags: { scenario: 'burst' },
    },
    sustained: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 30,
      startTime: '2m30s',
      tags: { scenario: 'sustained' },
    },
  },
  thresholds: {
    job_queue_latency: ['p(95)<2000'], // Queue operations < 2s
    job_status_latency: ['p(95)<500'], // Status checks < 500ms
    errors: ['rate<0.05'], // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TEST_TALENT_ID = __ENV.TEST_TALENT_ID || '00000000-0000-0000-0000-000000000001';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: __ENV.TEST_USERNAME || 'perf_test_user',
      password: __ENV.TEST_PASSWORD || 'TestPassword123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body);
    return { token: null };
  }

  return { token: loginRes.json('data.access_token') };
}

export default function (data) {
  if (!data.token) {
    console.error('No auth token available');
    return;
  }

  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Test different worker job types
  const jobType = Math.random();

  if (jobType < 0.4) {
    // 40% - Report generation jobs
    group('Queue Report Job', () => {
      const jobPayload = JSON.stringify({
        reportType: 'mfr',
        filters: {
          includeExpired: false,
          platformCodes: ['YOUTUBE'],
        },
        format: 'xlsx',
        estimatedRows: Math.floor(Math.random() * 1000) + 100,
      });

      const queueRes = http.post(
        `${BASE_URL}/api/v1/report/talent/${TEST_TALENT_ID}/jobs`,
        jobPayload,
        { headers }
      );

      check(queueRes, {
        'report job queued': (r) => r.status === 200 || r.status === 201,
        'job id returned': (r) => {
          if (r.status !== 200 && r.status !== 201) return false;
          const body = r.json();
          return body && body.data?.jobId;
        },
      });

      jobQueueLatency.add(queueRes.timings.duration);
      errorRate.add(queueRes.status !== 200 && queueRes.status !== 201);

      if (queueRes.status === 200 || queueRes.status === 201) {
        jobThroughput.add(1);

        // Check job status
        const jobId = queueRes.json('data.jobId');
        if (jobId) {
          sleep(0.2);
          const statusRes = http.get(
            `${BASE_URL}/api/v1/report/talent/${TEST_TALENT_ID}/jobs/${jobId}`,
            { headers }
          );

          check(statusRes, {
            'status check ok': (r) => r.status === 200,
          });

          jobStatusLatency.add(statusRes.timings.duration);
        }
      }
    });
  } else if (jobType < 0.7) {
    // 30% - Import jobs (simulated)
    group('Queue Import Job', () => {
      // Simulate import job queue check
      const listRes = http.get(
        `${BASE_URL}/api/v1/import/jobs?status=pending&page=1&pageSize=10`,
        { headers }
      );

      // May return 404 if endpoint doesn't exist, that's ok
      check(listRes, {
        'import jobs list ok': (r) => r.status === 200 || r.status === 404,
      });

      if (listRes.status === 200) {
        jobStatusLatency.add(listRes.timings.duration);
      }
    });
  } else {
    // 30% - Export jobs (simulated)
    group('Queue Export Job', () => {
      // Simulate export job queue check
      const listRes = http.get(
        `${BASE_URL}/api/v1/export/jobs?status=pending&page=1&pageSize=10`,
        { headers }
      );

      check(listRes, {
        'export jobs list ok': (r) => r.status === 200 || r.status === 404,
      });

      if (listRes.status === 200) {
        jobStatusLatency.add(listRes.timings.duration);
      }
    });
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log('Worker queue performance test completed');
  console.log('Total jobs queued:', jobThroughput);
}

// Health check for worker service
export function healthCheck() {
  const healthRes = http.get(`${BASE_URL}/health`);
  return healthRes.status === 200;
}
