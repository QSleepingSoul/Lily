import { IChatAPI, Message, MessageType } from "../core/types";
import { webSocket, WebSocketSubjectConfig, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from "rxjs/internal/Observable";
import { filter, takeUntil } from "rxjs/operators";
import { Subject, ReplaySubject } from 'rxjs';

export enum SystemMessages {
    LoggedOut = 'LoggedOut',
    LoggedIn = 'LoggedIn',
    ConnectionSuccess = 'ConnectionSuccess',
    None = ''
}

export class TwitchAPI implements IChatAPI {
    private CONNECTION_CONFIG: WebSocketSubjectConfig<string> = {
        url: 'wss://irc-ws.chat.twitch.tv:443',
        protocol: 'irc',
        serializer: (message: string) => message,
        deserializer: (event: MessageEvent) => event.data
    };
    private socket$: WebSocketSubject<string>;
    private destroy$ = new ReplaySubject<void>(1);
    private messagesSubject$ = new Subject<Message>();
    private _messages$: Observable<Message>;

    constructor() {
        this._messages$ = this.messagesSubject$.pipe(
            filter((message) => {
                if (message.type === MessageType.User) {
                    return true;
                }

                if (message.type === MessageType.System) {
                    return message.text !== SystemMessages.None;
                }

                return false;
            }),
            takeUntil(this.destroy$)
        );
    }

    get messages$() {
        return this._messages$;
    }

    private parseSourceMessage(sourceMessage: string): Message | null {
        const splittedMessage = sourceMessage.split('PRIVMSG');
        const type = splittedMessage.length > 1 ? MessageType.User : MessageType.System;

        switch (type) {
            case MessageType.User:
                const name = splittedMessage[0].split('!')[0].substring(1).trim();
                const text = splittedMessage[1].split('#')[1].split(':')[1].trim();

                return {
                    type,
                    name,
                    text
                };
            case MessageType.System: return this.parseSystemMessage(splittedMessage[0]);
            default: return null;
        }
    }

    private parseSystemMessage(text: string): Message | null {
        if (text.startsWith('PING :tmi.twitch.tv')) {
            this.socket$.next(`PONG :tmi.twitch.tv`);
        } else if (text.startsWith(':tmi.twitch.tv NOTICE * :Invalid NICK') ||
            text.startsWith(':tmi.twitch.tv NOTICE * :Login authentication failed') ||
            text.startsWith(':tmi.twitch.tv NOTICE * :Improperly formatted auth')) {

            return {
                type: MessageType.System,
                name: 'Twitch',
                text: SystemMessages.LoggedOut
            };
        } else if (text.includes('Welcome, GLHF!')) {
            return {
                type: MessageType.System,
                name: 'Twitch',
                text: SystemMessages.LoggedIn
            };
        } else {
            const joinText = text.split('JOIN')[1];

            if (joinText) {
                return {
                    type: MessageType.System,
                    name: joinText.substring(2).split('\n')[0],
                    text: SystemMessages.ConnectionSuccess
                }
            }
        }

        return null;
    }

    complete() {
        this.socket$?.complete();
        this.messagesSubject$.complete();

        this.destroy$.next();
        this.destroy$.complete();
    }

    logIn(name: string, password: string) {
        this.socket$?.complete();
        this.socket$ = webSocket<string>(this.CONNECTION_CONFIG);

        this.socket$.pipe(takeUntil(this.destroy$)).subscribe({
            next: (sourceMessage) => {
                const parsedMessage = this.parseSourceMessage(sourceMessage);

                if (parsedMessage) {
                    this.messagesSubject$.next(parsedMessage);
                }
            },
            error: (error) => {
                this.messagesSubject$.next({
                    type: MessageType.System,
                    name: 'Twitch',
                    text: SystemMessages.LoggedOut
                });

                console.assert(error);
            }
        });

        this.socket$.next(`PASS ${password.toLowerCase()}`);
        this.socket$.next(`NICK ${name.toLowerCase()}`);
    }

    logOut() {
        this.socket$.complete();

        this.messagesSubject$.next({
            type: MessageType.System,
            name: 'Twitch',
            text: SystemMessages.LoggedOut
        });
    }

    join(channel: string) {
        this.socket$.next(`JOIN #${channel.toLowerCase()}`);
    }
}
