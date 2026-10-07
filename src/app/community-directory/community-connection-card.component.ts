import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DirectoryMember } from '../api/community-api.service';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';

export type ConnectionCardMode = 'connection' | 'incoming' | 'outgoing';

@Component({
  selector: 'app-community-connection-card',
  imports: [ProfileAvatarComponent, RouterLink],
  templateUrl: './community-connection-card.component.html',
  styleUrl: './community-connection-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityConnectionCardComponent {
  readonly member = input.required<DirectoryMember>();
  readonly mode = input.required<ConnectionCardMode>();
  readonly connectionId = input.required<string>();
  readonly loadingAction = input<'accept' | 'decline' | null>(null);
  readonly compact = input(false);
  readonly returnQueryParams = input<Record<string, string> | null>(null);
  readonly accept = output<string>();
  readonly decline = output<string>();

  initials(): string {
    const member = this.member();
    return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  }

  profileQueryParams(): Record<string, string> {
    if (this.returnQueryParams()) return this.returnQueryParams()!;
    return this.mode() === 'connection'
      ? { from: 'connections' }
      : { from: 'requests', direction: this.mode() === 'incoming' ? 'incoming' : 'outgoing' };
  }
}
