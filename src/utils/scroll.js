export function scrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function scrollIntoViewSmooth(element, block = "start") {
  element?.scrollIntoView({ behavior: scrollBehavior(), block });
}
