// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Load Test: Run daily, validate sustained load performance

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('requests');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm up
    { duration: '3m', target: 50 }, // Sustained load
    { duration: '30s', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.01'],
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

  group('Customer Management', () => {
    // List query
    const listRes = http.get(
      `${BASE_URL}/api/v1/customers?page=1&pageSize=20`,
      { headers }
    );
    check(listRes, { 'list ok': (r) => r.status === 200 });
    requestCount.add(1);

    // Detail query
    if (listRes.status === 200 && listRes.json('data.items.0.id')) {
      const customerId = listRes.json('data.items.0.id');
      const detailRes = http.get(`${BASE_URL}/api/v1/customers/${customerId}`, {
        headers,
      });
      check(detailRes, { 'detail ok': (r) => r.status === 200 });
      requestCount.add(1);
    }
  });

  group('Organization', () => {
    const treeRes = http.get(`${BASE_URL}/api/v1/organization/tree`, {
      headers,
    });
    check(treeRes, { 'tree ok': (r) => r.status === 200 });
    requestCount.add(1);
  });

  group('Permission Check', () => {
    const permRes = http.get(`${BASE_URL}/api/v1/auth/permissions`, {
      headers,
    });
    check(permRes, { 'permissions ok': (r) => r.status === 200 });
    requestCount.add(1);
  });

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'k6-results.json': JSON.stringify(data),
  };
}
