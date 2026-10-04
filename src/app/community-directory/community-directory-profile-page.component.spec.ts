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
  relationship: { state: 'NO_RELATIONSHIP', connection_id: null, can_connect: true, can_accept: false, can_decline: false, can_remove: false },
};

describe('CommunityDirectoryProfilePageComponent', () => {
  let fixture: ComponentFixture<CommunityDirectoryProfilePageComponent>;
  let api: {
    getDirectoryProfile: ReturnType<typeof vi.fn>;
    sendConnectionRequest: ReturnType<typeof vi.fn>;
    acceptConnection: ReturnType<typeof vi.fn>;
    declineConnection: ReturnType<typeof vi.fn>;
    removeConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      getDirectoryProfile: vi.fn().mockReturnValue(of(detail)),
      sendConnectionRequest: vi.fn().mockReturnValue(of({ connection_id: 'connection-1', member: {} })),
      acceptConnection: vi.fn().mockReturnValue(of({ connection_id: 'connection-1', member: {} })),
      declineConnection: vi.fn().mockReturnValue(of({ connection_id: 'connection-1', member: {} })),
      removeConnection: vi.fn().mockReturnValue(of(void 0)),
    };
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

  it('shows Connect only when the backend permits it and refreshes after sending', () => {
    const button = fixture.nativeElement.querySelector('.connection-action') as HTMLButtonElement;
    expect(button?.textContent).toContain('Connect');
    api.getDirectoryProfile.mockReturnValue(of({ ...detail, relationship: { ...detail.relationship, state: 'OUTGOING_PENDING', can_connect: false } }));
    button.click();
    fixture.detectChanges();
    expect(api.sendConnectionRequest).toHaveBeenCalledWith('member-1');
    expect(api.getDirectoryProfile).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Request sent');
  });

  it('renders incoming accept and decline actions from backend permissions', () => {
    api.getDirectoryProfile.mockReturnValue(of({ ...detail, relationship: { state: 'INCOMING_PENDING', connection_id: 'connection-1', can_connect: false, can_accept: true, can_decline: true, can_remove: false } }));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    const buttons = [...fixture.nativeElement.querySelectorAll('.connection-action')] as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Accept', 'Decline']);
    buttons[0].click();
    expect(api.acceptConnection).toHaveBeenCalledWith('connection-1');
    expect(api.getDirectoryProfile).toHaveBeenCalledTimes(3);
  });

  it('renders Connected and confirms before removing an authorised connection', () => {
    api.getDirectoryProfile.mockReturnValue(of({ ...detail, relationship: { state: 'CONNECTED', connection_id: 'connection-1', can_connect: false, can_accept: false, can_decline: false, can_remove: true }, contact: { email: 'connected@example.test', mobile: null } }));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Connected');
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    (fixture.nativeElement.querySelector('button.secondary-action') as HTMLButtonElement).click();
    expect(confirmation).toHaveBeenCalledWith('Remove this connection?');
    expect(api.removeConnection).not.toHaveBeenCalled();
    confirmation.mockReturnValue(true);
    (fixture.nativeElement.querySelector('button.secondary-action') as HTMLButtonElement).click();
    expect(api.removeConnection).toHaveBeenCalledWith('connection-1');
    confirmation.mockRestore();
  });

  it('keeps mutation failures generic and handles throttling without exposing backend details', () => {
    api.sendConnectionRequest.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'rate internals' } })));
    fixture.componentInstance.sendConnectionRequest();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('short pause');
    expect(fixture.nativeElement.textContent).not.toContain('rate internals');
  });
});
