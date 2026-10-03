import { ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges, SimpleChanges, signal } from '@angular/core';

@Component({
  selector: 'app-profile-avatar',
  templateUrl: './profile-avatar.component.html',
  styleUrl: './profile-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileAvatarComponent implements OnChanges {
  @Input() photoUrl: string | null = null;
  @Input() initials = '';
  @Input() altText = 'Profile photo';
  @Input() size: 'default' | 'hero' = 'default';

  @HostBinding('class.profile-avatar--hero')
  get isHero(): boolean {
    return this.size === 'hero';
  }

  readonly imageFailed = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['photoUrl']) this.imageFailed.set(false);
  }

  onImageError(): void {
    this.imageFailed.set(true);
  }

  get showPhoto(): boolean {
    return Boolean(this.photoUrl) && !this.imageFailed();
  }
}
