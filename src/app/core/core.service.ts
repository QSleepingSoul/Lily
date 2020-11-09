import { Injectable, OnDestroy } from '@angular/core';
import { IAPI, APIMessage, APIMessages, isIChatAPI, MessageType } from "./types";
import { Speaker } from "./speaker";
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { mergeMap, map, takeUntil, filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class CoreService implements OnDestroy {
    private apis = new Map<string, IAPI>();
    private apiMessagesSubject$ = new Subject<APIMessages>();
    private _apiMessages$: Observable<APIMessage>;
    private destroy$ = new ReplaySubject<void>(1);
    private _speaker: Speaker;

    constructor() {
        this._apiMessages$ = this.apiMessagesSubject$.pipe(
            mergeMap((apiMessages) => apiMessages.messages$.pipe(
                filter((message) => message.type === MessageType.User),
                map((message) => {
                    return { apiName: apiMessages.apiName, message };
                }))
            ),
            takeUntil(this.destroy$)
        );
        this._apiMessages$.subscribe();

        this._speaker = new Speaker(this._apiMessages$);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get apiMessages$() {
        return this._apiMessages$;
    }

    get speaker() {
        return this._speaker;
    }

    addAPI(name: string, api: IAPI) {
        if (this.apis.has(name)) {
            this.removeAPI(name);
        }

        if (isIChatAPI(api)) {
            api.messages$.pipe(takeUntil(this.destroy$)).subscribe({
                complete: () => {
                    this.apis.delete(name);
                }
            });

            this.apiMessagesSubject$.next({ apiName: name, messages$: api.messages$ });
        }

        this.apis.set(name, api);
    }

    hasAPI(name: string) {
        return this.apis.has(name);
    }

    removeAPI(name: string) {
        const api = this.apis.get(name);

        if (api) {
            api.complete();

            this.apis.delete(name);
        }
    }
}
