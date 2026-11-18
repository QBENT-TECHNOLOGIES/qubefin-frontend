import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IImportJobResult } from '../models/import-job-result';
import { IImportType } from '../models/import-type';

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.IMPORT_ENGINE}`;

  getActiveImportTypes() {
    return this.httpClient.get<IImportType[]>(`${this.basePath}/import-types`);
  }

  uploadImport(formData: FormData) {
    return this.httpClient.post<IImportJobResult>(`${this.basePath}/import`, formData);
  }

  getImportJob(jobId: string) {
    return this.httpClient.get<IImportJobResult>(`${this.basePath}/import-jobs/${jobId}`);
  }
}
