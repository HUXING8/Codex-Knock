import os from "node:os";

export function getHostIdentity() {
  return {
    hostname: os.hostname(),
    ips: getLocalIps(),
  };
}

export function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.internal) {
        continue;
      }
      if (entry.family !== "IPv4" && entry.family !== 4) {
        continue;
      }
      ips.push(entry.address);
    }
  }

  return [...new Set(ips)].sort();
}
