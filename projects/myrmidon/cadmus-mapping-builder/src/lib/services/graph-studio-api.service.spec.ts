import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { EnvService } from '@myrmidon/ngx-tools';

import {
  GraphStudioApiService,
  NodeMappingMetadata,
} from './graph-studio-api.service';
import { MappingJsonService } from './mapping-json.service';
import { GraphSet, NodeMapping } from '../models';

const API = 'http://test/api/';

describe('GraphStudioApiService', () => {
  let service: GraphStudioApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: EnvService,
          useValue: { get: (key: string) => (key === 'apiUrl' ? API : undefined) },
        },
      ],
    });
    service = TestBed.inject(GraphStudioApiService);
    httpMock = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  const buildTree = (): NodeMapping => {
    const json = TestBed.inject(MappingJsonService);
    const root: NodeMapping = {
      id: 1,
      name: 'root',
      sourceType: 1,
      source: 'r',
      sid: 's',
      children: [{ id: 2, name: 'child', sourceType: 1, source: 'c', sid: '' }],
    };
    json.visitMappings(root, true);
    return root;
  };

  describe('runMappings', () => {
    it('should post source, metadata and parent-free mappings', async () => {
      const root = buildTree();
      const metadata: NodeMappingMetadata = { itemId: 'IID', flags: 3 };
      const result: GraphSet = { nodes: [], triples: [] };

      const promise = firstValueFrom(
        service.runMappings('{"a":1}', [root], metadata)
      );
      const req = httpMock.expectOne(API + 'mappings/run');
      expect(req.request.method).toBe('POST');
      const body = req.request.body;
      expect(body.itemId).toBe('IID');
      expect(body.flags).toBe(3);
      expect(body.source).toBe('{"a":1}');
      expect(body.mappings.length).toBe(1);
      expect(body.mappings[0].children[0].parent).toBeUndefined();
      // the posted mappings are a copy, serializable as JSON
      expect(body.mappings[0]).not.toBe(root);
      expect(() => JSON.stringify(body)).not.toThrow();
      req.flush({ value: result });

      expect(await promise).toEqual({ value: result });
    });

    it('should restore parent references in the original mappings', () => {
      const root = buildTree();
      service.runMappings('{}', [root]).subscribe();
      httpMock.expectOne(API + 'mappings/run').flush({});
      expect(root.children![0].parent).toBe(root);
    });

    it('should not mutate the received metadata', () => {
      const metadata: NodeMappingMetadata = { itemId: 'IID' };
      service.runMappings('{}', [buildTree()], metadata).subscribe();
      httpMock.expectOne(API + 'mappings/run').flush({});
      expect(metadata).toEqual({ itemId: 'IID' });
    });

    it('should post without metadata', () => {
      service.runMappings('{}', [buildTree()]).subscribe();
      const req = httpMock.expectOne(API + 'mappings/run');
      expect(Object.keys(req.request.body).sort()).toEqual([
        'mappings',
        'source',
      ]);
      req.flush({});
    });

    it('should map HTTP errors to a message', async () => {
      const promise = firstValueFrom(service.runMappings('{}', [buildTree()]));
      httpMock
        .expectOne(API + 'mappings/run')
        .flush('boom', { status: 500, statusText: 'Server Error' });
      await expect(promise).rejects.toBe('Server error: boom');
    });
  });

  describe('jmesTransform', () => {
    it('should post JSON and expression', async () => {
      const promise = firstValueFrom(service.jmesTransform('{"a":1}', 'a'));
      const req = httpMock.expectOne(API + 'jmes/transform');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ json: '{"a":1}', expression: 'a' });
      req.flush({ value: '1' });
      expect(await promise).toEqual({ value: '1' });
    });

    it('should map HTTP errors to a message', async () => {
      const promise = firstValueFrom(service.jmesTransform('{}', 'a'));
      httpMock
        .expectOne(API + 'jmes/transform')
        .flush('bad', { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toBe('Server error: bad');
    });
  });
});
