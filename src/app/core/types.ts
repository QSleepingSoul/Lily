import { Observable } from "rxjs/internal/Observable";

export enum MessageType {
    System,
    User
}

export type Message = {
    type: MessageType,
    name: string,
    text: string
}

export type APIMessage = {
    apiName: string,
    message: Message
}

export type APIMessages = {
    apiName: string,
    messages$: Observable<Message>
}

export interface IAPI {
    complete(): void;
}

export interface IChatAPI extends IAPI {
    readonly messages$: Observable<Message>;
}

export const isIChatAPI = (obj): obj is IChatAPI => {
    return obj.messages$ !== undefined;
}
