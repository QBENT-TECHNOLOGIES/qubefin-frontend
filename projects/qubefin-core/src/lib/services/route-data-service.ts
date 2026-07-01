import { Injectable, signal } from "@angular/core";
import { RouteMeta } from "../types/route-meta";

@Injectable({
    providedIn: "root",
})
export class RouteDataService {
    routeData = signal<RouteMeta>({ title: '', subTitle: '', icon: '' });

    setRouteData(data: RouteMeta) {
        this.routeData.set(data);
    }
}