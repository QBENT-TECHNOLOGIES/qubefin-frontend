import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { CreateMenuResponse, MenuField, SaveRoleMenuRequest } from '../models/menu';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  httpClient = inject(HttpClient);

  create(menu: MenuField) {
    return this.httpClient.post<CreateMenuResponse>(`${ApiPaths.APP}/menus`, menu);
  }

  update(id: string, menu: MenuField) {
    return this.httpClient.put(`${ApiPaths.APP}/menus/${id}`, menu);
  }

  saveRoleMenuPermissions(payload: SaveRoleMenuRequest) {
    return this.httpClient.put(`${ApiPaths.APP}/menus/role`, payload);
  }
}
