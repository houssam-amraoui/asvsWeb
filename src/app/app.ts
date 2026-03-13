import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, Requirement, VerificationItem } from './data.service';

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

  private ensureItemStatuses(): void {
    this.selectedRequirement?.Items.forEach((section) => {
      section.Items.forEach((item) => {
        item.status = item.status ?? '';
      });
    });
  }
}
