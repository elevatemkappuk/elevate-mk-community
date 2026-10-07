import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { CommunityHeaderComponent } from './community-header.component';

@Component({ standalone: true, template: '' })
class RouteStubComponent {}

describe('CommunityHeaderComponent', () => {
  let fixture: ComponentFixture<CommunityHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHeaderComponent],
      providers: [provideRouter([
        { path: 'community', component: RouteStubComponent },
        { path: 'community/profile', component: RouteStubComponent },
      ])],
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

  it('marks Home active only for the exact Community route', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/community');
    fixture.detectChanges();
    const home = fixture.nativeElement.querySelector('.authenticated-nav a[href="/community"]') as HTMLAnchorElement;
    expect(home.classList.contains('active')).toBe(true);
    expect(home.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/community/profile');
    fixture.detectChanges();
    expect(home.classList.contains('active')).toBe(false);
    expect(home.getAttribute('aria-current')).toBeNull();
  });
});
