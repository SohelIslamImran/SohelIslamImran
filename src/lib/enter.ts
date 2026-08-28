let allow = true;

export function lockEnterMotion() {
  allow = false;
}

export function enterMotionEnabled() {
  return allow;
}
