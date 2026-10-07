import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, CommunityPostPage } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityFeedPageComponent } from './community-feed-page.component';

const post = (id: string, purpose: 'ASK' | 'OFFER' = 'ASK') => ({
  public_id: id, purpose, headline: 'Looking for useful advice', body: 'A helpful community post.', audience: 'ELEVATE_COMMUNITY' as const,
  author: { directory_id: 'member-1', first_name: 'Amina', last_name: 'Zulu', photo_url: null, professional: { job_title: 'Founder', industry: { slug: 'technology', label: 'Technology' } }, location: 'Milton Keynes' },
  created_at: '2026-10-07T10:00:00Z', updated_at: '2026-10-07T10:00:00Z', edited_at: null, reply_count: 3, is_own_post: false,
});

describe('CommunityFeedPageComponent', () => {
  let fixture: ComponentFixture<CommunityFeedPageComponent>;
  let api: { getCommunityPosts: ReturnType<typeof vi.fn> };
  const page = (results = [post('post-1')]): CommunityPostPage => ({ count: results.length, next: null, previous: null, results });

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityFeedPageComponent],
      providers: [provideRouter([]), { provide: CommunityApiService, useValue: api }, { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityFeedPageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => { api = { getCommunityPosts: vi.fn(() => of(page())) }; });

  it('loads and presents safe post identity and labels without contact fields', async () => {
    await create();
    const text = fixture.nativeElement.textContent;
    expect(api.getCommunityPosts).toHaveBeenCalledWith({ purpose: undefined, page: 1 });
    expect(text).toContain('ASK');
    expect(text).toContain('ELEVATE COMMUNITY');
    expect(text).toContain('Amina Zulu');
    expect(text).toContain('Founder');
    expect(text).toContain('3 replies');
    expect(text).not.toContain('email');
    expect(fixture.nativeElement.querySelector('a[href="/community/directory/member-1"]')).not.toBeNull();
  });

  it('maps purpose filters to page one and appends load-more results once', async () => {
    api.getCommunityPosts.mockImplementation(({ purpose, page: pageNumber }: { purpose?: string; page?: number }) => of(pageNumber === 1 ? page([post('post-1', purpose === 'OFFER' ? 'OFFER' : 'ASK')]) : { ...page([post('post-2')]), next: null }));
    await create();
    const offer = [...fixture.nativeElement.querySelectorAll('.purpose-filters button')].find((button) => button.textContent?.trim() === 'OFFERS') as HTMLButtonElement;
    offer.click();
    fixture.detectChanges();
    expect(api.getCommunityPosts).toHaveBeenLastCalledWith({ purpose: 'OFFER', page: 1 });
    api.getCommunityPosts.mockReturnValue(of({ ...page([post('post-2')]), next: 'next' }));
    fixture.componentInstance['hasNext'].set(true);
    fixture.componentInstance['page'].set(1);
    fixture.componentInstance.loadMore();
    expect(api.getCommunityPosts).toHaveBeenLastCalledWith({ purpose: 'OFFER', page: 2 });
  });

  it('shows contextual empty and safe retry states', async () => {
    api.getCommunityPosts.mockReturnValue(of(page([])));
    await create();
    expect(fixture.nativeElement.textContent).toContain('NO COMMUNITY POSTS YET');
    api.getCommunityPosts.mockReturnValue(throwError(() => ({ status: 500, body: { detail: 'internal detail' } })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t load Community right now');
    expect(fixture.nativeElement.textContent).not.toContain('internal detail');
  });
});
