import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityApiService, ConnectionPage, DirectoryMember } from '../api/community-api.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityConnectionsPageComponent } from './community-connections-page.component';

const member: DirectoryMember = {
  directory_id: 'member-1', photo_url: null, first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes',
  professional: { job_title: 'Product lead', company: 'Elevate', industry: { slug: 'technology', label: 'Technology' } },
  skills: [], interests: [],
};

const connectionsPage: ConnectionPage<{ connection_id: string; member: DirectoryMember }> = {
  count: 1, next: null, previous: null, results: [{ connection_id: 'connection-1', member }],
};

describe('CommunityConnectionsPageComponent', () => {
  let fixture: ComponentFixture<CommunityConnectionsPageComponent>;
  let api: {
    getConnections: ReturnType<typeof vi.fn>;
    getConnectionRequests: ReturnType<typeof vi.fn>;
    acceptConnection: ReturnType<typeof vi.fn>;
    declineConnection: ReturnType<typeof vi.fn>;
  };
  let routeMode: 'connections' | 'requests';
  let queryParams: Record<string, string>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CommunityConnectionsPageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityApiService, useValue: api },
        { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } },
        { provide: ActivatedRoute, useValue: {
          snapshot: { data: { section: routeMode } },
          queryParamMap: of(convertToParamMap(queryParams)),
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityConnectionsPageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    routeMode = 'connections';
    queryParams = {};
    api = {
      getConnections: vi.fn(() => of(connectionsPage)),
      getConnectionRequests: vi.fn(() => of({ count: 0, next: null, previous: null, results: [] })),
      acceptConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
      declineConnection: vi.fn(() => of({ connection_id: 'connection-1', member })),
    };
  });

  it('renders My Connections cards without contact details and uses the URL page', async () => {
    queryParams = { page: '2' };
    api.getConnections.mockReturnValue(of({ ...connectionsPage, next: 'next', previous: 'previous', count: 26 }));
    await createComponent();
    expect(api.getConnections).toHaveBeenCalledWith(2);
    expect(fixture.nativeElement.textContent).toContain('Amina Zulu');
    expect(fixture.nativeElement.textContent).toContain('View profile');
    expect(fixture.nativeElement.textContent).not.toContain('@');
    expect(fixture.nativeElement.textContent).not.toContain('Mobile');
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
    expect(fixture.nativeElement.querySelector('a[href*="/community/directory/member-1"]')).not.toBeNull();
  });

  it('renders the empty connections state with a discover action', async () => {
    api.getConnections.mockReturnValue(of({ count: 0, next: null, previous: null, results: [] }));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('No connections yet');
    expect(fixture.nativeElement.textContent).toContain('Discover members');
  });

  it('loads incoming requests by default and refreshes after Accept', async () => {
    routeMode = 'requests';
    api.getConnectionRequests
      .mockReturnValueOnce(of({ count: 1, next: null, previous: null, results: [{ connection_id: 'connection-1', state: 'INCOMING_PENDING', requested_at: '2026-10-01T10:00:00Z', member }] }))
      .mockReturnValueOnce(of({ count: 0, next: null, previous: null, results: [] }));
    await createComponent();
    expect(api.getConnectionRequests).toHaveBeenCalledWith('incoming', 1);
    expect(fixture.nativeElement.textContent).toContain('Accept');
    expect(fixture.nativeElement.textContent).toContain('Decline');
    (fixture.nativeElement.querySelector('.request-actions button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(api.acceptConnection).toHaveBeenCalledWith('connection-1');
    expect(api.getConnectionRequests).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('No incoming requests');
  });

  it('renders sent requests with Request sent and no request actions', async () => {
    routeMode = 'requests';
    queryParams = { direction: 'outgoing' };
    api.getConnectionRequests.mockReturnValue(of({ count: 1, next: null, previous: null, results: [{ connection_id: 'connection-1', state: 'OUTGOING_PENDING', requested_at: '2026-10-01T10:00:00Z', member }] }));
    await createComponent();
    expect(api.getConnectionRequests).toHaveBeenCalledWith('outgoing', 1);
    expect(fixture.nativeElement.textContent).toContain('Request sent');
    expect(fixture.nativeElement.textContent).not.toContain('Accept');
    expect(fixture.nativeElement.textContent).not.toContain('Decline');
    expect(fixture.nativeElement.textContent).not.toContain('Cancel');
  });

  it('keeps list failures generic, including throttling', async () => {
    api.getConnections.mockReturnValue(throwError(() => ({ status: 429, body: { detail: 'internal throttle detail' } })));
    await createComponent();
    expect(fixture.nativeElement.textContent).toContain('short pause');
    expect(fixture.nativeElement.textContent).not.toContain('internal throttle detail');
  });
});
