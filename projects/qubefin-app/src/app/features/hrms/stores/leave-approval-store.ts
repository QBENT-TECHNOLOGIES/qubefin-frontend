import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ILeaveApprovalItem, ILeaveApprovalListItem } from '../models/leave-approval';

@Injectable({
  providedIn: 'root',
})
export class LeaveApprovalStore {
  private readonly basePath = `${ApiPaths.HRMS }/leave-approvals`;

  private readonly leaveApprovalId = signal<string | undefined>(undefined);

  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('fromDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly leaveApprovalsResource = httpResource<{
    items: ILeaveApprovalListItem[];
    totalCount: number;
  }>(() => {
    const search = encodeURIComponent(this.searchQuery());
    return `${this.basePath}?searchText=${search}&sortOn=${this.sortOn()}&sortDirection=${this.sortDirection()}&pageIndex=${this.pageIndex()}&pageSize=${this.pageSize()}`;
  });

  readonly leaveApprovals = computed(() =>
    (this.leaveApprovalDemoList ?? []).map((item) => this.normalizeListItem(item))
  );
  
  readonly totalRecords = computed(
    () => this.leaveApprovalDemoList.length ?? 0
  );
  
  private readonly _loading = signal(false);
  private readonly _error = signal<unknown>(null);

  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  readonly leaveApprovalResource = httpResource<ILeaveApprovalItem>(() => {
    const id = this.leaveApprovalId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  readonly leaveApproval = computed(() => {
    const item = this.leaveApprovalDemoItem;
    return item ? this.normalizeItem(item) : undefined;
  });

  readonly leaveApprovalLoading = computed(() => this._loading());
  readonly leaveApprovalError = computed(() => this._error());
  
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(items: number) {
    this.pageSize.set(items);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }

  refreshList() {
    this.leaveApprovalsResource.reload();
  }

  setLeaveApprovalId(id: string | undefined) {
    if (this.leaveApprovalId() !== id) {
      this.leaveApprovalId.set(id);
    }
  }

  refreshDetail() {
    this.leaveApprovalResource.reload();
  }

  private normalizeListItem(item: ILeaveApprovalListItem): ILeaveApprovalListItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    };
  }

  private normalizeItem(item: ILeaveApprovalItem): ILeaveApprovalItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
      auditInfo: item.auditInfo
        ? {
            ...item.auditInfo,
            createdOn: item.auditInfo.createdOn ? new Date(item.auditInfo.createdOn).toISOString() : '',
            lastModifiedOn: item.auditInfo.lastModifiedOn ? new Date(item.auditInfo.lastModifiedOn).toISOString() : undefined,
          }
        : null,
      history: item.history ? item.history.map(h => ({
        ...h,
        date: h.date ? new Date(h.date) : ''
      })) : []
    };
  }

  public leaveApprovalDemoList: ILeaveApprovalListItem[] = [
    {
      id: '9d8a8c64-3d7d-4f2d-9d12-6f5a9c8b1234',
      employeeName: 'John Doe',
      leaveType: 'Casual Leave',
      fromDate: new Date('2026-08-10'),
      toDate: new Date('2026-08-12'),
      status: 'Pending',
    },
    {
      id: '3b1d6e28-c8fd-45e2-a5db-9cfa4e7f1111',
      employeeName: 'Jane Smith',
      leaveType: 'Sick Leave',
      fromDate: new Date('2026-07-18'),
      toDate: new Date('2026-07-19'),
      status: 'Approved',
    }
  ];

  public leaveApprovalDemoItem: ILeaveApprovalItem = {
    id: '9d8a8c64-3d7d-4f2d-9d12-6f5a9c8b1234',
    employeeName: 'John Doe',
    leaveType: 'Casual Leave',
    fromDate: new Date('2026-08-10'),
    toDate: new Date('2026-08-12'),
    days: 3,
    status: 'Pending',
    reason: 'Family function outside the city.',
    address: 'Kolkata, West Bengal',
    documentUrl: null,
    auditInfo: {
      createdBy: 'John Doe',
      createdOn: '2026-07-25T10:30:00',
      lastModifiedBy: 'John Doe',
      lastModifiedOn: '2026-07-25T10:30:00'
    },
    history: [
      {
        event: 'Leave Request Created',
        eventBy: 'John Doe',
        date: new Date('2026-07-25T10:30:00')
      },
      {
        event: 'Submitted for Approval',
        eventBy: 'John Doe',
        date: new Date('2026-07-25T10:35:00')
      }
    ]
  };
}
