import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, ConnectionRequestRecord, DirectoryMember } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityHomePageComponent } from './community-home-page.component';

const member: DirectoryMember = {
  directory_id: 'member-1', photo_url: null, first_name: 'Helen', last_name: 'Amoako', location: 'Milton Keynes',
  professional: { job_title: 'CEO', company: 'Example', industry: null }, skills: [], interests: [],
};

const request = (id: string): ConnectionRequestRecord => ({
  connection_id: `connection-${id}`, state: 'INCOMING_PENDING', requested_at: '2026-10-04T10:00:00Z',
  member: { ...member, directory_id: `member-${id}`, first_name: id === '1' ? 'Helen' : 'Another', last_name: 'Member' },
});

describe('CommunityHomePageComponent', () => {
  let fixture: ComponentFixture<CommunityHomePageComponent>;
  let api: {
    getConnectionRequests: ReturnType<typeof vi.fn>;
    acceptConnection: ReturnType<typeof vi.fn>;
    declineConnection: ReturnType<typeof vi.fn>;
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityHomePageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityAuthService, useValue: { currentUser: vi.fn(() => ({ id: 1, first_name: 'Amina', last_name: 'Zulu' })), logout: vi.fn(() => of(void 0)) } },
        { provide: CommunityApiService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityHomePageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    api = {
      getConnectionRequests: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
      acceptConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
      declineConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
    };
  });

  it('loads only a small authoritative incoming preview without blocking Home', async () => {
    api.getConnectionRequests.mockReturnValue(of({ count: 5, next: 'next', previous: null, results: [request('1'), request('2'), request('3'), request('4')] }));
    await createComponent();
    expect(api.getConnectionRequests).toHaveBeenCalledWith('incoming', 1, 3);
    expect(fixture.nativeElement.textContent).toContain('Welcome, Amina.');
    expect(fixture.nativeElement.querySelectorAll('app-community-connection-card').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain('example.test');
    expect(fixture.nativeElement.textContent).not.toContain('connection-1');
    expect(fixture.nativeElement.querySelector('a[href*="/community/directory/requests"]')).not.toBeNull();
  });

  it('omits the request section when there are no incoming requests', async () => {
    await createComponent();
    expect(fixture.nativeElement.querySelector('.home-requests')).toBeNull();
  });

  it('accepts a request once and refreshes the authoritative preview', async () => {
    api.getConnectionRequests
      .mockReturnValueOnce(of({ count: 1, next: null, previous: null, results: [request('1')] }))
      .mockReturnValueOnce(of({ count: 0, next: null, previous: null, results: [] }));
    await createComponent();
    const button = fixture.nativeElement.querySelector('.request-actions button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(api.acceptConnection).toHaveBeenCalledWith('connection-1');
    expect(api.acceptConnection).toHaveBeenCalledOnce();
    expect(api.getConnectionRequests).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.home-requests')).toBeNull();
  });

  it('declines a request and keeps it visible when the mutation fails', async () => {
    api.getConnectionRequests.mockReturnValue(of({ count: 1, next: null, previous: null, results: [request('1')] }));
    api.declineConnection.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'internal detail' } })));
    await createComponent();
    const button = fixture.nativeElement.querySelectorAll('.request-actions button')[1] as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(api.declineConnection).toHaveBeenCalledWith('connection-1');
    expect(fixture.nativeElement.textContent).toContain('Helen Member');
    expect(fixture.nativeElement.textContent).toContain('short pause');
    expect(fixture.nativeElement.textContent).not.toContain('internal detail');
  });
});
