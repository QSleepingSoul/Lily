type QueueItem<T> = {
    data: T,
    next: QueueItem<T> | null
}

export class Queue<T> {
    private head: QueueItem<T> | null = null;
    private tail: QueueItem<T> | null = null;

    push(data: T) {
        const newItem: QueueItem<T> = {
            data,
            next: null
        };

        if (this.tail) {
            this.tail.next = newItem;
            this.tail = this.tail.next;
        } else {
            this.head = newItem;
            this.tail = this.head;
        }
    }

    pop(): T | undefined {
        let poppedItem: QueueItem<T> | null = null;

        if (this.head) {
            poppedItem = this.head;

            if (!this.head.next) {
                this.head = null;
                this.tail = null;
            } else {
                this.head = this.head.next;
            }
        }

        return poppedItem?.data;
    }
}
