import { useRef } from 'react';
import './horizontalDragScroll.css';

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"]), [data-no-drag-scroll]';

// Mouse dragging supplements the scrollbar; touch and trackpad scrolling stay native.
export default function useHorizontalDragScroll() {
    const ref = useRef(null);
    const gesture = useRef(null);
    const suppressClick = useRef(false);

    const finish = (event, cancelled = false) => {
        const active = gesture.current;
        if (!active || event.pointerId !== active.pointerId) return;
        gesture.current = null;
        suppressClick.current = !cancelled && active.dragging;
        const element = ref.current;
        element?.classList.remove('is-dragging');
        if (element?.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };

    return {
        ref,
        onPointerDown(event) {
            suppressClick.current = false;
            gesture.current = null;
            const element = ref.current;
            if (event.pointerType !== 'mouse' || event.button !== 0 || !element ||
                event.target.closest(INTERACTIVE) || element.scrollWidth <= element.clientWidth) return;
            gesture.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: element.scrollLeft,
                dragging: false
            };
        },
        onPointerMove(event) {
            const active = gesture.current;
            const element = ref.current;
            if (!active || !element || active.pointerId !== event.pointerId) return;
            if (!(event.buttons & 1)) { finish(event); return; }
            const distance = event.clientX - active.startX;
            if (!active.dragging) {
                if (Math.abs(distance) < 6 || Math.abs(distance) < Math.abs(event.clientY - active.startY)) return;
                active.dragging = true;
                element.setPointerCapture(event.pointerId);
                element.classList.add('is-dragging');
                window.getSelection()?.removeAllRanges();
            }
            event.preventDefault();
            element.scrollLeft = active.scrollLeft - distance;
        },
        onPointerUp: finish,
        onPointerLeave(event) {
            if (gesture.current && !gesture.current.dragging) finish(event, true);
        },
        onPointerCancel(event) { finish(event, true); },
        onLostPointerCapture: finish,
        onDragStart(event) {
            if (gesture.current) event.preventDefault();
        },
        onClickCapture(event) {
            if (suppressClick.current && event.detail !== 0) {
                suppressClick.current = false;
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };
}
