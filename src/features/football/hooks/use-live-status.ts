"use client";
import { useEffect } from "react";

export const LIVE_STATUS_EVENT = "ninety:live-status";
export function usePublishLiveStatus(hasLive: boolean | undefined) { useEffect(() => { if (hasLive == null) return; sessionStorage.setItem(LIVE_STATUS_EVENT, hasLive ? "1" : "0"); window.dispatchEvent(new CustomEvent<boolean>(LIVE_STATUS_EVENT, { detail: hasLive })); }, [hasLive]); }
