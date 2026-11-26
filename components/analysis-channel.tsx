"use client";

import { useBrowserSupabase } from "@/components/supabase-session";
import { STAGE_EVENT, analysisTopic, readStageMessage, type StageMessage } from "@/lib/pipeline/topic";
import { useEffect, useState } from "react";

export type ChannelUpdate = StageMessage & {
  movedAt: number;
};

export function useAnalysisChannel(id: number): {
  update: ChannelUpdate | null;
  error: string | null;
  subscribed: boolean;
} {
  const client = useBrowserSupabase();
  const [update, setUpdate] = useState<ChannelUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!client) return;
    const channel = client.channel(analysisTopic(id), {
      config: { private: true },
    });
    channel.on("broadcast", { event: STAGE_EVENT }, (payload) => {
      const message = readStageMessage(payload);
      if (!message) {
        setError("The progress message could not be read.");
        return;
      }
      setUpdate({ ...message, movedAt: Date.now() });
    });
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        setError(null);
        setSubscribed(true);
        return;
      }
      setSubscribed(false);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setError(errorText(err) ?? status);
      }
    });
    return () => {
      setSubscribed(false);
      void client.removeChannel(channel);
    };
  }, [client, id]);

  return { update, error, subscribed };
}

export function useAnalysisChannels(ids: readonly number[]): {
  updates: ReadonlyMap<number, ChannelUpdate>;
  errors: ReadonlyMap<number, string>;
} {
  const client = useBrowserSupabase();
  const [updates, setUpdates] = useState<ReadonlyMap<number, ChannelUpdate>>(new Map());
  const [errors, setErrors] = useState<ReadonlyMap<number, string>>(new Map());
  const key = ids.join(",");

  useEffect(() => {
    if (!client || key.length === 0) return;
    const ids = key.split(",").map((value) => Number(value));
    const channels = ids.map((id) => {
      const channel = client.channel(analysisTopic(id), {
        config: { private: true },
      });
      channel.on("broadcast", { event: STAGE_EVENT }, (payload) => {
        const message = readStageMessage(payload);
        if (!message) {
          setErrors((current) => new Map(current).set(id, "The progress message could not be read."));
          return;
        }
        setUpdates((current) => new Map(current).set(id, { ...message, movedAt: Date.now() }));
        setErrors((current) => {
          if (!current.has(id)) return current;
          const next = new Map(current);
          next.delete(id);
          return next;
        });
      });
      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setErrors((current) => new Map(current).set(id, errorText(err) ?? status));
        }
      });
      return channel;
    });
    return () => {
      for (const channel of channels) void client.removeChannel(channel);
    };
  }, [client, key]);

  return { updates, errors };
}

function errorText(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return null;
}
