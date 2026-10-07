import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityAuthService } from './community-auth.service';

export interface IndustryOption {
  slug: string;
  label: string;
}

export interface DirectoryTaxonomyOption {
  slug: string;
  label: string;
}

export interface DirectoryMember {
  directory_id: string;
  photo_url: string | null;
  first_name: string;
  last_name: string;
  location: string;
  professional: {
    job_title: string;
    company: string;
    industry: DirectoryTaxonomyOption | null;
  };
  skills: DirectoryTaxonomyOption[];
  interests: DirectoryTaxonomyOption[];
  relationship?: DirectoryRelationship;
}

export type DirectoryRelationshipState = 'NO_RELATIONSHIP' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'CONNECTED';

export interface DirectoryRelationship {
  state: DirectoryRelationshipState;
  connection_id: string | null;
  can_connect: boolean;
  can_accept: boolean;
  can_decline: boolean;
  can_remove: boolean;
}

export interface ConnectionMutationResponse {
  connection_id: string;
  member: DirectoryMember;
}

export interface DirectoryDetail {
  directory_id: string;
  photo_url: string | null;
  first_name: string;
  last_name: string;
  location: string;
  bio: string;
  professional: {
    job_title: string;
    company: string;
    industry: DirectoryTaxonomyOption | null;
    career_stage: string | null;
    linkedin_url: string;
  };
  skills: DirectoryTaxonomyOption[];
  interests: DirectoryTaxonomyOption[];
  contact: { email: string | null; mobile: string | null };
  relationship: DirectoryRelationship;
}

export interface DirectoryPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: DirectoryMember[];
}

export interface ConnectionRecord {
  connection_id: string;
  member: DirectoryMember;
}

export interface ConnectionRequestRecord {
  connection_id: string;
  state: 'INCOMING_PENDING' | 'OUTGOING_PENDING';
  requested_at: string;
  member: DirectoryMember;
}

export interface ConnectionPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type CommunityPostPurpose = 'ASK' | 'OFFER' | 'OPPORTUNITY' | 'UPDATE';
export type CommunityPostAudience = 'ELEVATE_COMMUNITY' | 'CONNECTIONS';

export interface CommunityPostAuthor {
  directory_id: string | null;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  professional: { job_title: string; industry: DirectoryTaxonomyOption | null };
  location: string;
}

export interface CommunityPost {
  public_id: string;
  purpose: CommunityPostPurpose;
  headline: string;
  body: string;
  audience: CommunityPostAudience;
  author: CommunityPostAuthor;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  reply_count: number;
  is_own_post: boolean;
}

export interface CommunityPostPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: CommunityPost[];
}

export interface CommunityReplyingTo {
  reply_id: string;
  author: { directory_id: string | null; first_name: string; last_name: string } | null;
}

export interface CommunityReply {
  public_id: string;
  body: string;
  author: CommunityPostAuthor | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  is_own_reply: boolean;
  replying_to: CommunityReplyingTo | null;
}

export interface CommunityReplyPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: CommunityReply[];
}

export interface CommunityPostCreatePayload {
  purpose: CommunityPostPurpose;
  headline: string;
  body: string;
  audience: CommunityPostAudience;
}

export interface CommunityReplyCreatePayload { body: string; reply_to_id?: string | null; }
export interface CommunityReportPayload { reason: 'OFF_TOPIC' | 'SPAM_OR_EXCESSIVE_PROMOTION' | 'INAPPROPRIATE_OR_ABUSIVE' | 'MISLEADING_OR_SUSPICIOUS' | 'OTHER'; details?: string; }
export interface CommunityReportAcknowledgement { report_id: string; status: 'OPEN'; }

export interface CommunityPostQuery {
  purpose?: CommunityPostPurpose;
  page?: number;
}

export interface DirectoryQuery {
  q?: string;
  industry?: string;
  skill?: string;
  interest?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class CommunityApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly auth = inject(CommunityAuthService);

  getIndustries(): Observable<IndustryOption[]> {
    return this.http.get<IndustryOption[]>(`${this.apiConfig.apiBaseUrl}/community/industries/`);
  }

