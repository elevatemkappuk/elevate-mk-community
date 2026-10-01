import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-community-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './community-header.component.html',
  styleUrl: './community-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHeaderComponent {
  readonly showSignIn = input(true);
  readonly layout = input<'default' | 'activation'>('default');
  readonly authenticated = input(false);
  readonly signingOut = input(false);
  readonly signOut = output<void>();
}
