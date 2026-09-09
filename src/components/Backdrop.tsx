import WebThreads from './WebThreads';

export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <WebThreads
        color1="#5227FF"
        color2="#FF9FFC"
        color3="#FFFFFF"
        speed={0.14}
        threadCount={7}
        frequency={3.0}
        spread={0.5}
        taper={0.9}
        position={0.45}
        glow={0.016}
        falloff={0.66}
        thickness={1.1}
        brightness={0.5}
        opacity={0.6}
        grain
        grainIntensity={0.03}
        mouseInteraction
        mouseStrength={0.3}
      />
      <div className="absolute inset-0 bg-canvas/45" />
    </div>
  );
}
