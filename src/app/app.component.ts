import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { CoreService } from './core/core.service';
import { SystemMessages, TwitchAPI } from './api/twitch.api';
import { MessageType } from './core/types';
import { ReplaySubject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

type AuthFormStructure = {
    nick: string,
    password: string
}

type MainFormStructure = {
    channel: string,
    volume: number,
    pitch: number,
    rate: number
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
    private _authForm = new FormGroup({
        nick: new FormControl(''),
        password: new FormControl('')
    });
    private _mainForm = new FormGroup({
        channel: new FormControl(''),
        volume: new FormControl(100),
        pitch: new FormControl(50),
        rate: new FormControl(10)
    });
    private _authorization = false;
    private _isAuthorized = false;
    private _lastConnection = '';
    private twitchAPI = new TwitchAPI();
    private destroy$ = new ReplaySubject<void>(1);

    constructor(private core: CoreService, cd: ChangeDetectorRef) {
        this.twitchAPI.messages$.pipe(
            filter((message) => message.type === MessageType.System),
            takeUntil(this.destroy$)
        ).subscribe((systemMessage) => {
            switch (systemMessage.text) {
                case SystemMessages.LoggedIn:
                    this._isAuthorized = true;
                    this._authorization = false;

                    break;
                case SystemMessages.LoggedOut:
                    this._isAuthorized = false;
                    this._authorization = false;

                    break;
                case SystemMessages.ConnectionSuccess:
                    this._lastConnection = `Успешное подключение к каналу: ${systemMessage.name}`;

                    break;
            }

            cd.markForCheck();
        });

        this.core.addAPI('twitch', this.twitchAPI);
    }

    ngOnInit() {
        this._mainForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((mainFormValues: MainFormStructure) => {
            const volume = mainFormValues.volume / 100;
            const pitch = mainFormValues.pitch / 100;
            const rate = mainFormValues.rate / 100;

            if (this.core.speaker.volume !== volume) {
                this.core.speaker.volume = mainFormValues.volume / 100;
            }

            if (this.core.speaker.pitch !== pitch) {
                this.core.speaker.pitch = mainFormValues.pitch / 50;
            }

            if (this.core.speaker.rate !== rate) {
                this.core.speaker.rate = mainFormValues.rate / 10;
            }
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get authForm() {
        return this._authForm;
    }

    get mainForm() {
        return this._mainForm;
    }

    get isAuthorized() {
        return this._isAuthorized;
    }

    get lastConnection() {
        return this._lastConnection;
    }

    get authorization() {
        return this._authorization;
    }

    get mainFormValues(): MainFormStructure {
        return this._mainForm.getRawValue();
    }

    logIn() {
        const formValue: AuthFormStructure = this._authForm.getRawValue();

        this._authorization = true;
        this.twitchAPI.logIn(formValue.nick, formValue.password);
    }

    logOut() {
        this.twitchAPI.logOut();
    }

    join() {
        const formValue: MainFormStructure = this._mainForm.getRawValue();

        this.twitchAPI.join(formValue.channel);
    }

    setDefaultSettings() {
        this._mainForm.patchValue({
            volume: 100,
            pitch: 50,
            rate: 10
        })
    }

    skipMessage() {
        this.core.speaker.cancel();
    }
}
