import { APIMessage } from '../core/types';
import { Queue } from '../helpers/queue';
import { Observable } from 'rxjs';

type Settings = {
    volume: number;
    pitch: number;
    rate: number;
}

export class Speaker {
    private synth = window.speechSynthesis;
    private _voices = this.synth.getVoices();
    private messagesQueue = new Queue<APIMessage>();
    private isReadyToPlay = true;
    private settings: Settings = {
        volume: 1,
        pitch: 1,
        rate: 1
    };

    constructor(apiMessages$: Observable<APIMessage>) {
        apiMessages$.subscribe({
            next: (apiMessage) => {
                this.messagesQueue.push(apiMessage);

                this.play();
            }
        });
    }

    get voices() {
        return this._voices;
    }

    get volume() {
        return this.settings.volume;
    }

    set volume(value: number) {
        this.settings.volume = value;
    }

    get pitch() {
        return this.settings.pitch;
    }

    set pitch(value: number) {
        this.settings.pitch = value;
    }

    get rate() {
        return this.settings.rate;
    }

    set rate(value: number) {
        this.settings.rate = value;
    }

    private createUtterance(text): SpeechSynthesisUtterance {
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.volume = this.settings.volume;
        utterance.pitch = this.settings.pitch;
        utterance.rate = this.settings.rate;

        utterance.addEventListener('end', () => {
            this.isReadyToPlay = true;

            this.play();
        }, { once: true });

        return utterance;
    }

    private play() {
        if (this.isReadyToPlay) {
            const poppedApiMessage = this.messagesQueue.pop();

            if (poppedApiMessage) {
                this.isReadyToPlay = false;

                this.synth.speak(this.createUtterance(poppedApiMessage.message.text));
            }
        }
    }

    cancel() {
        this.synth.cancel();
        
        this.isReadyToPlay = true;
    }
}
