export class EventDispatcher extends EventTarget {
	dispatch = (eventName:string, detail:any = {}) => {
		this.dispatchEvent(new CustomEvent(eventName, {detail}));
	}

	addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
		// Uncomment this line to find who is listening for specific events
		// console.log("adding event listener", type, callback, options);
		super.addEventListener(type, callback, options);
	}
}