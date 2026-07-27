import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ILeaveRequestItem, ILeaveRequestListItem } from '../models/leave-request';

@Injectable({
  providedIn: 'root',
})
export class LeaveRequestStore {
  private readonly basePath = `${ApiPaths.HRMS }/leave-requests`;

  
  private readonly leaveRequestId = signal<string | undefined>(undefined);

  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('fromDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly leaveRequestsResource = httpResource<{
    items: ILeaveRequestListItem[];
    totalCount: number;
  }>(() => {
    const search = encodeURIComponent(this.searchQuery());
    return `${this.basePath}?searchText=${search}&sortOn=${this.sortOn()}&sortDirection=${this.sortDirection()}&pageIndex=${this.pageIndex()}&pageSize=${this.pageSize()}`;
  });

  readonly leaveRequests = computed(() =>
    (this.leaveRequestDemoList ?? []).map((item) => this.normalizeListItem(item))
  );
  readonly totalRecords = computed(
    () => this.leaveRequestDemoList.length ?? 0
  );
  private readonly _loading = signal(false);
  private readonly _error = signal<unknown>(null);

  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  // readonly leaveRequests = computed(() =>
  //   (this.leaveRequestsResource.value()?.items ?? []).map((item) => this.normalizeListItem(item))
  // );

  // readonly totalRecords = computed(
  //   () => this.leaveRequestsResource.value()?.totalCount ?? 0
  // );

  // readonly loading = computed(() => this.leaveRequestsResource.isLoading());
  // readonly error = computed(() => this.leaveRequestsResource.error());

  readonly leaveRequestResource = httpResource<ILeaveRequestItem>(() => {
    const id = this.leaveRequestId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  
  readonly leaveRequest = computed(() => {
    const item = this.leaveRequestDemoItem;
    return item ? this.normalizeItem(item) : undefined;
  });


  readonly leaveRequestLoading = computed(() => this._loading());
  readonly leaveRequestError = computed(() => this._error());
  
  // readonly leaveRequest = computed(() => {
  //   const item = this.leaveRequestResource.value();
  //   return item ? this.normalizeItem(item) : undefined;
  // });
  
  // readonly leaveRequestLoading = computed(() => this.leaveRequestResource.isLoading());
  // readonly leaveRequestError = computed(() => this.leaveRequestResource.error());

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
    this.leaveRequestsResource.reload();
  }

  setLeaveRequestId(id: string | undefined) {
    if (this.leaveRequestId() !== id) {
      this.leaveRequestId.set(id);
    }
  }

  refreshDetail() {
    this.leaveRequestResource.reload();
  }

  private normalizeListItem(item: ILeaveRequestListItem): ILeaveRequestListItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    };
  }

  private normalizeItem(item: ILeaveRequestItem): ILeaveRequestItem {
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

  
  
  public leaveRequestDemoList: ILeaveRequestListItem[] = [
  {
    id: '9d8a8c64-3d7d-4f2d-9d12-6f5a9c8b1234',
    leaveType: 'Casual Leave',
    fromDate: new Date('2026-08-10'),
    toDate: new Date('2026-08-12'),
    days: 3,
    status: 'Pending',
  },
  {
    id: '3b1d6e28-c8fd-45e2-a5db-9cfa4e7f1111',
    leaveType: 'Sick Leave',
    fromDate: new Date('2026-07-18'),
    toDate: new Date('2026-07-19'),
    days: 2,
    status: 'Approved',
  },
  {
    id: '7e0a94b2-8b4c-4d59-9c7a-2d0ef4d92222',
    leaveType: 'Earned Leave',
    fromDate: new Date('2026-09-01'),
    toDate: new Date('2026-09-05'),
    days: 5,
    status: 'Approved',
  },
  {
    id: '5c4f66d1-3e9a-4fb2-8b5d-8ef43f833333',
    leaveType: 'Maternity Leave',
    fromDate: new Date('2026-10-01'),
    toDate: new Date('2027-01-28'),
    days: 120,
    status: 'Approved',
  },
  {
    id: '8f31e5d3-1b0d-42a0-a0d2-4df50f1f4444',
    leaveType: 'Casual Leave',
    fromDate: new Date('2026-08-28'),
    toDate: new Date('2026-08-28'),
    days: 1,
    status: 'Rejected',
  }
];
public leaveRequestDemoItem: ILeaveRequestItem = {
  id: '9d8a8c64-3d7d-4f2d-9d12-6f5a9c8b1234',
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
    },
    {
      event: 'Viewed by Manager',
      eventBy: 'Jane Smith',
      date: new Date('2026-07-26T09:15:00')
    }
  ]
};
}
