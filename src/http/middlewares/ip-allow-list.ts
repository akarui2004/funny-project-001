/**
 * Sensitive endpoints: admin, internal API, debug
 * ENV: staging/pre-production restricted to the test team
 * CI/CD webhooks accepted only from GitHub/GitLab IP ranges
 * Protect metrics endpoints (Prometheus, health check)
 * Compliance with zero-trust requirements (PCI-DSS, HIPAA)
 * Note:
 *  ‣ PCI-DSS: Payment Card Industry Security Standards Council
 *  ‣ HIPAA: Health Insurance Portability and Accountability Act
 */

export function ipAllowlist(allowedCidrs: string[]) { }
