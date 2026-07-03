/**
 * Custom hook for real-time task feed via WebSocket.
 * Subscribes to events (task.updated, task.assigned, annotation.created)
 * and dispatches them into Redux state.
 *
 * Handles:
 * - Reconnection on disconnect
 * - Events referencing unloaded tasks (gracefully ignored)
 * - Normalization of incoming status values
 */

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/store";
import {
  updateTaskStatus,
  updateTaskAssignee,
  incrementAnnotationCount,
} from "@/lib/store/tasks";
import { normalizeStatus } from "@/lib/normalize";

interface UseTaskFeedOptions {
  enabled?: boolean;
  wsBase?: string;
  reconnectInterval?: number;
}

export function useTaskFeed({
  enabled = true,
  wsBase = "ws://localhost:4000",
  reconnectInterval = 3000,
}: UseTaskFeedOptions = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${wsBase}/ws`);

        ws.addEventListener("open", () => {
          console.log("[useTaskFeed] Connected");
        });

        ws.addEventListener("message", (event) => {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketEvent(message, dispatch);
          } catch (err) {
            console.error("[useTaskFeed] Failed to parse message:", err);
          }
        });

        ws.addEventListener("close", () => {
          console.log("[useTaskFeed] Disconnected");
          wsRef.current = null;

          // Attempt reconnect if we didn't intentionally close
          if (shouldReconnectRef.current) {
            reconnectTimeoutRef.current = setTimeout(
              connectWebSocket,
              reconnectInterval
            );
          }
        });

        ws.addEventListener("error", (err) => {
          console.error("[useTaskFeed] WebSocket error:", err);
        });

        wsRef.current = ws;
      } catch (err) {
        console.error("[useTaskFeed] Failed to create WebSocket:", err);

        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(
            connectWebSocket,
            reconnectInterval
          );
        }
      }
    };

    connectWebSocket();

    return () => {
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, wsBase, dispatch, reconnectInterval]);
}

/**
 * Process an incoming WebSocket event and dispatch appropriate Redux actions.
 * Events that reference unloaded tasks are gracefully ignored.
 */
function handleWebSocketEvent(event: any, dispatch: AppDispatch) {
  if (!event.kind || !event.payload) {
    console.warn("[handleWebSocketEvent] Invalid event structure:", event);
    return;
  }

  const { kind, payload } = event;

  try {
    switch (kind) {
      case "task.updated": {
        // Normalize the status from the raw event
        const normalizedStatus = normalizeStatus(payload.status);
        dispatch(
          updateTaskStatus({
            id: payload.id,
            status: normalizedStatus,
          })
        );
        break;
      }

      case "task.assigned": {
        dispatch(
          updateTaskAssignee({
            id: payload.id,
            assignee: payload.assignee,
          })
        );
        break;
      }

      case "annotation.created": {
        dispatch(
          incrementAnnotationCount({
            id: payload.taskId,
          })
        );
        break;
      }

      default:
        console.warn("[handleWebSocketEvent] Unknown event kind:", kind);
    }
  } catch (err) {
    console.error(`[handleWebSocketEvent] Error handling ${kind}:`, err);
  }
}
