import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { communityCredentialsInterceptor, setCommunityCsrfToken } from '../core/http/community-http.interceptors';
import { CommunityAuthService } from './community-auth.service';
import { CommunityApiService } from './community-api.service';

describe('CommunityApiService', () => {
  let service: CommunityApiService;
  let http: HttpTestingController;
  let auth: { bootstrapCsrf: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityApiService,
        provideHttpClient(withInterceptors([communityCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: '/api/v1' } },
        { provide: CommunityAuthService, useValue: auth = { bootstrapCsrf: vi.fn(() => of(void 0)) } },
      ],
    });
    service = TestBed.inject(CommunityApiService);
    http = TestBed.inject(HttpTestingController);
    setCommunityCsrfToken('csrf-token');
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

  it('loads a directory profile by encoded id with credentials', () => {
    service.getDirectoryProfile('member/one').subscribe();
    const request = http.expectOne('/api/v1/community/directory/member%2Fone/');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });

  it('sends connection mutations with credentials and the C2 contract', () => {
    service.sendConnectionRequest('member-1').subscribe();
    let request = http.expectOne('/api/v1/community/connections/requests/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ directory_id: 'member-1' });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token');
    request.flush({ connection_id: 'connection-1', member: {} });

    service.acceptConnection('connection/1').subscribe();
    request = http.expectOne('/api/v1/community/connections/connection%2F1/accept/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token');
    request.flush({ connection_id: 'connection-1', member: {} });

    service.declineConnection('connection-1').subscribe();
    request = http.expectOne('/api/v1/community/connections/connection-1/decline/');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token');
    request.flush({ connection_id: 'connection-1', member: {} });

    service.removeConnection('connection-1').subscribe();
    request = http.expectOne('/api/v1/community/connections/connection-1/');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token');
    request.flush(null);
    expect(auth.bootstrapCsrf).toHaveBeenCalledTimes(4);
  });

  it('loads paginated connections and request directions from query parameters', () => {
    service.getConnections(2).subscribe();
    let request = http.expectOne('/api/v1/community/connections/?page=2');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ count: 25, next: null, previous: 'previous', results: [] });

    service.getConnectionRequests('incoming').subscribe();
    request = http.expectOne('/api/v1/community/connections/requests/?direction=incoming');
    expect(request.request.params.get('direction')).toBe('incoming');
    request.flush({ count: 0, next: null, previous: null, results: [] });

    service.getConnectionRequests('outgoing', 3).subscribe();
    request = http.expectOne('/api/v1/community/connections/requests/?direction=outgoing&page=3');
    expect(request.request.params.get('direction')).toBe('outgoing');
    expect(request.request.params.get('page')).toBe('3');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });
});
