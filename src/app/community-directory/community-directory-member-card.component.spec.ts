import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DirectoryMember, DirectoryRelationship } from '../api/community-api.service';
import { CommunityDirectoryMemberCardComponent } from './community-directory-member-card.component';

const member: DirectoryMember = {
  directory_id: 'member-1', photo_url: null, first_name: 'Amina', last_name: 'Zulu', location: 'Milton Keynes',
  professional: { job_title: 'Product lead', company: 'Elevate', industry: null }, skills: [], interests: [],
  relationship: { state: 'NO_RELATIONSHIP', connection_id: null, can_connect: true, can_accept: false, can_decline: false, can_remove: false },
};

describe('CommunityDirectoryMemberCardComponent', () => {
  let fixture: ComponentFixture<CommunityDirectoryMemberCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDirectoryMemberCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityDirectoryMemberCardComponent);
  });

  const cases: Array<[DirectoryRelationship, string]> = [
    [{ state: 'CONNECTED', connection_id: 'connection-1', can_connect: false, can_accept: false, can_decline: false, can_remove: true }, 'Connected'],
    [{ state: 'OUTGOING_PENDING', connection_id: 'connection-1', can_connect: false, can_accept: false, can_decline: false, can_remove: false }, 'Request sent'],
    [{ state: 'INCOMING_PENDING', connection_id: 'connection-1', can_connect: false, can_accept: true, can_decline: true, can_remove: false }, 'Respond to request'],
    [{ state: 'NO_RELATIONSHIP', connection_id: null, can_connect: true, can_accept: false, can_decline: false, can_remove: false }, 'Available to connect'],
  ];

  it.each(cases)('renders the backend relationship state as %s', (relationship, label) => {
    fixture.componentRef.setInput('member', { ...member, relationship });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.member-relationship')?.textContent).toContain(label);
    expect(fixture.nativeElement.querySelector('.member-relationship button')).toBeNull();
  });

  it('does not suggest Connect for a non-connectable member', () => {
    fixture.componentRef.setInput('member', { ...member, relationship: { ...member.relationship, can_connect: false } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.member-relationship')).toBeNull();
  });
});
