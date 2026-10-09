import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { CommunityApiService } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityPostCreatePageComponent } from './community-post-create-page.component';

describe('CommunityPostCreatePageComponent', () => {
  let fixture: ComponentFixture<CommunityPostCreatePageComponent>;
  let api: { createCommunityPost: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    api = { createCommunityPost: vi.fn(() => of({ public_id: 'post-123' })) };
    await TestBed.configureTestingModule({
      imports: [CommunityPostCreatePageComponent],
      providers: [provideRouter([]), { provide: CommunityApiService, useValue: api }, { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityPostCreatePageComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('presents all four purpose choices and defaults to the Community audience', () => {
    expect(fixture.nativeElement.textContent).toContain('ASK');
    expect(fixture.nativeElement.textContent).toContain('OFFER');
    expect(fixture.nativeElement.textContent).toContain('OPPORTUNITY');
    expect(fixture.nativeElement.textContent).toContain('UPDATE');
    expect(fixture.nativeElement.textContent).toContain('Keep it useful to the community.');
    expect(fixture.componentInstance.form.controls.audience.value).toBe('ELEVATE_COMMUNITY');
    expect(fixture.nativeElement.querySelector('input[value="ELEVATE_COMMUNITY"]:checked')).toBeTruthy();
  });

  it('keeps an invalid post from submitting and publishes the explicit payload after valid input', async () => {
    fixture.componentInstance.selectPurpose('ASK');
    fixture.componentInstance.form.patchValue({ headline: 'Need a design introduction', body: 'Looking for advice from members with experience in this area.', audience: 'CONNECTIONS' });
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.publish();
    expect(api.createCommunityPost).toHaveBeenCalledWith({ purpose: 'ASK', headline: 'Need a design introduction', body: 'Looking for advice from members with experience in this area.', audience: 'CONNECTIONS' }, expect.any(String));
    expect(router.navigate).toHaveBeenCalledWith(['/community/community/post', 'post-123']);
  });
});
