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
    const backLink = fixture.nativeElement.querySelector('.back-link') as HTMLAnchorElement;
    expect(backLink.textContent).toContain('Back to Connect');
    expect(backLink.href).toContain('q=Amina');
    expect(backLink.href).toContain('page=2');
    expect(fixture.nativeElement.textContent).not.toContain('directory_visible');
    expect(fixture.nativeElement.textContent).not.toContain('email_visible');
    expect(fixture.nativeElement.textContent).not.toContain('member-1');
  });

  it('renders mobile contact when returned and omits contact when both values are null', () => {
    api.getDirectoryProfile.mockReturnValueOnce(of({ ...detail, contact: { email: 'amina@example.test', mobile: '+447700900123' } }));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="tel:+447700900123"]')).not.toBeNull();

    api.getDirectoryProfile.mockReturnValueOnce(of({ ...detail, contact: { email: null, mobile: null } }));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Connect directly');
  });

  it('shows a generic unavailable state for a missing profile', () => {
    api.getDirectoryProfile.mockReturnValueOnce(throwError(() => ({ status: 404, body: null })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("This member profile isn't available.");
    expect(fixture.nativeElement.textContent).not.toContain('member-1');
  });

  it('keeps retry errors generic and handles throttling safely', () => {
    api.getDirectoryProfile.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'technical detail' } })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('taking a short pause');
    expect(fixture.nativeElement.textContent).not.toContain('technical detail');

    api.getDirectoryProfile.mockReturnValue(throwError(() => ({ status: 500, body: { detail: 'internal detail' } })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('couldn’t load this profile');
    expect(fixture.nativeElement.textContent).not.toContain('internal detail');
  });
});
