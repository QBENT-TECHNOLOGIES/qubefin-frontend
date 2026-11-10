import { IGroupWiseLoanSearchParam } from '../models/group-wise-loan';

/// The query string of the group wise loan search, shared by the service and the store's httpResource so both
/// build the same url. designationId is in the path, so it is not repeated here.
export function buildGroupWiseLoanQuery(search: IGroupWiseLoanSearchParam): string {
  const queryParams = new URLSearchParams({
    collectionDate: search.collectionDate,
    pageIndex: search.pageIndex.toString(),
    pageSize: search.pageSize.toString(),
  });

  if (search.bcGroupId) queryParams.set('bcGroupId', search.bcGroupId);
  if (search.searchText) queryParams.set('searchText', search.searchText);
  if (search.isClosed !== null) queryParams.set('isClosed', search.isClosed.toString());
  if (search.sortOn) queryParams.set('sortOn', search.sortOn);
  if (search.sortDirection) queryParams.set('sortDirection', search.sortDirection);

  return queryParams.toString();
}
