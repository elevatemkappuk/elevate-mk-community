import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityPostDetailPageComponent } from './community-post-detail-page.component';

const detail = {
  public_id: 'post-1', purpose: 'UPDATE' as const, headline: 'A long-form update', body: 'Full body\nwith line breaks.', audience: 'CONNECTIONS' as const,
  author: { directory_id: null, first_name: 'Amina', last_name: 'Zulu', photo_url: null, professional: { job_title: '', industry: null }, location: '' },
  created_at: '2026-10-07T10:00:00Z', updated_at: '2026-10-07T10:00:00Z', edited_at: '2026-10-07T11:00:00Z', reply_count: 0, is_own_post: false,
  capabilities: { can_edit: false, can_delete: false, can_edit_purpose: false, can_edit_audience: false },
};

describe('CommunityPostDetailPageComponent', () => {
  let fixture: ComponentFixture<CommunityPostDetailPageComponent>;
  let api: { getCommunityPost: ReturnType<typeof vi.fn>; getCommunityReplies: ReturnType<typeof vi.fn>; createCommunityReply: ReturnType<typeof vi.fn>; deleteCommunityPost: ReturnType<typeof vi.fn> };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityPostDetailPageComponent],
      providers: [provideRouter([]), { provide: CommunityApiService, useValue: api }, { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'post-1' } } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityPostDetailPageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => { api = { getCommunityPost: vi.fn(() => of(detail)), getCommunityReplies: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })), createCommunityReply: vi.fn(() => of({ public_id: 'reply-3', body: 'A useful response', author: null, created_at: '2026-10-07T10:03:00Z', updated_at: '2026-10-07T10:03:00Z', edited_at: null, is_own_reply: true, replying_to: null })), deleteCommunityPost: vi.fn(() => of(void 0)) }; });

  it('loads the public post id and renders the full body without reply UI', async () => {
    await create();
    expect(api.getCommunityPost).toHaveBeenCalledWith('post-1');
    expect(api.getCommunityReplies).toHaveBeenCalledWith('post-1', 1);
    expect(fixture.nativeElement.textContent).toContain('Full body\nwith line breaks.');
    expect(fixture.nativeElement.textContent).toContain('MY CONNECTIONS');
    expect(fixture.nativeElement.textContent).toContain('Edited');
    expect(fixture.nativeElement.textContent).not.toContain('Reply to');
    expect(fixture.nativeElement.textContent).not.toContain('email');
  });

  it('renders a flat conversation and submits a reply with its reply target', async () => {
    api.getCommunityReplies.mockReturnValue(of({ count: 2, next: null, previous: null, results: [
      { public_id: 'reply-1', body: 'First reply', author: { directory_id: null, first_name: 'James', last_name: 'Carter', photo_url: null, professional: { job_title: 'Designer', industry: null }, location: '' }, created_at: '2026-10-07T10:01:00Z', updated_at: '2026-10-07T10:01:00Z', edited_at: null, is_own_reply: false, replying_to: null },
      { public_id: 'reply-2', body: 'Second reply', author: { directory_id: null, first_name: 'Amina', last_name: 'Zulu', photo_url: null, professional: { job_title: '', industry: null }, location: '' }, created_at: '2026-10-07T10:02:00Z', updated_at: '2026-10-07T10:02:00Z', edited_at: null, is_own_reply: true, replying_to: { public_id: 'reply-1', author: { first_name: 'James', last_name: 'Carter' } } },
    ] }));
    await create();
    expect(fixture.nativeElement.textContent).toContain('First reply');
    expect(fixture.nativeElement.textContent).toContain('Replying to James Carter');
    fixture.componentInstance.replyTo.set(fixture.componentInstance.replies()[0]);
    fixture.componentInstance.replyBody.setValue('A useful response');
    fixture.componentInstance.submitReply();
    expect(api.getCommunityReplies).toHaveBeenCalledWith('post-1', 1);
    expect(api.createCommunityReply).toHaveBeenCalledWith('post-1', { body: 'A useful response', reply_to_id: 'reply-1' }, expect.any(String));
  });

  it('does not fabricate post edit/delete controls when the backend exposes no post mutations', async () => {
    await create();
    expect(fixture.nativeElement.textContent).not.toContain('Edit post');
    expect(fixture.nativeElement.textContent).not.toContain('Delete post');
  });

  it('uses a generic unavailable state for inaccessible details', async () => {
    api.getCommunityPost.mockReturnValue(throwError(() => ({ status: 404, body: { detail: 'private reason' } })));
    await create();
    expect(fixture.nativeElement.textContent).toContain('POST UNAVAILABLE');
    expect(fixture.nativeElement.textContent).not.toContain('private reason');
  });

  it('renders authoritative own-post edit/delete actions and never offers Report', async () => {
    api.getCommunityPost.mockReturnValue(of({ ...detail, is_own_post: true, capabilities: { can_edit: true, can_delete: true, can_edit_purpose: false, can_edit_audience: false } }));
    await create();
    expect(fixture.nativeElement.textContent).toContain('Edit');
    expect(fixture.nativeElement.textContent).toContain('Delete');
    expect(fixture.nativeElement.textContent).not.toContain('Report');
    expect(fixture.nativeElement.textContent).not.toContain('Reply to');
  });

  it('requires delete confirmation and navigates only after backend success', async () => {
    api.getCommunityPost.mockReturnValue(of({ ...detail, is_own_post: true, capabilities: { can_edit: false, can_delete: true, can_edit_purpose: false, can_edit_audience: false } }));
    await create();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const managementDelete = fixture.nativeElement.querySelector('.post-management-actions button') as HTMLButtonElement;
    managementDelete.click();
    fixture.detectChanges();
    expect(api.deleteCommunityPost).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Delete post?');
    const confirmation = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((button) => button.textContent?.trim() === 'Delete post') as HTMLButtonElement;
    confirmation.click();
    expect(api.deleteCommunityPost).toHaveBeenCalledWith('post-1');
    expect(router.navigate).toHaveBeenCalledWith(['/community/community']);
  });
});
