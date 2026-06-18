import { Injectable } from "@angular/core";
import { StorageTokens } from "../enums/storage-tokens";

@Injectable({
  providedIn: 'root'
})
export class PageStore {
    getPageState = (): string => sessionStorage.getItem(StorageTokens.PAGE_STATE_TOKEN) || '';

    setPageState = (state: string): void => sessionStorage.setItem(StorageTokens.PAGE_STATE_TOKEN, state);

    clearPageState = (): void => sessionStorage.removeItem(StorageTokens.PAGE_STATE_TOKEN);
}