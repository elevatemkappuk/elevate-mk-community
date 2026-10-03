import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../core/http/api-config';
import { communityCredentialsInterceptor } from '../core/http/community-http.interceptors';
import { CommunityAuthService } from './community-auth.service';
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
        { provide: CommunityAuthService, useValue: { bootstrapCsrf: () => of(void 0) } },
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

  it('loads options, patches the profile, and acknowledges review with unsafe requests', () => {
    service.getProfileOptions().subscribe();
    let request = http.expectOne('/api/v1/community/profile/options/');
    expect(request.request.method).toBe('GET');
    request.flush({ industries: [], career_stages: [], skills: [], interests: [] });

    service.updateProfile({
      person: { first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes' },
      community: { bio: '' },
      professional: { job_title: '', company: '', industry: null, career_stage: null, linkedin_url: '' },
      skills: [],
      interests: [],
    }).subscribe();
    request = http.expectOne('/api/v1/community/profile/');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.skills).toEqual([]);
    request.flush({});

    service.acknowledgeProfileReview().subscribe();
    request = http.expectOne('/api/v1/community/profile/review-acknowledgement/');
    expect(request.request.method).toBe('POST');
    request.flush({ review_required: false });
  });

  it('uploads a photo as FormData without forcing the multipart Content-Type', () => {
    const photo = new File(['photo'], 'avatar.webp', { type: 'image/webp' });
    service.uploadProfilePhoto(photo).subscribe();
    const request = http.expectOne('/api/v1/community/profile/photo/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('photo')).toBe(photo);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({});
  });

  it('removes a photo through the authenticated unsafe-request path', () => {
    service.removeProfilePhoto().subscribe();
    const request = http.expectOne('/api/v1/community/profile/photo/');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });
});
