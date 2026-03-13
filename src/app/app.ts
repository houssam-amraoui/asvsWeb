import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, Requirement, RequirementSection, VerificationItem } from './data.service';

type VerificationStatus = 'PASS' | 'FAIL' | 'N/A' | '';

interface ComplianceStats {
  total: number;
  passed: number;
  failed: number;
  notApplicable: number;
  unselected: number;
  applicable: number;
  score: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  asvsName = '';
  asvsVersion = '';
  requirements: Requirement[] = [];
  selectedRequirement?: Requirement;
  isLoading = true;
  errorMessage = '';

  constructor(
    private readonly dataService: DataService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dataService.getAsvsData().subscribe({
      next: (data) => {
        this.asvsName = `${data.ShortName} - ${data.Name}`;
        this.asvsVersion = data.Version;
        this.requirements = data.Requirements;
        this.selectedRequirement = data.Requirements[0];
        this.ensureItemStatuses();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage =
          'Unable to load ASVS data from src/assets/result.json. Please verify the file exists and is included in angular.json assets.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectRequirement(requirement: Requirement): void {
    this.selectedRequirement = requirement;
    this.ensureItemStatuses();
  }

  setStatus(item: VerificationItem, status: 'PASS' | 'FAIL' | 'N/A'): void {
    item.status = status;
  }

  get overallStats(): ComplianceStats {
    return this.computeStats(this.requirements.flatMap((requirement) => requirement.Items));
  }

  get selectedRequirementStats(): ComplianceStats {
    const sections = this.selectedRequirement?.Items ?? [];
    return this.computeStats(sections);
  }

  get unselectedItems(): VerificationItem[] {
    return (this.selectedRequirement?.Items ?? [])
      .flatMap((section) => section.Items)
      .filter((item) => item.status === '');
  }

  private computeStats(sections: RequirementSection[]): ComplianceStats {
    const counters: ComplianceStats = {
      total: 0,
      passed: 0,
      failed: 0,
      notApplicable: 0,
      unselected: 0,
      applicable: 0,
      score: 0
    };

    sections.forEach((section) => {
      section.Items.forEach((item) => {
        counters.total += 1;

        const status: VerificationStatus = item.status ?? '';

        if (status === 'PASS') {
          counters.passed += 1;
          counters.applicable += 1;
        } else if (status === 'FAIL') {
          counters.failed += 1;
          counters.applicable += 1;
        } else if (status === 'N/A') {
          counters.notApplicable += 1;
        } else {
          counters.unselected += 1;
        }
      });
    });

    counters.score = counters.applicable > 0 ? Math.round((counters.passed / counters.applicable) * 100) : 0;

    return counters;
  }

  private ensureItemStatuses(): void {
    this.selectedRequirement?.Items.forEach((section) => {
      section.Items.forEach((item) => {
        item.status = item.status ?? '';
      });
    });
  }
}
