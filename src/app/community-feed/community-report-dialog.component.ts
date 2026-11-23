import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, output, input, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommunityReportPayload } from '../api/community-api.service';

@Component({
  selector: 'app-community-report-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './community-report-dialog.component.html',
  styleUrl: './community-report-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityReportDialogComponent implements OnInit {
  readonly targetLabel = input.required<string>();
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly submitReport = output<CommunityReportPayload>();
  readonly close = output<void>();
  readonly reason = new FormControl<CommunityReportPayload['reason'] | ''>('', { nonNullable: true, validators: Validators.required });
  readonly details = new FormControl('', { nonNullable: true, validators: Validators.maxLength(1000) });
  readonly detailsInput = viewChild<ElementRef<HTMLTextAreaElement>>('detailsInput');
  readonly submitted = false;

  ngOnInit(): void { setTimeout(() => this.detailsInput()?.nativeElement.focus()); }

  @HostListener('document:keydown.escape') onEscape(): void { this.close.emit(); }
  submit(): void {
    if (this.reason.invalid || this.details.invalid) { this.reason.markAsTouched(); this.details.markAsTouched(); return; }
    if (this.submitting()) return;
    this.submitReport.emit({ reason: this.reason.value as CommunityReportPayload['reason'], details: this.details.value.trim() || undefined });
  }
}
