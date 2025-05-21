// This module provides a fallback for the canvas package
// which may not be available in all environments (especially serverless)

const mockCanvas = {
  createCanvas: () => ({
    getContext: () => ({
      // Mock minimal 2D context methods
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({data: new Uint8ClampedArray()}),
      putImageData: () => {},
      createImageData: () => ({data: new Uint8ClampedArray()}),
      setTransform: () => {},
      drawImage: () => {},
      fillText: () => {},
      measureText: () => ({width: 0}),
      createPattern: () => ({}),
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      createRadialGradient: () => ({
        addColorStop: () => {}
      }),
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      arc: () => {},
      arcTo: () => {},
      ellipse: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      save: () => {},
      restore: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
    }),
    width: 0,
    height: 0,
    toBuffer: () => Buffer.from([]),
    toDataURL: () => '',
  }),
  // Add any other methods from node-canvas that might be used
  loadImage: () => Promise.resolve({
    width: 0,
    height: 0
  })
};

// Export as both ES module and CommonJS
export default mockCanvas;
export const { createCanvas, loadImage } = mockCanvas; 