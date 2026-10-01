import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../core/http/api-config';
import { communityCredentialsInterceptor } from '../core/http/community-http.interceptors';
import { CommunityProfileService } from './community-profile.service';

describe('CommunityProfileService', () => {
  let service: CommunityProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityProfileService,
        provideHttpClient(withInterceptors([communityCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: '/api/v1' } },
      ],
    });
    service = TestBed.inject(CommunityProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the authenticated composed Community profile projection', () => {
    service.getProfile().subscribe();
    const request = http.expectOne('/api/v1/community/profile/');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });
});
