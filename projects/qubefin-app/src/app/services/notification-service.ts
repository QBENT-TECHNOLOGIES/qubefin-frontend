import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly basePath = `${ApiPaths.GLOBAL}/notifications`;
  httpClient = inject(HttpClient);
  read(id: string) {
    return this.httpClient.get(`${this.basePath}/${id}/read`);
  }
  allRead() {
    return this.httpClient.get(`${this.basePath}/read-all`);
  }
}
