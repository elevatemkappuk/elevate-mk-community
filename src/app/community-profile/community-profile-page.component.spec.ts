import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityProfilePageComponent } from './community-profile-page.component';

const profile: CommunityProfileResponse = {
  person: { first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes' },
  community: { bio: 'Community builder', review_required: true },
  professional: {
    job_title: 'Designer', company: 'Elevate MK', industry: { id: 1, slug: 'technology', label: 'Technology' },
    career_stage: 'MID_CAREER', linkedin_url: 'https://www.linkedin.com/in/amina',
  },
  skills: [{ id: 1, name: 'Strategy', slug: 'strategy' }],
  interests: [],
  membership: { status: 'ACTIVE', joined_at: '2026-09-01' },
  completion: { name: true, professional_details: true, bio: true, skills: true, interests: false },
};

describe('CommunityProfilePageComponent', () => {
  let fixture: ComponentFixture<CommunityProfilePageComponent>;
  let profileService: { getProfile: ReturnType<typeof vi.fn> };
  let auth: { logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    profileService = { getProfile: vi.fn(() => of(profile)) };
    auth = { logout: vi.fn(() => of(void 0)) };
    await TestBed.configureTestingModule({
      imports: [CommunityProfilePageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityProfileService, useValue: profileService },
        { provide: CommunityAuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityProfilePageComponent);
    fixture.detectChanges();
  });

  it('renders the composed profile, completion checklist, and review banner', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Amina Zulu');
    expect(element.textContent).toContain('Community builder');
    expect(element.textContent).toContain('Technology');
    expect(element.textContent).toContain('Strategy');
    expect(element.textContent).toContain('Check your details');
    expect(element.textContent).toContain('Interests');
    expect(element.textContent).toContain('To add');
    expect(element.textContent).not.toContain('private@example.com');
    expect(element.textContent).not.toContain('mobile');
  });

  it('does not render the review banner when review is not required', () => {
    profileService.getProfile.mockReturnValue(of({ ...profile, community: { ...profile.community, review_required: false } }));
    fixture = TestBed.createComponent(CommunityProfilePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Check your details');
  });

  it('renders a safe load-error state', () => {
    profileService.getProfile.mockReturnValue(throwError(() => ({ status: 500, body: { detail: 'internal' } })));
    fixture = TestBed.createComponent(CommunityProfilePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t load your profile');
    expect(fixture.nativeElement.textContent).not.toContain('internal');
  });
});
