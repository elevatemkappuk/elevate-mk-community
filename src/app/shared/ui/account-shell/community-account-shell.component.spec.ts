import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityAccountShellComponent } from './community-account-shell.component';

@Component({
  standalone: true,
  imports: [CommunityAccountShellComponent],
  template: `<app-community-account-shell heroVariant="editorial"><div account-hero>Hero content</div><div account-form>Form content</div></app-community-account-shell>`,
})
class ShellHostComponent {}

describe('CommunityAccountShellComponent', () => {
  let fixture: ComponentFixture<ShellHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ShellHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(ShellHostComponent);
    fixture.detectChanges();
  });

  it('renders projected hero and form content with the shared header', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-community-header')).toBeTruthy();
    expect(element.querySelector('.account-shell-hero')?.textContent).toContain('Hero content');
    expect(element.querySelector('.account-shell-form-panel')?.textContent).toContain('Form content');
  });
});
