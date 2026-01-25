// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Stress Test: Run before releases, validate system limits

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Warm up
    { duration: '5m', target: 100 }, // Medium load
    { duration: '5m', target: 150 }, // High load
    { duration: '3m', target: 200 }, // Peak
    { duration: '2m', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: 'perf_test_user',
      password: __ENV.TEST_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return { token: loginRes.json('data.access_token') };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Mix of different API calls to simulate real traffic
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40%: Customer operations
    group('Customer Operations', () => {
      const listRes = http.get(
        `${BASE_URL}/api/v1/customers?page=1&pageSize=20`,
        { headers }
      );
      check(listRes, { 'customer list ok': (r) => r.status === 200 });
      apiLatency.add(listRes.timings.duration);
      errorRate.add(listRes.status >= 400);
    });
  } else if (scenario < 0.6) {
    // 20%: Organization queries
    group('Organization Queries', () => {
      const treeRes = http.get(`${BASE_URL}/api/v1/organization/tree`, {
        headers,
      });
      check(treeRes, { 'org tree ok': (r) => r.status === 200 });
    });
  } else if (scenario < 0.8) {
    // 20%: Permission checks
    group('Permission Checks', () => {
      const permRes = http.get(`${BASE_URL}/api/v1/auth/permissions`, {
        headers,
      });
      check(permRes, { 'permissions ok': (r) => r.status === 200 });
    });
  } else {
    // 20%: Report jobs
    group('Report Jobs', () => {
      const jobsRes = http.get(`${BASE_URL}/api/v1/reports/mfr/jobs`, {
        headers,
      });
      check(jobsRes, { 'report jobs ok': (r) => r.status === 200 });
    });
  }

  sleep(Math.random() * 1 + 0.5);
}
