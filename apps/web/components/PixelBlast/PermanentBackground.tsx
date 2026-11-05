'use client';

import React from 'react';
import PixelBlast from './PixelBlast';

export default function PermanentBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-35 select-none"
      aria-hidden="true"
    >
      <PixelBlast
        variant="square"
        pixelSize={3.5}
        color="#4ADE80"
        accentColor="#FACC15"
        patternScale={2.2}
        patternDensity={0.8}
        softness={0.65}
        glow={0.3}
        twinkle={0.2}
        speed={0.4}
        drift={0.12}
        driftAngle={35}
        hoverEffect="reveal"
        hoverRadius={160}
        enableRipples={true}
        rippleSpeed={0.32}
        rippleThickness={0.12}
        rippleIntensityScale={1.3}
        edgeFade={0.2}
        transparent={true}
        autoPauseOffscreen={false}
      />
    </div>
  );
}

