2841   /**
2842    * Draw single pixel core - low-level painting with true alpha blending
2843    * Used by stampProceduralBrush and stampCustomBrush for direct pixel placement
2844    * Implements proper per-channel alpha blending for semi-transparent strokes
2845    */
2846   private drawSinglePixelCore(pixelX: number, pixelY: number, r: number, g: number, b: number, a: number): void {
2847     const activeLayer = this.layerManager.getActiveLayer();
2848     if (!activeLayer) return;
2849     
2850     // Check bounds
2851     if (
2852       pixelX < 0 ||
2853       pixelX >= this.layerManager.canvasWidth ||
2854       pixelY < 0 ||
2855       pixelY >= this.layerManager.canvasHeight
2856     ) {
2857       return;
2858     }
2859     
2860     // Eraser mode: set transparent RGBA 0,0,0,0
2861     if (this.currentTool === "eraser") {
2862       activeLayer.setPixel(pixelX, pixelY, 0, 0, 0, 0);
2863       return;
2864     }
2865     
2866     // Normal brush: fetch destination pixel and perform true alpha blending
2867     const dst = activeLayer.getPixel(pixelX, pixelY);
2868     if (!dst) {
2869       // No destination pixel, just set the source
2870       activeLayer.setPixel(pixelX, pixelY, r, g, b, a);
2871       return;
2872     }
2873     
2874     // Compute source and destination alpha as normalized values (0.0-1.0)
2875     const srcA = a / 255;
2876     const dstA = dst[3] / 255;
2877     
2878     // Compute output alpha using Porter-Duff "over" operator
2879     const outA = srcA + dstA * (1 - srcA);
2880     
2881     // If output alpha is zero, set transparent pixel
2882     if (outA === 0) {
2883       activeLayer.setPixel(pixelX, pixelY, 0, 0, 0, 0);
2884       return;
2885     }
2886     
2887     // Blend RGB channels using true alpha blending formula
2888     const outR = (r * srcA + dst[0] * dstA * (1 - srcA)) / outA;
2889     const outG = (g * srcA + dst[1] * dstA * (1 - srcA)) / outA;
2890     const outB = (b * srcA + dst[2] * dstA * (1 - srcA)) / outA;
2891     
2892     // Write final blended pixel
2893     activeLayer.setPixel(
2894       pixelX,
2895       pixelY,
2896       Math.round(outR),
2897       Math.round(outG),
2898       Math.round(outB),
2899       Math.round(outA * 255)
2900     );
2901   }
