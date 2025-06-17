import { writable } from "svelte/store";
import type MinecraftClient from "./minecraft-web";

export const minecraftClient = writable<MinecraftClient>();

export const eulaAccepted = writable<boolean>(false);