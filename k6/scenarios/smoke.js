// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Smoke Test: Run on every PR, quick validation of basic performance

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    errors: ['rate<0.01'], // Error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export function setup() {
  // Get test token
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

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health check ok': (r) => r.status === 200 });

  // 2. Customer list query
  const customersRes = http.get(
    `${BASE_URL}/api/v1/customers?page=1&pageSize=20`,
    { headers }
  );
  check(customersRes, { 'customers list ok': (r) => r.status === 200 });
  apiLatency.add(customersRes.timings.duration);
  errorRate.add(customersRes.status !== 200);

  // 3. Organization tree query
  const orgRes = http.get(`${BASE_URL}/api/v1/organization/tree`, { headers });
  check(orgRes, { 'org tree ok': (r) => r.status === 200 });

  sleep(1);
}
