import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-community-connect-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="connect-secondary-nav" aria-label="Connect sections">
      <a routerLink="/community/directory" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-current]="(discoverLink.isActive ? 'page' : null)" #discoverLink="routerLinkActive">Discover</a>
      <a routerLink="/community/directory/connections" routerLinkActive="active" [attr.aria-current]="(connectionsLink.isActive ? 'page' : null)" #connectionsLink="routerLinkActive">My Connections</a>
      <a routerLink="/community/directory/requests" routerLinkActive="active" [attr.aria-current]="(requestsLink.isActive ? 'page' : null)" #requestsLink="routerLinkActive">Requests</a>
    </nav>
  `,
  styleUrl: './community-connect-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityConnectNavComponent {}
