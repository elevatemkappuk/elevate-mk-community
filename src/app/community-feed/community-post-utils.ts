import { CommunityPostAudience, CommunityPostPurpose } from '../api/community-api.service';

export function purposeLabel(purpose: CommunityPostPurpose): string {
  return { ASK: 'ASK', OFFER: 'OFFER', OPPORTUNITY: 'OPPORTUNITY', UPDATE: 'UPDATE' }[purpose];
}

export function audienceLabel(audience: CommunityPostAudience): string {
  return audience === 'CONNECTIONS' ? 'MY CONNECTIONS' : 'ELEVATE COMMUNITY';
}

export function relativePostTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
