import { TestBed } from '@angular/core/testing';

import { RamCacheService } from './ram-cache.service';

describe('RamCacheService', () => {
  let service: RamCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RamCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
