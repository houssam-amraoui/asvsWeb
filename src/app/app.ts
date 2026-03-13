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

interface PersistedItemState {
  status: VerificationStatus;
  comment?: string;
  tool_used?: string;
  source_code_reference?: string;
}

interface PersistedSelectionState {
  selectedRequirementShortcode?: string;
  items: Record<string, PersistedItemState>;
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
  private readonly storageKey = 'asvs-selection-state-v1';

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
        this.applyPersistedState();
        this.selectedRequirement = this.resolveSelectedRequirement() ?? data.Requirements[0];
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
    this.persistSelectionState();
  }

  setStatus(item: VerificationItem, status: 'PASS' | 'FAIL' | 'N/A'): void {
    item.status = status;
    this.persistSelectionState();
  }

  onItemUpdated(): void {
    this.persistSelectionState();
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

  private resolveSelectedRequirement(): Requirement | undefined {
    const state = this.getPersistedState();
    if (!state?.selectedRequirementShortcode) {
      return undefined;
    }

    return this.requirements.find((requirement) => requirement.Shortcode === state.selectedRequirementShortcode);
  }

  private applyPersistedState(): void {
    const state = this.getPersistedState();
    if (!state) {
      return;
    }

    this.requirements.forEach((requirement) => {
      requirement.Items.forEach((section) => {
        section.Items.forEach((item) => {
          const persistedItem = state.items[item.id];
          if (!persistedItem) {
            return;
          }

          item.status = persistedItem.status ?? '';
          item.comment = persistedItem.comment;
          item.tool_used = persistedItem.tool_used;
          item.source_code_reference = persistedItem.source_code_reference;
        });
      });
    });
  }

  private persistSelectionState(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const items: Record<string, PersistedItemState> = {};

    this.requirements.forEach((requirement) => {
      requirement.Items.forEach((section) => {
        section.Items.forEach((item) => {
          items[item.id] = {
            status: item.status ?? '',
            comment: item.comment,
            tool_used: item.tool_used,
            source_code_reference: item.source_code_reference
          };
        });
      });
    });

    const state: PersistedSelectionState = {
      selectedRequirementShortcode: this.selectedRequirement?.Shortcode,
      items
    };

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private getPersistedState(): PersistedSelectionState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const rawState = localStorage.getItem(this.storageKey);
    if (!rawState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(rawState) as PersistedSelectionState;
      return {
        selectedRequirementShortcode: parsedState.selectedRequirementShortcode,
        items: parsedState.items ?? {}
      };
    } catch {
      return null;
    }
  }
}
