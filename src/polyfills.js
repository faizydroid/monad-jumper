if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = window.Buffer || require('buffer').Buffer;
}

export {}; 