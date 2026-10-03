import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CommunityHeaderComponent } from './community-header.component';

describe('CommunityHeaderComponent', () => {
  let fixture: ComponentFixture<CommunityHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityHeaderComponent);
    fixture.componentRef.setInput('authenticated', true);
    fixture.detectChanges();
  });

  it('places Connect between Home and My Profile for authenticated members', () => {
    const links = [...fixture.nativeElement.querySelectorAll('.authenticated-nav a')] as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Home', 'Connect', 'My Profile']);
    expect(links[1].getAttribute('href')).toBe('/community/directory');
  });
});
