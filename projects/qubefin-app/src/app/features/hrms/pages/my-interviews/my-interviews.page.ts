import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyInterviewsList } from '../../components/my-interviews/my-interviews-list/my-interviews-list';

@Component({
  selector: 'qfin-my-interviews-page',
  standalone: true,
  imports: [CommonModule, MyInterviewsList],
  template: `
    <div class="page-container">
        <div class="header-group">
            <div class="flex flex-col gap-1">
                <h1 class="text-xl font-semibold text-slate-800">My Interviews</h1>
                <p class="text-sm text-slate-500">View and manage panels you are invited to</p>
            </div>
        </div>
        <div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
            <qfin-my-interviews-list></qfin-my-interviews-list>
        </div>
    </div>
  `
})
export class MyInterviewsPage {
}
