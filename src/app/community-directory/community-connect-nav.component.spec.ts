import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { CommunityConnectNavComponent } from './community-connect-nav.component';

describe('CommunityConnectNavComponent', () => {
  let fixture: ComponentFixture<CommunityConnectNavComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityConnectNavComponent],
      providers: [provideRouter([
        { path: 'community/directory', component: CommunityConnectNavComponent },
        { path: 'community/directory/connections', component: CommunityConnectNavComponent },
        { path: 'community/directory/requests', component: CommunityConnectNavComponent },
      ])],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityConnectNavComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('renders semantic keyboard-reachable Connect sections and marks the active route', async () => {
    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Discover', 'My Connections', 'Requests']);
    expect(links.every((link) => link.getAttribute('href'))).toBe(true);

    await router.navigateByUrl('/community/directory/requests');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.active')?.textContent?.trim()).toBe('Requests');
    expect(fixture.nativeElement.querySelector('a.active')?.getAttribute('aria-current')).toBe('page');
  });
});
