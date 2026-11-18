export interface IImportRowError {
  row: number;
  column: string;
  value: string | null;
  message: string;
}

export interface IImportJobResult {
  jobId: string;
  status: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: IImportRowError[];
}
