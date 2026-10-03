import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, DirectoryDetail } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityDirectoryProfilePageComponent } from './community-directory-profile-page.component';

const detail: DirectoryDetail = {
  directory_id: 'member-1', photo_url: null, first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes', bio: 'Community builder',
  professional: { job_title: 'Product lead', company: 'Elevate', industry: { slug: 'technology', label: 'Technology' }, career_stage: 'senior', linkedin_url: 'https://linkedin.com/in/amina' },
  skills: [{ slug: 'strategy', label: 'Strategy' }], interests: [{ slug: 'networking', label: 'Networking' }], contact: { email: 'amina@example.test', mobile: null },
};

describe('CommunityDirectoryProfilePageComponent', () => {
  let fixture: ComponentFixture<CommunityDirectoryProfilePageComponent>;
  let api: { getDirectoryProfile: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { getDirectoryProfile: vi.fn().mockReturnValue(of(detail)) };
    await TestBed.configureTestingModule({
      imports: [CommunityDirectoryProfilePageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityApiService, useValue: api },
        { provide: CommunityAuthService, useValue: { logout: vi.fn().mockReturnValue(of({})) } },
        { provide: ActivatedRoute, useValue: {
          snapshot: { paramMap: convertToParamMap({ directoryId: 'member-1' }) },
          queryParamMap: of(convertToParamMap({ q: 'Amina', page: '2' })),
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityDirectoryProfilePageComponent);
    fixture.detectChanges();
  });

  it('renders the composed member profile and contact fields', () => {
    expect(fixture.nativeElement.textContent).toContain('Amina Zulu');
    expect(fixture.nativeElement.textContent).toContain('Community builder');
    expect(fixture.nativeElement.textContent).toContain('Strategy');
    expect(fixture.nativeElement.querySelector('a[href="mailto:amina@example.test"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Back to Connect');
  });

  it('shows a generic unavailable state for a missing profile', () => {
    api.getDirectoryProfile.mockReturnValueOnce(throwError(() => ({ status: 404, body: null })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("This member profile isn't available.");
    expect(fixture.nativeElement.textContent).not.toContain('member-1');
  });
});
