import { useState, useRef, useCallback } from "react";

export function useHabitDragAndDrop({ isMobile, reorderHabitsLocal, reorderHabits, persistHabitOrder }) {
  const [draggingHabitId, setDraggingHabitId] = useState("");
  const [touchDragging, setTouchDragging] = useState(false);
  const pendingOrderRef = useRef(null);

  const getHabitIdFromEventTarget = useCallback((el) => {
    const node = el?.closest?.("[data-habit-id]");
    return node?.getAttribute?.("data-habit-id") || "";
  }, []);

  const onTouchDragStart = useCallback((habitId) => {
    setDraggingHabitId(habitId);
    setTouchDragging(true);
  }, []);

  const onTouchDragMove = useCallback(
    async (clientX, clientY) => {
      if (!draggingHabitId) return;
      const el = document.elementFromPoint(clientX, clientY);
      const overId = getHabitIdFromEventTarget(el);
      if (!overId || overId === draggingHabitId) return;

      const nextList = reorderHabitsLocal(draggingHabitId, overId);
      if (nextList) pendingOrderRef.current = nextList;
    },
    [draggingHabitId, getHabitIdFromEventTarget, reorderHabitsLocal]
  );

  const onTouchDragEnd = useCallback(async () => {
    const nextList = pendingOrderRef.current;
    pendingOrderRef.current = null;
    setTouchDragging(false);
    setDraggingHabitId("");

    if (nextList) {
      await persistHabitOrder(nextList);
    }
  }, [persistHabitOrder]);

  const handleDragStart = useCallback((habitId, e) => {
    e.dataTransfer.setData("text/plain", habitId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingHabitId(habitId);
  }, []);

  const handleDragOver = useCallback((_habitId, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (toHabitId, e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      reorderHabits(fromId, toHabitId);
      setDraggingHabitId("");
    },
    [reorderHabits]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingHabitId("");
  }, []);

  const getHabitDnDProps = useCallback(
    (habitId) => {
      if (isMobile) {
        return {
          dragging: draggingHabitId === habitId,
          onDragStart: undefined,
          onDragOver: undefined,
          onDrop: undefined,
          onDragEnd: undefined,
          onTouchStartDrag: () => onTouchDragStart(habitId),
          onTouchMoveDrag: onTouchDragMove,
          onTouchEndDrag: onTouchDragEnd,
          touchDragging,
        };
      }

      return {
        dragging: draggingHabitId === habitId,
        onDragStart: (e) => handleDragStart(habitId, e),
        onDragOver: (e) => handleDragOver(habitId, e),
        onDrop: (e) => handleDrop(habitId, e),
        onDragEnd: handleDragEnd,
        onTouchStartDrag: undefined,
        onTouchMoveDrag: undefined,
        onTouchEndDrag: undefined,
        touchDragging,
      };
    },
    [
      draggingHabitId,
      handleDragEnd,
      handleDragOver,
      handleDragStart,
      handleDrop,
      onTouchDragEnd,
      onTouchDragMove,
      onTouchDragStart,
      isMobile,
      touchDragging,
    ]
  );

  return { getHabitDnDProps };
}