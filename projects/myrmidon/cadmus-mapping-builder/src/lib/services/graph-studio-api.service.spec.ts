import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { GraphStudioApiService } from './graph-studio-api.service';

describe('GraphStudioApiService', () => {
  let service: GraphStudioApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(GraphStudioApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
