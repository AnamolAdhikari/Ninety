"use client";
import { useSyncExternalStore } from "react";
import { FAVORITES_KEY, parseIds } from "./storage";
const subscribe = (callback: () => void) => { window.addEventListener("storage", callback); window.addEventListener("ninety:favorites", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("ninety:favorites", callback); }; };
export function useFavorites() { const snapshot = useSyncExternalStore(subscribe, () => localStorage.getItem(FAVORITES_KEY) ?? "[]", () => "[]"); return parseIds(snapshot); }
