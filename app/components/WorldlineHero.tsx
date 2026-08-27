import { useRef, type PointerEvent } from "react";

export function WorldlineHero() {
  const sceneRef = useRef<HTMLDivElement>(null);

  const moveScene = (event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    sceneRef.current?.style.setProperty("--pointer-x", x.toFixed(3));
    sceneRef.current?.style.setProperty("--pointer-y", y.toFixed(3));
  };

  const resetScene = () => {
    sceneRef.current?.style.setProperty("--pointer-x", "0");
    sceneRef.current?.style.setProperty("--pointer-y", "0");
  };

  return (
    <div
      ref={sceneRef}
      className="worldline-portrait"
      onPointerMove={moveScene}
      onPointerLeave={resetScene}
      aria-label="Portrait of Sohel Islam Imran with an interactive career route"
    >
      <div className="worldline-portrait__halo" aria-hidden="true" />
      <div className="worldline-portrait__lens">
        <img
          src="/images/sohel-linkedin.png"
          alt="Sohel Islam Imran"
          width="800"
          height="800"
          fetchPriority="high"
        />
        <span className="worldline-portrait__glint" aria-hidden="true" />
      </div>
      <svg className="worldline-portrait__route" viewBox="0 0 760 500" aria-hidden="true">
        <path d="M10 430C150 420 188 360 286 360s126 32 196-12c71-45 83-151 267-244" />
        <circle cx="286" cy="360" r="8" />
        <circle cx="486" cy="345" r="5" />
        <circle cx="671" cy="161" r="5" />
      </svg>
      <div className="worldline-portrait__node worldline-portrait__node--kuno">
        <strong>Kuno</strong>
        <span>Lead Full Stack Engineer</span>
      </div>
      <div className="worldline-portrait__node worldline-portrait__node--tilleli">
        <strong>Tilleli</strong>
        <span>React Native</span>
      </div>
      <div className="worldline-portrait__node worldline-portrait__node--origin">
        <strong>Dhaka</strong>
        <span>Origin</span>
      </div>
    </div>
  );
}
