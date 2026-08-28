export const easeOut = [0.23, 1, 0.32, 1] as const;

export const springUi = { type: "spring" as const, bounce: 0, duration: 0.32 };
export const springFlick = { type: "spring" as const, bounce: 0.18, duration: 0.38 };
export const springCursor = { stiffness: 1600, damping: 38, mass: 0.1 };
export const springCursorLag = { stiffness: 520, damping: 28, mass: 0.16 };
export const springTilt = { stiffness: 280, damping: 20, mass: 0.32 };
