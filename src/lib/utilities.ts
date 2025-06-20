// for adblockers protection
export function tryPlausible(msg: string) {
	if (self.plausible)
		plausible(msg)
}

export function showElement(element: HTMLElement) {
	element.style.display = 'flex';
}

export function hideElement(element: HTMLElement) {
	element.style.display = 'none';
}

export function formatTime(time: number): string {
	const minutes = Math.floor(time / 60);
	const seconds = time % 60;
	return `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
}