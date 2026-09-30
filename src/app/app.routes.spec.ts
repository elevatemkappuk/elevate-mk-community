import { JoinPageComponent } from './join-page/join-page.component';
import { JoinSuccessPageComponent } from './join-success/join-success-page.component';
import { ActivatePageComponent } from './activate-page/activate-page.component';
import { CommunityHomePageComponent } from './community-home/community-home-page.component';
import { routes } from './app.routes';

describe('Community routes', () => {
  it('keeps Join and exposes the dedicated success route', () => {
    expect(routes.find((route) => route.path === 'join')?.component).toBe(JoinPageComponent);
    expect(routes.find((route) => route.path === 'join/success')?.component).toBe(JoinSuccessPageComponent);
  });

  it('exposes activation and guarded Community routes', () => {
    expect(routes.find((route) => route.path === 'activate/:invitationId/:token')?.component).toBe(ActivatePageComponent);
    expect(routes.find((route) => route.path === 'community')?.component).toBe(CommunityHomePageComponent);
    expect(routes.find((route) => route.path === 'community')?.canActivate?.length).toBe(1);
  });
});
