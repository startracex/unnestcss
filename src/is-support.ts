const browsers = [
  { name: "Firefox", regex: /Firefox\/(\d+\.\d+)/, version: 117 },
  { name: "Edge", regex: /Edg\/(\d+\.\d+)/, version: 120 },
  { name: "Opera", regex: /OPR\/(\d+\.\d+)/, version: 106 },
  { name: "Safari", regex: /Version\/(\d+\.\d+).*Safari/, version: 17.2 },
  { name: "Chrome", regex: /Chrome\/(\d+\.\d+)/, version: 120 },
];

export function isSupport() {
  for (const browser of browsers) {
    const match = navigator.userAgent.match(browser.regex);
    if (match) {
      return Number(match[1]) >= browser.version;
    }
  }
  return false;
}

export default isSupport;
