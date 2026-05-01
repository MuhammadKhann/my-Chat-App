// Polyfills for Node.js globals in browser
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Add nextTick for simple-peer (WebRTC)
if (!window.process.nextTick) {
  window.process.nextTick = (fn, ...args) => {
    setTimeout(() => fn(...args), 0);
  };
}

if (typeof Buffer === 'undefined') {
  window.Buffer = {
    from: (data, encoding) => {
      if (typeof data === 'string' && encoding === 'base64') {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }
      return new Uint8Array(data);
    },
    isBuffer: (obj) => obj instanceof Uint8Array,
    alloc: (size) => new Uint8Array(size)
  };
}
