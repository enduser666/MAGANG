type EventCallback = (payload: any) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  public async publish(eventType: string, payload: any) {
    const list = this.listeners.get(eventType) || [];
    // Dispatch events asynchronously to decouple from caller thread
    for (const callback of list) {
      try {
        const res = callback(payload);
        if (res instanceof Promise) {
          await res;
        }
      } catch (err) {
        console.error(`Error in EventBus listener for event "${eventType}":`, err);
      }
    }
  }
}

// Event constant identifiers
export const BUSINESS_EVENTS = {
  DATASET_IMPORTED: 'DATASET_IMPORTED',
  RECORD_CREATED: 'RECORD_CREATED',
  RECORD_UPDATED: 'RECORD_UPDATED',
  RECORD_DELETED: 'RECORD_DELETED',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  REVIEW_COMPLETED: 'REVIEW_COMPLETED',
  REVISION_REQUESTED: 'REVISION_REQUESTED'
};
