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