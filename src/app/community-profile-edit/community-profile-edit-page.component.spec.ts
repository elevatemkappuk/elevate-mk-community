import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityProfileEditPageComponent } from './community-profile-edit-page.component';

const profile: CommunityProfileResponse = {
  person: { first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes' },
  community: { bio: '', review_required: true },
  professional: { job_title: '', company: '', industry: null, career_stage: null, linkedin_url: '' },
  skills: [{ id: 1, name: 'Strategy', slug: 'strategy' }],
  interests: [],
  membership: { status: 'ACTIVE', joined_at: '2026-09-01' },
  completion: { name: true, professional_details: false, bio: false, skills: true, interests: false },
};

const options = {
  industries: [{ slug: 'technology', label: 'Technology' }],
  career_stages: [{ slug: 'MID_CAREER', label: 'Mid Career' }],
  skills: [{ slug: 'strategy', label: 'Strategy' }],
  interests: [{ slug: 'networking', label: 'Networking' }],
};

describe('CommunityProfileEditPageComponent', () => {
  let fixture: ComponentFixture<CommunityProfileEditPageComponent>;
  let profileService: {
    getProfile: ReturnType<typeof vi.fn>;
    getProfileOptions: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    acknowledgeProfileReview: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    profileService = {
      getProfile: vi.fn(() => of(profile)),
      getProfileOptions: vi.fn(() => of(options)),
      updateProfile: vi.fn(() => of(profile)),
      acknowledgeProfileReview: vi.fn(() => of({ review_required: false })),
    };
    await TestBed.configureTestingModule({
      imports: [CommunityProfileEditPageComponent],
      providers: [
        provideRouter([{ path: 'community/profile', component: CommunityProfileEditPageComponent }]),
        { provide: CommunityProfileService, useValue: profileService },
        { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityProfileEditPageComponent);
    fixture.detectChanges();
  });

  it('loads profile and controlled options without exposing protected account fields', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('[formControlName="first_name"]') as HTMLInputElement).value).toBe('Amina');
    expect(fixture.componentInstance.options()?.industries[0].label).toBe('Technology');
    expect(element.textContent).not.toContain('private@example.com');
    expect(element.textContent).not.toContain('Mobile');
  });

  it('constructs the documented replacement payload and can clear selections', () => {
    const component = fixture.componentInstance;
    component.toggleSelection('skills', 'strategy');
    component.form.controls.community.controls.bio.setValue('A short bio');
    component.save();
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      community: { bio: 'A short bio' },
      skills: [],
      interests: [],
    }));
    expect(profileService.updateProfile.mock.calls[0][0]).not.toHaveProperty('membership');
  });

  it('does not acknowledge when PATCH fails', () => {
    profileService.updateProfile.mockReturnValue(throwError(() => ({ status: 400, body: { detail: 'Invalid profile' } })));
    fixture.componentInstance.save();
    expect(profileService.acknowledgeProfileReview).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saveError()).toContain('Invalid profile');
  });
});
