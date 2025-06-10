import { TestBed } from '@angular/core/testing';

import { GraphStudioApiService } from './graph-studio-api.service';

describe('GraphStudioApiService', () => {
  let service: GraphStudioApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphStudioApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
