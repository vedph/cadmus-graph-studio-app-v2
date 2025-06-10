import { TestBed } from '@angular/core/testing';

import { MappingJsonService } from './mapping-json.service';

describe('MappingJsonService', () => {
  let service: MappingJsonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingJsonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
