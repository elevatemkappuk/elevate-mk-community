import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, ConnectionRequestRecord, DirectoryMember } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityHomePageComponent } from './community-home-page.component';

const member: DirectoryMember = {
  directory_id: 'member-1', photo_url: null, first_name: 'Helen', last_name: 'Amoako', location: 'Milton Keynes',
  professional: { job_title: 'CEO', company: 'Example', industry: null }, skills: [], interests: [],
  relationship: { state: 'CONNECTED', connection_id: 'connection-1', can_connect: false, can_accept: false, can_decline: false, can_remove: true },
};

const request = (id: string): ConnectionRequestRecord => ({
  connection_id: `connection-${id}`, state: 'INCOMING_PENDING', requested_at: '2026-10-04T10:00:00Z',
  member: { ...member, directory_id: `member-${id}`, first_name: id === '1' ? 'Helen' : 'Another', last_name: 'Member' },
});

const profile = (overrides: Partial<CommunityProfileResponse> = {}): CommunityProfileResponse => ({
  person: { first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes' },
  community: { bio: 'Community builder', review_required: false, photo_url: 'https://example.test/photo.jpg', directory_id: 'member-1', directory_visible: true, email_visible: false, mobile_visible: false },
  professional: { job_title: 'Community director', company: 'Elevate MK', industry: { id: 1, slug: 'community', label: 'Community' }, career_stage: null, linkedin_url: '' },
  skills: [{ id: 1, name: 'Leadership', slug: 'leadership' }],
  interests: [{ id: 1, name: 'Community', slug: 'community' }],
  membership: { status: 'ACTIVE', joined_at: '2026-01-01' },
  completion: { name: true, professional_details: true, bio: true, skills: true, interests: true },
  ...overrides,
});

describe('CommunityHomePageComponent', () => {
  let fixture: ComponentFixture<CommunityHomePageComponent>;
  let api: {
    getConnectionRequests: ReturnType<typeof vi.fn>;
    acceptConnection: ReturnType<typeof vi.fn>;
    declineConnection: ReturnType<typeof vi.fn>;
  };
  let profileService: { getProfile: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityHomePageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityAuthService, useValue: { currentUser: vi.fn(() => ({ id: 1, first_name: 'Amina', last_name: 'Zulu' })), logout: vi.fn(() => of(void 0)) } },
        { provide: CommunityApiService, useValue: api },
        { provide: CommunityProfileService, useValue: profileService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityHomePageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    api = {
      getConnectionRequests: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
      acceptConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
      declineConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
    };
    profileService = { getProfile: vi.fn(() => of(profile())) };
  });

  it('loads only a small authoritative incoming preview without blocking Home', async () => {
    api.getConnectionRequests.mockReturnValue(of({ count: 5, next: 'next', previous: null, results: [request('1'), request('2'), request('3'), request('4')] }));
    await createComponent();
    expect(api.getConnectionRequests).toHaveBeenCalledWith('incoming', 1, 3);
    expect(fixture.nativeElement.textContent).toContain('Welcome, Amina.');
    expect(fixture.nativeElement.querySelectorAll('app-community-connection-card').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain('example.test');
    expect(fixture.nativeElement.textContent).not.toContain('connection-1');
    expect(fixture.nativeElement.querySelector('a[href*="/community/directory/requests"]')).not.toBeNull();
    expect(profileService.getProfile).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('app-profile-avatar img')?.getAttribute('alt')).toBe('Amina Zulu profile photo');
    expect(fixture.nativeElement.querySelector('app-profile-avatar')?.classList.contains('profile-avatar--hero')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Community director');
    expect(fixture.nativeElement.textContent).toContain('Milton Keynes');
    const exit = fixture.nativeElement.querySelector('.home-exit a') as HTMLAnchorElement;
    expect(exit?.getAttribute('href')).toBe('https://elevatemk.org/');
    expect(fixture.nativeElement.querySelector('.home-identity .home-exit')).toBeNull();
    expect(fixture.nativeElement.querySelector('.home-exit')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.home-requests')?.compareDocumentPosition(fixture.nativeElement.querySelector('.home-exit')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('omits the request section when there are no incoming requests', async () => {
    await createComponent();
    expect(fixture.nativeElement.querySelector('.home-requests')).toBeNull();
    expect(fixture.nativeElement.querySelector('.home-exit')).not.toBeNull();
  });

  it('uses review-required priority and navigates through the existing review flow', async () => {
    profileService.getProfile.mockReturnValue(of(profile({
      community: { ...profile().community, review_required: true },
      completion: { name: true, professional_details: false, bio: false, skills: false, interests: false },
    })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Your profile is ready for review.');
    expect(fixture.nativeElement.textContent).toContain('Review profile');
    expect(fixture.nativeElement.textContent).not.toContain('Complete profile');
    expect(fixture.nativeElement.querySelector('a[href="/community/profile/edit"]')).not.toBeNull();
  });

  it('shows one completion prompt when review is not required and the backend completion is incomplete', async () => {
    profileService.getProfile.mockReturnValue(of(profile({ completion: { name: true, professional_details: false, bio: true, skills: true, interests: false } })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Make your profile more useful to the Community.');
    expect(fixture.nativeElement.textContent).toContain('Complete profile');
    expect(fixture.nativeElement.querySelector('a[href="/community/profile/edit"]')).not.toBeNull();
  });

  it('shows a restrained positive state when the backend reports a complete profile', async () => {
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Your profile is up to date.');
    expect(fixture.nativeElement.textContent).toContain('5 of 5 complete');
    expect(fixture.nativeElement.querySelectorAll('.home-progress-list li').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('View profile');
    expect(fixture.nativeElement.querySelector('.home-attention')).toBeNull();
  });

  it('renders backend completion dimensions and an edit action without counting photo', async () => {
    profileService.getProfile.mockReturnValue(of(profile({
      community: { ...profile().community, photo_url: 'https://example.test/photo.jpg' },
      completion: { name: true, professional_details: false, bio: true, skills: false, interests: false },
    })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('2 of 5 complete');
    expect(fixture.nativeElement.textContent).toContain('Edit profile');
    expect(fixture.nativeElement.querySelectorAll('.home-progress-list li').length).toBe(5);
    expect(fixture.nativeElement.textContent).not.toContain('Photo');
  });

  it('keeps all Community destinations available', async () => {
    await createComponent();
    const links = Array.from(fixture.nativeElement.querySelectorAll('.home-destination')) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/community/directory', '/community/profile', '/community/account',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Discover members');
    expect(fixture.nativeElement.textContent).toContain('Account & Preferences');
  });

  it('keeps profile content available when the requests request fails', async () => {
    api.getConnectionRequests.mockReturnValue(throwError(() => ({ status: 503, body: null })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Community director');
    expect(fixture.nativeElement.textContent).toContain('Connection requests are temporarily unavailable.');
  });

  it('keeps the incoming request preview available when the profile request fails', async () => {
    profileService.getProfile.mockReturnValue(throwError(() => ({ status: 503, body: null })));
    api.getConnectionRequests.mockReturnValue(of({ count: 1, next: null, previous: null, results: [request('1')] }));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Helen Member');
    expect(fixture.nativeElement.textContent).toContain('couldn’t load your profile details');
  });

  it('excludes progress when profile loading fails but keeps destinations available', async () => {
    profileService.getProfile.mockReturnValue(throwError(() => ({ status: 503, body: null })));
    await createComponent();
    expect(fixture.nativeElement.querySelector('.home-progress')).toBeNull();
    expect(fixture.nativeElement.querySelector('.home-destinations')).not.toBeNull();
  });

  it('uses backend completion booleans without requiring optional profile fields', async () => {
    profileService.getProfile.mockReturnValue(of(profile({
      person: { first_name: 'Amina', last_name: 'Zulu', location: '' },
      professional: { job_title: '', company: '', industry: null, career_stage: null, linkedin_url: '' },
      completion: { name: true, professional_details: true, bio: true, skills: true, interests: true },
    })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('5 of 5 complete');
  });

  it('keeps the full factual progress panel when review is required', async () => {
    profileService.getProfile.mockReturnValue(of(profile({
      community: { ...profile().community, review_required: true },
      completion: { name: true, professional_details: true, bio: true, skills: true, interests: true },
    })));
    await createComponent();
    expect(fixture.nativeElement.querySelectorAll('.home-progress-list li').length).toBe(5);
    expect(fixture.nativeElement.textContent).not.toContain('View profile');
  });

  it('accepts a request once and refreshes the authoritative preview', async () => {
    api.getConnectionRequests
      .mockReturnValueOnce(of({ count: 1, next: null, previous: null, results: [request('1')] }))
      .mockReturnValueOnce(of({ count: 0, next: null, previous: null, results: [] }));
    await createComponent();
    const button = fixture.nativeElement.querySelector('.request-actions button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(api.acceptConnection).toHaveBeenCalledWith('connection-1');
    expect(api.acceptConnection).toHaveBeenCalledOnce();
    expect(api.getConnectionRequests).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.home-requests')).toBeNull();
  });

  it('declines a request and keeps it visible when the mutation fails', async () => {
    api.getConnectionRequests.mockReturnValue(of({ count: 1, next: null, previous: null, results: [request('1')] }));
    api.declineConnection.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'internal detail' } })));
    await createComponent();
    const button = fixture.nativeElement.querySelectorAll('.request-actions button')[1] as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(api.declineConnection).toHaveBeenCalledWith('connection-1');
    expect(fixture.nativeElement.textContent).toContain('Helen Member');
    expect(fixture.nativeElement.textContent).toContain('short pause');
    expect(fixture.nativeElement.textContent).not.toContain('internal detail');
  });
});
