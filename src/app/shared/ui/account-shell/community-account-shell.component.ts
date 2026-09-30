import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

import { CommunityHeaderComponent } from '../community-header/community-header.component';

@Component({
  selector: 'app-community-account-shell',
  imports: [CommunityHeaderComponent],
  templateUrl: './community-account-shell.component.html',
  styleUrl: './community-account-shell.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityAccountShellComponent {
  readonly heroVariant = input<'image' | 'editorial'>('editorial');
  readonly showSignIn = input(false);
}
