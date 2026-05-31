import type { PlatformToolConnectionEnvironment, RequestFn } from '@/domains/platform-tool-connections/api/platform-tool-connections.api';

export interface EventBackboneStreamSummary {
  family: string;
  streamName: string;
  status: string;
  rawPayloadAccess: boolean;
  pendingOutboxCount: number;
  dlqCount: number;
}

export interface EventBackboneConsumerSummary {
  owner: string;
  queue: string;
  durableName: string;
  classification: string;
  sideEffectPolicy: string;
  status: string;
}

export interface EventBackboneSummary {
  environment: PlatformToolConnectionEnvironment;
  bridgeMode: string;
  readinessState: string;
  sourceOfTruthBoundary: string;
  registry: {
    totalEvents: number;
    families: string[];
    restrictedEvents: number;
  };
  streams: EventBackboneStreamSummary[];
  consumers: EventBackboneConsumerSummary[];
  bridgeModes: Array<{
    mode: string;
    available: boolean;
    requiresExplicitEnable: boolean;
  }>;
}

export function readEventBackboneSummary(
  request: RequestFn,
  environment: PlatformToolConnectionEnvironment
) {
  return request<EventBackboneSummary>(`/api/v1/event-backbone/summary?environment=${environment}`);
}
