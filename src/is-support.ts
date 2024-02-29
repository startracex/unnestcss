const browsers = [
  [/Firefox\/(\d+\.\d+)/, 117],
  [/Edg\/(\d+\.\d+)/, 120],
  [/OPR\/(\d+\.\d+)/, 106],
  [/Version\/(\d+\.\d+).*Safari/, 17.2],
  [/Chrome\/(\d+\.\d+)/, 120],
] as const;

export function isSupport() {
  for (const [regex, version] of browsers) {
    const match = navigator.userAgent.match(regex);
    if (match) {
      return Number(match[1]) >= version;
    }
  }
  return false;
}

export default isSupport;
