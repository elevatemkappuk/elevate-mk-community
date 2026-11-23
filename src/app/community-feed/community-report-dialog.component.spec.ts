import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityReportDialogComponent } from './community-report-dialog.component';

describe('CommunityReportDialogComponent', () => {
  let fixture: ComponentFixture<CommunityReportDialogComponent>;
  let component: CommunityReportDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CommunityReportDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(CommunityReportDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('targetLabel', 'post');
    fixture.detectChanges();
  });

  it('renders every backend report reason as a keyboard-usable radio choice', () => {
    const radios = Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    expect(radios.map((radio) => radio.value)).toEqual(['OFF_TOPIC', 'SPAM_OR_EXCESSIVE_PROMOTION', 'INAPPROPRIATE_OR_ABUSIVE', 'MISLEADING_OR_SUSPICIOUS', 'OTHER']);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('emits a trimmed report payload with optional details', () => {
    const emitted: unknown[] = [];
    component.submitReport.subscribe((payload) => emitted.push(payload));
    component.reason.setValue('OTHER');
    component.details.setValue('  Needs review  ');
    component.submit();
    expect(emitted).toEqual([{ reason: 'OTHER', details: 'Needs review' }]);
  });

  it('does not submit an invalid or oversized report', () => {
    const emitted: unknown[] = [];
    component.submitReport.subscribe((payload) => emitted.push(payload));
    component.reason.setValue('OFF_TOPIC');
    component.details.setValue('x'.repeat(1001));
    component.submit();
    expect(emitted).toEqual([]);
  });
});
