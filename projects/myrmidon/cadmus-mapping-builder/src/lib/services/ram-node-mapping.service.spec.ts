import { TestBed } from '@angular/core/testing';

import { RamNodeMappingService } from './ram-node-mapping.service';

describe('RamNodeMappingService', () => {
  let service: RamNodeMappingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RamNodeMappingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
