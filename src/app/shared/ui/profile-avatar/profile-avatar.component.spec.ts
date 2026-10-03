import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileAvatarComponent } from './profile-avatar.component';

describe('ProfileAvatarComponent', () => {
  let fixture: ComponentFixture<ProfileAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProfileAvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProfileAvatarComponent);
    fixture.componentInstance.initials = 'AZ';
    fixture.componentInstance.altText = "Amina Zulu's profile photo";
  });

  it('renders initials when no photo URL is supplied', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AZ');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('renders a photo with useful alt text when available', () => {
    fixture.componentInstance.photoUrl = 'https://example.test/photo.jpg?signature=temporary';
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.alt).toBe("Amina Zulu's profile photo");
    expect(image.src).toContain('https://example.test/photo.jpg');
  });

  it('marks the hero variant without changing the default avatar API', () => {
    fixture.componentInstance.size = 'hero';
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('profile-avatar--hero')).toBe(true);
    expect(fixture.nativeElement.querySelector('.profile-avatar').classList.contains('profile-avatar--hero')).toBe(true);
  });

  it('supports a compact card variant without changing the hero footprint', () => {
    fixture.componentRef.setInput('size', 'compact');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('profile-avatar--compact')).toBe(true);
    expect(fixture.nativeElement.querySelector('.profile-avatar').classList.contains('profile-avatar--compact')).toBe(true);
  });

  it('falls back to initials when the signed image fails without clearing the URL', () => {
    fixture.componentInstance.photoUrl = 'https://example.test/photo.jpg?signature=temporary';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AZ');
    expect(fixture.componentInstance.photoUrl).toContain('signature=temporary');
  });
});
