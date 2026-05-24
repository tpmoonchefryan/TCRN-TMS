// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

class HarnessDependency {}

@Injectable()
class HarnessConsumer {
  constructor(readonly dependency: HarnessDependency) {}
}

describe('Vitest integration harness', () => {
  it('emits Nest decorator metadata through the SWC integration transform', () => {
    expect(Reflect.getMetadata('design:paramtypes', HarnessConsumer)).toEqual([HarnessDependency]);
  });
});