  getCommunityPosts(query: CommunityPostQuery = {}): Observable<CommunityPostPage> {
    let params = new HttpParams();
    if (query.purpose) params = params.set('purpose', query.purpose);
    if (query.page && query.page > 1) params = params.set('page', query.page);
    return this.http.get<CommunityPostPage>(`${this.apiConfig.apiBaseUrl}/community/posts/`, {
      params,
      withCredentials: true,
    });
  }

  getCommunityPost(publicId: string): Observable<CommunityPost> {
    return this.http.get<CommunityPost>(
      `${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(publicId)}/`,
      { withCredentials: true },
    );
  }

  createCommunityPost(payload: CommunityPostCreatePayload, idempotencyKey: string): Observable<CommunityPost> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityPost>(`${this.apiConfig.apiBaseUrl}/community/posts/`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey }, withCredentials: true,
      })),
    );
  }

  getCommunityReplies(postId: string, page = 1): Observable<CommunityReplyPage> {
    let params = new HttpParams();
    if (page > 1) params = params.set('page', page);
    return this.http.get<CommunityReplyPage>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/replies/`, { params, withCredentials: true });
  }

  createCommunityReply(postId: string, payload: CommunityReplyCreatePayload, idempotencyKey: string): Observable<CommunityReply> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityReply>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/replies/`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey }, withCredentials: true,
      })),
    );
  }

  editCommunityReply(postId: string, replyId: string, body: string): Observable<CommunityReply> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.patch<CommunityReply>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}/`, { body }, { withCredentials: true })),
    );
  }

  deleteCommunityReply(postId: string, replyId: string): Observable<void> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.delete<void>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}/`, { withCredentials: true })),
    );
  }

  reportCommunityPost(postId: string, payload: CommunityReportPayload): Observable<CommunityReportAcknowledgement> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityReportAcknowledgement>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/report/`, payload, { withCredentials: true })),
    );
  }

  reportCommunityReply(postId: string, replyId: string, payload: CommunityReportPayload): Observable<CommunityReportAcknowledgement> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityReportAcknowledgement>(`${this.apiConfig.apiBaseUrl}/community/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}/report/`, payload, { withCredentials: true })),
    );
  }

  getDirectory(query: DirectoryQuery = {}): Observable<DirectoryPage> {
    let params = new HttpParams();
    for (const key of ['q', 'industry', 'skill', 'interest'] as const) {
      const value = query[key]?.trim();
      if (value) params = params.set(key, value);
    }
    if (query.page && query.page > 1) params = params.set('page', query.page);
    if (query.page_size) params = params.set('page_size', query.page_size);

    return this.http.get<DirectoryPage>(`${this.apiConfig.apiBaseUrl}/community/directory/`, {
      params,
      withCredentials: true,
    });
  }

  getDirectoryProfile(directoryId: string): Observable<DirectoryDetail> {
    return this.http.get<DirectoryDetail>(
      `${this.apiConfig.apiBaseUrl}/community/directory/${encodeURIComponent(directoryId)}/`,
      { withCredentials: true },
    );
  }

  getConnections(page = 1): Observable<ConnectionPage<ConnectionRecord>> {
    let params = new HttpParams();
    if (page > 1) params = params.set('page', page);
    return this.http.get<ConnectionPage<ConnectionRecord>>(`${this.apiConfig.apiBaseUrl}/community/connections/`, {
      params,
      withCredentials: true,
    });
  }

  getConnectionRequests(direction: 'incoming' | 'outgoing', page = 1, pageSize?: number): Observable<ConnectionPage<ConnectionRequestRecord>> {
    let params = new HttpParams().set('direction', direction);
    if (page > 1) params = params.set('page', page);
    if (pageSize) params = params.set('page_size', pageSize);
    return this.http.get<ConnectionPage<ConnectionRequestRecord>>(`${this.apiConfig.apiBaseUrl}/community/connections/requests/`, {
      params,
      withCredentials: true,
    });
  }

  sendConnectionRequest(directoryId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/requests/`,
        { directory_id: directoryId },
        { withCredentials: true },
      )),
    );
  }

  acceptConnection(connectionId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/accept/`,
        {},
        { withCredentials: true },
      )),
    );
  }

  declineConnection(connectionId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/decline/`,
        {},
        { withCredentials: true },
      )),
    );
  }

  removeConnection(connectionId: string): Observable<void> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.delete<void>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/`,
        { withCredentials: true },
      )),
    );
  }
}
