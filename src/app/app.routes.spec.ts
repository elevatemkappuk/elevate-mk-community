import { JoinPageComponent } from './join-page/join-page.component';
import { JoinSuccessPageComponent } from './join-success/join-success-page.component';
import { ActivatePageComponent } from './activate-page/activate-page.component';
import { CommunityProfilePageComponent } from './community-profile/community-profile-page.component';
import { CommunityProfileEditPageComponent } from './community-profile-edit/community-profile-edit-page.component';
import { CommunityDirectoryPageComponent } from './community-directory/community-directory-page.component';
import { CommunityDirectoryProfilePageComponent } from './community-directory/community-directory-profile-page.component';
import { SignInPageComponent } from './sign-in-page/sign-in-page.component';
import { CommunityEmailChangeVerifyPageComponent } from './community-email-change-verify/community-email-change-verify-page.component';
import { routes } from './app.routes';

describe('Community routes', () => {
  it('keeps Join and exposes the dedicated success route', () => {
    expect(routes.find((route) => route.path === 'join')?.component).toBe(JoinPageComponent);
    expect(routes.find((route) => route.path === 'join/success')?.component).toBe(JoinSuccessPageComponent);
    expect(routes.find((route) => route.path === 'sign-in')?.component).toBe(SignInPageComponent);
    expect(routes.find((route) => route.path === 'sign-in')?.canActivate?.length).toBe(1);
  });

  it('exposes activation and guarded Community routes', async () => {
    expect(routes.find((route) => route.path === 'activate/:invitationId/:token')?.component).toBe(ActivatePageComponent);
    expect(routes.find((route) => route.path === 'community/account/verify-email/:requestId/:token')?.component).toBe(CommunityEmailChangeVerifyPageComponent);
    expect(routes.find((route) => route.path === 'community/account/verify-email/:requestId/:token')?.canActivate).toBeUndefined();
    expect(await routes.find((route) => route.path === 'community')?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community')?.canActivate?.length).toBe(1);
    expect(await routes.find((route) => route.path === 'community/community')?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/community')?.canActivate?.length).toBe(1);
    expect(await routes.find((route) => route.path === 'community/community/post/new')?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/community/post/new')?.canActivate?.length).toBe(1);
    expect(await routes.find((route) => route.path === 'community/community/post/:postId')?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/community/post/:postId')?.canActivate?.length).toBe(1);
    expect(routes.find((route) => route.path === 'community/profile')?.component).toBe(CommunityProfilePageComponent);
    expect(routes.find((route) => route.path === 'community/profile')?.canActivate?.length).toBe(1);
    expect(routes.find((route) => route.path === 'community/profile/edit')?.component).toBe(CommunityProfileEditPageComponent);
    expect(await routes.find((route) => route.path === 'community/account')?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/profile/edit')?.canActivate?.length).toBe(1);
    expect(routes.find((route) => route.path === 'community/directory')?.component).toBe(CommunityDirectoryPageComponent);
    expect(routes.find((route) => route.path === 'community/directory')?.canActivate?.length).toBe(1);
    const connectionsRoute = routes.find((route) => route.path === 'community/directory/connections');
    expect(await connectionsRoute?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/directory/connections')?.canActivate?.length).toBe(1);
    const requestsRoute = routes.find((route) => route.path === 'community/directory/requests');
    expect(await requestsRoute?.loadComponent?.()).toBeTruthy();
    expect(routes.find((route) => route.path === 'community/directory/requests')?.canActivate?.length).toBe(1);
    expect(routes.findIndex((route) => route.path === 'community/directory/requests')).toBeLessThan(routes.findIndex((route) => route.path === 'community/directory/:directoryId'));
    expect(routes.find((route) => route.path === 'community/directory/:directoryId')?.component).toBe(CommunityDirectoryProfilePageComponent);
    expect(routes.find((route) => route.path === 'community/directory/:directoryId')?.canActivate?.length).toBe(1);
  });
});
