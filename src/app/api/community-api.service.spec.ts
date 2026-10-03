import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityApiService } from './community-api.service';

describe('CommunityApiService', () => {
  let service: CommunityApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: '/api/v1' } },
      ],
    });
    service = TestBed.inject(CommunityApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps directory search, filters and page into the authenticated request', () => {
    service.getDirectory({ q: '  Amina  ', industry: 'technology', skill: 'strategy', interest: 'networking', page: 2 }).subscribe();
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/community/directory/');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.get('q')).toBe('Amina');
    expect(request.request.params.get('industry')).toBe('technology');
    expect(request.request.params.get('skill')).toBe('strategy');
    expect(request.request.params.get('interest')).toBe('networking');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('omits blank search and empty filters', () => {
    service.getDirectory({ q: '   ', industry: '', skill: '', interest: '', page: 1 }).subscribe();
    const request = http.expectOne('/api/v1/community/directory/');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });
});
