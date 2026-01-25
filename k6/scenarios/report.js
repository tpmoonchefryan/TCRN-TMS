// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Module Performance Test

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const reportSearchLatency = new Trend('report_search_latency');
const reportCreateLatency = new Trend('report_create_latency');
const reportListLatency = new Trend('report_list_latency');
const errorRate = new Rate('errors');
const reportJobsCreated = new Counter('report_jobs_created');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      startTime: '1m30s',
      tags: { scenario: 'load' },
    },
  },
  thresholds: {
    report_search_latency: ['p(95)<2000'], // 95% of searches < 2s
    report_create_latency: ['p(95)<3000'], // 95% of creates < 3s
    report_list_latency: ['p(95)<1000'], // 95% of list queries < 1s
    errors: ['rate<0.05'], // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TEST_TALENT_ID = __ENV.TEST_TALENT_ID || '00000000-0000-0000-0000-000000000001';

export function setup() {
  // Get test token
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

  group('Report Search Preview', () => {
    const searchPayload = JSON.stringify({
      filters: {
        includeExpired: false,
      },
      limit: 20,
    });

    const searchRes = http.post(
      `${BASE_URL}/api/v1/report/talent/${TEST_TALENT_ID}/search`,
      searchPayload,
      { headers }
    );

    check(searchRes, {
      'search returns 200': (r) => r.status === 200,
      'search has preview data': (r) => {
        if (r.status !== 200) return false;
        const body = r.json();
        return body && body.data !== undefined;
      },
    });

    reportSearchLatency.add(searchRes.timings.duration);
    errorRate.add(searchRes.status !== 200);
  });

  sleep(0.5);

  group('Report Job List', () => {
    const listRes = http.get(
      `${BASE_URL}/api/v1/report/talent/${TEST_TALENT_ID}/jobs?page=1&pageSize=10`,
      { headers }
    );

    check(listRes, {
      'job list returns 200': (r) => r.status === 200,
      'job list has items': (r) => {
        if (r.status !== 200) return false;
        const body = r.json();
        return body && Array.isArray(body.data?.items);
      },
    });

    reportListLatency.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
  });

  sleep(0.5);

  // Only create jobs occasionally to avoid overwhelming the system
  if (Math.random() < 0.1) {
    group('Report Job Creation', () => {
      const createPayload = JSON.stringify({
        reportType: 'mfr',
        filters: {
          includeExpired: false,
        },
        format: 'xlsx',
        estimatedRows: 100, // Small estimate for test
      });

      const createRes = http.post(
        `${BASE_URL}/api/v1/report/talent/${TEST_TALENT_ID}/jobs`,
        createPayload,
        { headers }
      );

      check(createRes, {
        'create returns 200 or 201': (r) => r.status === 200 || r.status === 201,
        'create returns job id': (r) => {
          if (r.status !== 200 && r.status !== 201) return false;
          const body = r.json();
          return body && body.data?.jobId;
        },
      });

      reportCreateLatency.add(createRes.timings.duration);
      errorRate.add(createRes.status !== 200 && createRes.status !== 201);

      if (createRes.status === 200 || createRes.status === 201) {
        reportJobsCreated.add(1);
      }
    });
  }

  sleep(1);
}

export function teardown(data) {
  console.log('Report performance test completed');
  console.log(`Auth token available: ${!!data.token}`);
}
