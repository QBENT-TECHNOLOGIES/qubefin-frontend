import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { GeoTag, UpdateGeoTagRequest } from '../models/geo-tag';

@Injectable({ providedIn: 'root' })
export class GeoTagService {
  private readonly http = inject(HttpClient);

  update(geoTagId: string, req: UpdateGeoTagRequest) {
    return this.http.put<GeoTag>(`${ApiPaths.TRACKING}/geo-tags/${geoTagId}`, req);
  }
}
