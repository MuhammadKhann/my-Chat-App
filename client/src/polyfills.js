// Polyfills for Node.js globals in browser
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = { env: {} };
}

if (typeof Buffer === 'undefined') {
  window.Buffer = {
    from: (data) => new Uint8Array(data),
    isBuffer: () => false
  };
}
