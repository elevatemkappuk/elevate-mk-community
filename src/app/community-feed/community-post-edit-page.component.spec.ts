import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { CommunityApiService } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityPostEditPageComponent } from './community-post-edit-page.component';

const editablePost = {
  public_id: 'post-1', purpose: 'ASK' as const, headline: 'Original headline', body: 'Original body', audience: 'ELEVATE_COMMUNITY' as const,
  author: { directory_id: null, first_name: 'Amina', last_name: 'Zulu', photo_url: null, professional: { job_title: '', industry: null }, location: '' },
  created_at: '2026-10-07T10:00:00Z', updated_at: '2026-10-07T10:00:00Z', edited_at: null, reply_count: 0, is_own_post: true,
  capabilities: { can_edit: true, can_delete: true, can_edit_purpose: true, can_edit_audience: true },
};

describe('CommunityPostEditPageComponent', () => {
  let fixture: ComponentFixture<CommunityPostEditPageComponent>;
  let api: { getCommunityPost: ReturnType<typeof vi.fn>; updateCommunityPost: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    api = { getCommunityPost: vi.fn(() => of(editablePost)), updateCommunityPost: vi.fn(() => of(editablePost)) };
    await TestBed.configureTestingModule({
      imports: [CommunityPostEditPageComponent],
      providers: [provideRouter([]), { provide: CommunityApiService, useValue: api }, { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'post-1' } } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityPostEditPageComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('loads the authoritative post and prepopulates editable fields', () => {
    expect(api.getCommunityPost).toHaveBeenCalledWith('post-1');
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({ purpose: 'ASK', headline: 'Original headline', body: 'Original body', audience: 'ELEVATE_COMMUNITY' });
    expect(fixture.nativeElement.querySelector('#edit-post-headline').value).toBe('Original headline');
  });

  it('submits only backend-authorized fields and navigates after success', () => {
    fixture.componentInstance.form.patchValue({ purpose: 'OFFER', headline: 'Updated headline', body: 'Updated body', audience: 'CONNECTIONS' });
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.save();
    expect(api.updateCommunityPost).toHaveBeenCalledWith('post-1', { purpose: 'OFFER', audience: 'CONNECTIONS', headline: 'Updated headline', body: 'Updated body' });
    expect(router.navigate).toHaveBeenCalledWith(['/community/community/post', 'post-1']);
  });

  it('locks purpose and audience from backend capabilities with clear copy', () => {
    api.getCommunityPost.mockReturnValue(of({ ...editablePost, capabilities: { can_edit: true, can_delete: true, can_edit_purpose: false, can_edit_audience: false } }));
    fixture.componentInstance['loadPost']('post-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Purpose locked');
    expect(fixture.nativeElement.textContent).toContain('Audience locked');
    expect(fixture.nativeElement.querySelectorAll('.purpose-option:disabled').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('.audience-options input:disabled').length).toBe(2);
  });

  it('prevents invalid and duplicate saves', () => {
    fixture.componentInstance.form.controls.headline.setValue('');
    fixture.componentInstance.save();
    fixture.componentInstance.save();
    expect(api.updateCommunityPost).not.toHaveBeenCalled();
  });
});
