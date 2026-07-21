import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
    providedIn: 'root',
})
export class PageService {

    httpClient = inject(HttpClient);

    getByUrl(url: string) {
        return this.httpClient.get(`${ApiPaths.APP}/menus/${encodeURIComponent(url)}`);
    }
}
