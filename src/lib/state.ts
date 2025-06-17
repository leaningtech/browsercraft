import { writable } from "svelte/store";

export const eulaAccepted = writable<boolean>(false);

export const timeExpired = writable<boolean>(false);
