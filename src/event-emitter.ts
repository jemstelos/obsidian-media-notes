type Listener<T = unknown> = (payload: T) => void;

export class EventEmitter {
	private listeners = new Map<string, Set<Listener>>();

	on<T = unknown>(eventName: string, listener: Listener<T>) {
		const listeners = this.listeners.get(eventName) ?? new Set();
		listeners.add(listener as Listener);
		this.listeners.set(eventName, listeners);
	}

	off<T = unknown>(eventName: string, listener: Listener<T>) {
		this.listeners.get(eventName)?.delete(listener as Listener);
	}

	emit<T = unknown>(eventName: string, payload: T) {
		this.listeners.get(eventName)?.forEach((listener) => {
			listener(payload);
		});
	}
}
