/**
 * Endpoint nhạy cảm: admin, internal API, debug
 * ENV: staging/pre-product chỉ cho team test
 * CI/CD webhook chỉ nhận từ GitHub/GitLab IP range
 * Bảo vệ metrics endpoint (Prometheus, health check)
 * Compliance(Tuân thủ) các yêu cầu zero-trust (PCI-DSS, HIPAA)
 * Note:
 *  ‣ PCI-DSS: Payment Card Industry Security Standards Council
 *  ‣ HIPAA: Health Insurance Portability and Accountability Act
 */

export function ipAllowlist(allowedCidrs: string[]) { }
