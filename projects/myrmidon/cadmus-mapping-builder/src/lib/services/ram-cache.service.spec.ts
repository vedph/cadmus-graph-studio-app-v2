import { TestBed } from '@angular/core/testing';

import { RamCacheService } from './ram-cache.service';

describe('RamCacheService', () => {
  let service: RamCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RamCacheService);
  });

  it('should be created empty', () => {
    expect(service).toBeTruthy();
    expect(service.getKeys()).toEqual([]);
  });

  it('should add and get values', () => {
    service.add('a', 'alpha');
    service.add('b', { x: 1 });
    expect(service.has('a')).toBe(true);
    expect(service.get('a')).toBe('alpha');
    expect(service.get('b')).toEqual({ x: 1 });
  });

  it('should replace a value with the same key', () => {
    service.add('a', 'alpha');
    service.add('a', 'beta');
    expect(service.get('a')).toBe('beta');
    expect(service.getKeys()).toEqual(['a']);
  });

  it('should return undefined for missing keys', () => {
    expect(service.has('missing')).toBe(false);
    expect(service.get('missing')).toBeUndefined();
  });

  it('should remove a value', () => {
    service.add('a', 'alpha');
    service.remove('a');
    expect(service.has('a')).toBe(false);
    // removing a missing key is harmless
    service.remove('a');
    expect(service.getKeys()).toEqual([]);
  });

  it('should clear all values', () => {
    service.add('a', 1);
    service.add('b', 2);
    service.clear();
    expect(service.getKeys()).toEqual([]);
  });

  it('should get keys, optionally filtered by prefix', () => {
    service.add('map_one', 1);
    service.add('map_two', 2);
    service.add('jms_one', 3);
    expect(service.getKeys().sort()).toEqual(['jms_one', 'map_one', 'map_two']);
    expect(service.getKeys('map_').sort()).toEqual(['map_one', 'map_two']);
    expect(service.getKeys('none_')).toEqual([]);
  });
});
