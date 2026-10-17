import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AssetService } from './asset.service';

describe('AssetService', () => {
  let service: AssetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load a text relative to the root', async () => {
    const promise = firstValueFrom(service.loadText('mappings.json'));
    const req = httpMock.expectOne('./mappings.json');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');
    req.flush('{"a":1}');
    expect(await promise).toBe('{"a":1}');
  });

  it('should load an object from a JSON resource', async () => {
    const promise = firstValueFrom(service.loadObject<{ a: number }>('data.json'));
    const req = httpMock.expectOne('./data.json');
    expect(req.request.responseType).toBe('json');
    req.flush({ a: 1 });
    expect(await promise).toEqual({ a: 1 });
  });

  it('should add the JSON extension when missing', async () => {
    const promise = firstValueFrom(service.loadObject('data'));
    httpMock.expectOne('./data.json').flush({});
    expect(await promise).toEqual({});
  });
});
