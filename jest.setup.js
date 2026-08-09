import '@testing-library/jest-dom'

// jsdom ships neither of these, and both are load-bearing for the UI tests:
// Chakra reads matchMedia to resolve its colour mode, Recharts observes its
// container to size charts.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Chakra's Menu scrolls the focused item into view on open.
if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = () => {}
}

// jsdom lays nothing out, so every element measures 0x0 and Recharts renders an
// empty svg. Give elements a non-zero box so charts actually draw.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 800,
})
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 400,
})
