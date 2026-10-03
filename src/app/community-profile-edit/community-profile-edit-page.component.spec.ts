import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityProfileEditPageComponent } from './community-profile-edit-page.component';

const profile: CommunityProfileResponse = {
  person: { first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes' },
  community: { bio: '', review_required: true, photo_url: null, directory_id: 'member-1', directory_visible: false, email_visible: false, mobile_visible: false },
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
    uploadProfilePhoto: ReturnType<typeof vi.fn>;
    removeProfilePhoto: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    profileService = {
      getProfile: vi.fn(() => of(profile)),
      getProfileOptions: vi.fn(() => of(options)),
      updateProfile: vi.fn(() => of(profile)),
      acknowledgeProfileReview: vi.fn(() => of({ review_required: false })),
      uploadProfilePhoto: vi.fn(() => of(profile)),
      removeProfilePhoto: vi.fn(() => of(profile)),
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
      community: { bio: 'A short bio', directory_visible: false, email_visible: false, mobile_visible: false },
      skills: [],
      interests: [],
    }));
    expect(profileService.updateProfile.mock.calls[0][0]).not.toHaveProperty('membership');
  });

  it('keeps Connect privacy flags independent and presents discoverability context', () => {
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    component.form.controls.community.controls.directory_visible.setValue(true);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(element.textContent).toContain('Make my profile discoverable');
    expect(element.textContent).toContain('Before you save');
    component.form.controls.community.controls.email_visible.setValue(true);
    component.form.controls.community.controls.mobile_visible.setValue(true);
    component.form.controls.community.controls.directory_visible.setValue(false);
    expect(component.form.controls.community.value).toEqual(expect.objectContaining({ directory_visible: false, email_visible: true, mobile_visible: true }));
  });

  it('does not acknowledge when PATCH fails', () => {
    profileService.updateProfile.mockReturnValue(throwError(() => ({ status: 400, body: { detail: 'Invalid profile' } })));
    fixture.componentInstance.save();
    expect(profileService.acknowledgeProfileReview).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saveError()).toContain('Invalid profile');
  });

  it('shows Upload photo without Remove photo when no photo exists', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Upload photo');
    expect(element.textContent).not.toContain('Remove photo');
  });

  it('validates client file type and exact 5 MiB boundary before upload', () => {
    const component = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('#photoInput') as HTMLInputElement;
    const invalid = new File(['x'], 'avatar.gif', { type: 'image/gif' });
    Object.defineProperty(input, 'files', { value: [invalid], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(component.photoError()).toContain('JPEG, PNG or WebP');
    expect(profileService.uploadProfilePhoto).not.toHaveBeenCalled();

    const boundary = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(boundary, 'size', { value: 5 * 1024 * 1024 });
    Object.defineProperty(input, 'files', { value: [boundary], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(profileService.uploadProfilePhoto).toHaveBeenCalledWith(boundary);
  });

  it('updates the profile after upload and removes it through the dedicated API', () => {
    const component = fixture.componentInstance;
    const uploaded = { ...profile, community: { ...profile.community, photo_url: 'https://example.test/photo.jpg?signature=temporary' } };
    profileService.uploadProfilePhoto.mockReturnValue(of(uploaded));
    const input = fixture.nativeElement.querySelector('#photoInput') as HTMLInputElement;
    const file = new File(['photo'], 'avatar.webp', { type: 'image/webp' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(component.profile()?.community.photo_url).toContain('signature=temporary');

    profileService.removeProfilePhoto.mockReturnValue(of({ ...profile, community: { ...profile.community, photo_url: null } }));
    component.removePhoto();
    expect(profileService.removeProfilePhoto).toHaveBeenCalledOnce();
    expect(component.profile()?.community.photo_url).toBeNull();
  });

  it('shows Change and Remove for an existing photo and preserves it when upload fails', () => {
    const component = fixture.componentInstance;
    const currentPhoto = 'https://example.test/current.jpg?signature=temporary';
    component.profile.set({ ...profile, community: { ...profile.community, photo_url: currentPhoto } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Change photo');
    expect(fixture.nativeElement.textContent).toContain('Remove photo');

    profileService.uploadProfilePhoto.mockReturnValue(throwError(() => ({ status: 400, body: { photo: ['Upload a valid image.'] } })));
    const input = fixture.nativeElement.querySelector('#photoInput') as HTMLInputElement;
    const file = new File(['photo'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(component.profile()?.community.photo_url).toBe(currentPhoto);
    expect(component.photoError()).toBe('Upload a valid image.');
  });
});
