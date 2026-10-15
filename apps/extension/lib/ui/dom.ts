/** Tiny element builder so the UI code reads like markup without using innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Partial<Record<string, string>> = {},
    children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) el.setAttribute(key, value);
    }
    el.append(...children);
    return el;
}
