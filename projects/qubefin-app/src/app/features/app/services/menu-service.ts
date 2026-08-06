import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { Menu, MenuField } from '../models/menu';

@Injectable({
    providedIn: 'root',
})
export class MenuService {

    httpClient = inject(HttpClient);

    create(menu: MenuField) {
        return this.httpClient.post(`${ApiPaths.APP}/menus`, menu);
    }

    update(id: string, menu: MenuField) {
        return this.httpClient.put(`${ApiPaths.APP}/menus/${menu.id}`, menu);
    }
}
