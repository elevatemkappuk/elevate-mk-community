import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, DirectoryPage } from '../api/community-api.service';
import { CommunityProfileService } from '../api/community-profile.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityDirectoryPageComponent } from './community-directory-page.component';

const options = {
  industries: [{ slug: 'technology', label: 'Technology' }],
  career_stages: [],
  skills: [{ slug: 'strategy', label: 'Strategy' }],
  interests: [{ slug: 'networking', label: 'Networking' }],
};

const page: DirectoryPage = {
  count: 1,
  next: null,
  previous: null,
  results: [{
    directory_id: '11111111-1111-1111-1111-111111111111',
    photo_url: null,
    first_name: 'Amina',
    last_name: 'Zulu',
    location: 'Milton Keynes',
    professional: { job_title: 'Designer', company: 'Elevate MK', industry: { slug: 'technology', label: 'Technology' } },
    skills: [{ slug: 'strategy', label: 'Strategy' }],
    interests: [{ slug: 'networking', label: 'Networking' }],
    relationship: { state: 'NO_RELATIONSHIP', connection_id: null, can_connect: true, can_accept: false, can_decline: false, can_remove: false },
  }],
};

describe('CommunityDirectoryPageComponent', () => {
  let fixture: ComponentFixture<CommunityDirectoryPageComponent>;
  let directory: { getDirectory: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    directory = { getDirectory: vi.fn(() => of(page)) };
    await TestBed.configureTestingModule({
      imports: [CommunityDirectoryPageComponent],
      providers: [
        { provide: CommunityApiService, useValue: directory },
        { provide: CommunityProfileService, useValue: { getProfileOptions: () => of(options) } },
        { provide: CommunityAuthService, useValue: { logout: () => of(void 0) } },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ q: 'ama', industry: 'technology', page: '2' })) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityDirectoryPageComponent);
    fixture.detectChanges();
  });

  it('restores URL-backed state and renders API list data without contact fields', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.searchControl.value).toBe('ama');
    expect(fixture.componentInstance.filterForm.controls.industry.value).toBe('technology');
    expect(fixture.componentInstance.page()).toBe(2);
    expect(element.textContent).toContain('Amina Zulu');
    expect(element.textContent).toContain('Strategy');
    expect(element.textContent).toContain('Active filters');
    expect(element.textContent).toContain('Industry: Technology');
    expect(element.querySelector('.clear-search')?.getAttribute('aria-label')).toBe('Clear name or location search');
    expect(element.querySelector('.active-filters')?.getAttribute('role')).toBe('region');
    expect(element.textContent).not.toContain('ada@example.com');
    expect(element.querySelector('app-profile-avatar')).not.toBeNull();
  });

  it('derives removable structured filters from the selected taxonomy options', () => {
    expect(fixture.componentInstance.activeStructuredFilters()).toEqual([
      { key: 'industry', label: 'Industry', valueLabel: 'Technology' },
    ]);
    fixture.componentInstance.clearFilter('industry');
    expect(fixture.componentInstance.filterForm.controls.industry.value).toBe('');
  });

  it('shows a safe empty state and member-friendly throttling error', () => {
    directory.getDirectory.mockReturnValueOnce(of({ count: 0, next: null, previous: null, results: [] }));
    fixture = TestBed.createComponent(CommunityDirectoryPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No members match');

    directory.getDirectory.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'technical detail' } })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('taking a short pause');
    expect(fixture.nativeElement.textContent).not.toContain('technical detail');
  });
});
