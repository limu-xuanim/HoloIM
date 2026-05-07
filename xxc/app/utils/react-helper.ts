export function HElm(elm: EventTarget | Element): HTMLElement;
export function HElm(elm: EventTarget | Element | null): HTMLElement | null;
export function HElm(elm: EventTarget | Element | null): HTMLElement | null {
    if (elm === null) return null;
    return elm as HTMLElement;
}
