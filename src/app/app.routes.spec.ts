import { JoinPageComponent } from './join-page/join-page.component';
import { JoinSuccessPageComponent } from './join-success/join-success-page.component';
import { routes } from './app.routes';

describe('Community routes', () => {
  it('keeps Join and exposes the dedicated success route', () => {
    expect(routes.find((route) => route.path === 'join')?.component).toBe(JoinPageComponent);
    expect(routes.find((route) => route.path === 'join/success')?.component).toBe(JoinSuccessPageComponent);
  });
});
