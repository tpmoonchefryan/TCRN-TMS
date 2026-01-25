// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Service Performance Test

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const piiGetLatency = new Trend('pii_get_latency');
const piiCreateLatency = new Trend('pii_create_latency');
const piiBatchLatency = new Trend('pii_batch_latency');
const errorRate = new Rate('errors');
const piiOperations = new Counter('pii_operations');

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 requests per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { scenario: 'constant' },
    },
  },
  thresholds: {
    pii_get_latency: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    pii_create_latency: ['p(95)<1000'], // 95% < 1s
    pii_batch_latency: ['p(95)<2000'], // Batch operations < 2s
    errors: ['rate<0.02'], // Error rate < 2%
  },
};

const PII_SERVICE_URL = __ENV.PII_SERVICE_URL || 'http://localhost:4001';
const API_URL = __ENV.BASE_URL || 'http://localhost:4000';

export function setup() {
  // Get PII service token via main API
  const loginRes = http.post(
    `${API_URL}/api/v1/auth/login`,
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
    return { token: null, piiToken: null };
  }

  const accessToken = loginRes.json('data.access_token');

  // Get PII access token
  const piiTokenRes = http.post(
    `${API_URL}/api/v1/pii/token`,
    null,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    token: accessToken,
    piiToken: piiTokenRes.status === 200 ? piiTokenRes.json('data.token') : null,
  };
}

export default function (data) {
  if (!data.token) {
    console.error('No auth token available');
    return;
  }

  const headers = {
    Authorization: `Bearer ${data.piiToken || data.token}`,
    'Content-Type': 'application/json',
  };

  // Randomize test operations
  const operation = Math.random();

  if (operation < 0.6) {
    // 60% - Read operations (most common)
    group('PII Profile Read', () => {
      const testProfileId = `test-profile-${Math.floor(Math.random() * 1000)}`;
      
      const getRes = http.get(
        `${PII_SERVICE_URL}/api/v1/profiles/${testProfileId}`,
        { headers }
      );

      check(getRes, {
        'get returns 200 or 404': (r) => r.status === 200 || r.status === 404,
      });

      piiGetLatency.add(getRes.timings.duration);
      errorRate.add(getRes.status !== 200 && getRes.status !== 404);
      piiOperations.add(1);
    });
  } else if (operation < 0.85) {
    // 25% - Batch read operations
    group('PII Batch Read', () => {
      const profileIds = [];
      for (let i = 0; i < 5; i++) {
        profileIds.push(`test-profile-${Math.floor(Math.random() * 1000)}`);
      }

      const batchRes = http.post(
        `${PII_SERVICE_URL}/api/v1/profiles/batch`,
        JSON.stringify({ profileIds }),
        { headers }
      );

      check(batchRes, {
        'batch returns 200': (r) => r.status === 200,
      });

      piiBatchLatency.add(batchRes.timings.duration);
      errorRate.add(batchRes.status !== 200);
      piiOperations.add(1);
    });
  } else {
    // 15% - Write operations
    group('PII Profile Create', () => {
      const profileData = {
        givenName: `TestUser_${Date.now()}`,
        familyName: 'PerformanceTest',
        phoneNumbers: [
          {
            type: 'mobile',
            number: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            isPrimary: true,
          },
        ],
        emails: [
          {
            type: 'personal',
            address: `perf_${Date.now()}@test.local`,
            isPrimary: true,
          },
        ],
      };

      const createRes = http.post(
        `${PII_SERVICE_URL}/api/v1/profiles`,
        JSON.stringify(profileData),
        { headers }
      );

      check(createRes, {
        'create returns 200 or 201': (r) => r.status === 200 || r.status === 201,
      });

      piiCreateLatency.add(createRes.timings.duration);
      errorRate.add(createRes.status !== 200 && createRes.status !== 201);
      piiOperations.add(1);
    });
  }

  sleep(0.1);
}

export function teardown(data) {
  console.log('PII service performance test completed');
}
