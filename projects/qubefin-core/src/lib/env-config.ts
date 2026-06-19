import { Inject, Injectable, InjectionToken } from "@angular/core";

export const ENV_CONFIG = new InjectionToken<any>("ENV_CONFIG");

@Injectable({
    providedIn: "root",
})
export class EnvConfig {
    
    private config: any;

    constructor(@Inject(ENV_CONFIG) config: any) {
        this.config = config;
    }

    getGatewayPath = (): string => this.config.gatewayPath;
}
