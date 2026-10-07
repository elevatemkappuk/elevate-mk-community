import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityPostDetailPageComponent } from './community-post-detail-page.component';

const detail = {
  public_id: 'post-1', purpose: 'UPDATE' as const, headline: 'A long-form update', body: 'Full body\nwith line breaks.', audience: 'CONNECTIONS' as const,
  author: { directory_id: null, first_name: 'Amina', last_name: 'Zulu', photo_url: null, professional: { job_title: '', industry: null }, location: '' },
  created_at: '2026-10-07T10:00:00Z', updated_at: '2026-10-07T10:00:00Z', edited_at: '2026-10-07T11:00:00Z', reply_count: 0, is_own_post: false,
};

describe('CommunityPostDetailPageComponent', () => {
  let fixture: ComponentFixture<CommunityPostDetailPageComponent>;
  let api: { getCommunityPost: ReturnType<typeof vi.fn> };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityPostDetailPageComponent],
      providers: [provideRouter([]), { provide: CommunityApiService, useValue: api }, { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'post-1' } } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityPostDetailPageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => { api = { getCommunityPost: vi.fn(() => of(detail)) }; });

  it('loads the public post id and renders the full body without reply UI', async () => {
    await create();
    expect(api.getCommunityPost).toHaveBeenCalledWith('post-1');
    expect(fixture.nativeElement.textContent).toContain('Full body\nwith line breaks.');
    expect(fixture.nativeElement.textContent).toContain('MY CONNECTIONS');
    expect(fixture.nativeElement.textContent).toContain('Edited');
    expect(fixture.nativeElement.textContent).not.toContain('Reply to');
    expect(fixture.nativeElement.textContent).not.toContain('email');
  });

  it('uses a generic unavailable state for inaccessible details', async () => {
    api.getCommunityPost.mockReturnValue(throwError(() => ({ status: 404, body: { detail: 'private reason' } })));
    await create();
    expect(fixture.nativeElement.textContent).toContain('POST UNAVAILABLE');
    expect(fixture.nativeElement.textContent).not.toContain('private reason');
  });
});
