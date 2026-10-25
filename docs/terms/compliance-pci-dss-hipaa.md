# Compliance Cheatsheet: PCI-DSS & HIPAA

> Tài liệu tham khảo nhanh cho developer khi xây dựng hệ thống xử lý dữ liệu thanh toán (PCI-DSS) hoặc dữ liệu y tế (HIPAA).

---

## Mục lục

1. [Compliance là gì?](#1-compliance-là-gì)
2. [PCI-DSS — Payment Card Industry Data Security Standard](#2-pci-dss--payment-card-industry-data-security-standard)
3. [HIPAA — Health Insurance Portability and Accountability Act](#3-hipaa--health-insurance-portability-and-accountability-act)
4. [So sánh PCI-DSS vs HIPAA](#4-so-sánh-pci-dss-vs-hipaa)
5. [Checklist implementation cho developer](#5-checklist-implementation-cho-developer)
6. [Liên hệ với IP Blacklist / Allowlist](#6-liên-hệ-với-ip-blacklist--allowlist)
7. [Tham khảo](#7-tham-khảo)

---

## 1. Compliance là gì?

**Compliance** (Tuân thủ) = việc tổ chức tuân thủ các quy định, tiêu chuẩn, hoặc luật do chính phủ / ngành đặt ra, nhằm đảm bảo hoạt động hợp pháp, an toàn, và đáng tin cậy.

Nói đơn giản: **làm đúng như luật/regulation yêu cầu, nếu vi phạm sẽ bị phạt tiền hoặc bị kiện.**

### Tại sao phải quan tâm?

- Tránh phạt tiền (có thể lên hàng triệu USD)
- Giữ được license kinh doanh
- Bảo vệ dữ liệu khách hàng → giữ uy tín
- Bắt buộc để ký hợp đồng với đối tác lớn (bank, y tế, government)

### Phân loại compliance phổ biến

| Loại | Ví dụ | Lĩnh vực |
|------|-------|----------|
| Bảo vệ dữ liệu cá nhân | GDPR (EU), CCPA (California), PDPA (VN) | Toàn cầu |
| Bảo mật thẻ tín dụng | **PCI-DSS** | Thanh toán, e-commerce |
| Y tế | **HIPAA** (Mỹ), PIPEDA (Canada) | Bệnh viện, app y tế |
| Tài chính | SOX, GLBA, Basel III | Bank, chứng khoán |
| Quốc phòng | FedRAMP, CMMC | Government, nhà thầu quân sự |
| Chứng chỉ hệ thống | ISO 27001, SOC 2 | Mọi ngành |

---

## 2. PCI-DSS — Payment Card Industry Data Security Standard

### 2.1. Tổng quan

- **Do ai ban hành:** PCI SSC (Payment Card Industry Security Standards Council) — tổ chức gồm 5 ông lớn: Visa, Mastercard, American Express, Discover, JCB
- **Phiên bản hiện tại:** PCI-DSS v4.0 (phát hành 2022, mandatory từ 31/03/2024)
- **Mục đích:** bảo vệ dữ liệu thẻ tín dụng (cardholder data) khi lưu trữ, xử lý, truyền

### 2.2. Áp dụng cho ai?

Mọi tổ chức **lưu trữ, xử lý, hoặc truyền dữ liệu thẻ** — dù chỉ 1 giao dịch/tháng:

- E-commerce (Shopee, Tiki, Shopify store)
- POS tại cửa hàng
- Payment gateway (Stripe, Momo, VNPay)
- SaaS có thu tiền qua thẻ

### 2.3. Phân loại merchant (theo volume giao dịch)

| Level | Số giao dịch/năm | Yêu cầu audit |
|-------|------------------|----------------|
| **Level 1** | > 6 triệu | Annual on-site assessment bởi QSA |
| **Level 2** | 1 triệu – 6 triệu | Annual Self-Assessment + quarterly scan |
| **Level 3** | 20,000 – 1 triệu | Annual Self-Assessment + quarterly scan |
| **Level 4** | < 20,000 | Self-Assessment + quarterly scan (tùy acquirer) |

### 2.4. 12 yêu cầu chính (PCI-DSS v4.0)

| # | Yêu cầu | Ví dụ thực tế |
|---|---------|--------------|
| 1 | Firewall + router config bảo mật | Block IP ngoài truy cập DB |
| 2 | Đổi default password thiết bị | Không dùng `admin/admin` |
| 3 | Bảo vệ stored cardholder data | Mã hóa PAN, không lưu CVV |
| 4 | Mã hóa khi truyền qua mạng | TLS 1.2+ cho mọi API payment |
| 5 | Antivirus + cập nhật | Patch OS định kỳ |
| 6 | Hệ thống secure + patch | Không dùng dependency có CVE |
| 7 | Restrict access theo need-to-know | IP allowlist cho admin DB |
| 8 | Xác thực người dùng | MFA cho hệ thống thẻ |
| 9 | Kiểm soát vật lý | Camera tại server room |
| 10 | Log + monitor | Lưu audit log 1 năm |
| 11 | Test security định kỳ | Pentest hàng năm, scan quarterly |
| 12 | Information security policy | Tài liệu nội bộ, training nhân viên |

### 2.5. Dữ liệu thẻ — được phép / không được phép lưu

| Dữ liệu | Lưu trữ | Ghi chú |
|---------|---------|---------|
| PAN (số thẻ) | Có (phải mask, chỉ hiển thị 6 cuối + 4 đầu) | Phải mã hóa |
| Cardholder name | Có | Không nhạy cảm nếu standalone |
| Expiry date | Có | — |
| **CVV/CVC** | **KHÔNG (kể cả mã hóa)** | Chỉ dùng tại thời điểm authorize |
| **PIN** | **KHÔNG (kể cả mã hóa)** | Không bao giờ lưu |
| Track data (magstripe) | **KHÔNG** | — |

### 2.6. Hậu quả vi phạm

- Phạt **$5,000 – $100,000/tháng** từ bank
- **Bị revoke quyền nhận thẻ** = sập business với e-commerce
- Audit phí **$30,000 – $500,000/năm**
- Thiệt hại uy tín thương hiệu (public disclosure)

### 2.7. Best practices cho developer

- **Tokenization**: thay PAN bằng token từ payment processor (Stripe, Braintree) → không bao giờ chạm PAN
- **Scope reduction**: cô lập Cardholder Data Environment (CDE) khỏi phần còn lại của app
- **Network segmentation**: VLAN riêng, firewall rule chỉ cho phép IP cụ thể
- **Encryption at rest**: AES-256 cho DB chứa PAN
- **Encryption in transit**: TLS 1.2+ (1.3 preferred), HSTS, certificate pinning
- **No logging sensitive data**: scrub CVV, PAN khỏi log (mask `************4242`)

---

## 3. HIPAA — Health Insurance Portability and Accountability Act

### 3.1. Tổng quan

- **Quốc gia:** Mỹ (1996)
- **Cơ quan quản lý:** HHS OCR (Department of Health and Human Services — Office for Civil Rights)
- **Mục đích:** đảm bảo thông tin y tế cá nhân không bị rò rỉ, truy cập trái phép

### 3.2. Áp dụng cho ai?

Mọi tổ chức xử lý thông tin y tế tại Mỹ:

- **Covered Entities**: bệnh viện, phòng khám, bác sĩ, bảo hiểm y tế
- **Business Associates**: SaaS phục vụ y tế (EHR, telemedicine, app theo dõi sức khỏe có connect với bệnh viện)

> ⚠️ Nếu app của bạn có user Mỹ và lưu bất kỳ thông tin y tế nào (kết quả xét nghiệm, toa thuốc, BMI từ device...) → phải tuân thủ HIPAA.

### 3.3. 18 loại PHI được bảo vệ

| # | Loại PHI | # | Loại PHI |
|---|----------|---|----------|
| 1 | Tên | 10 | Số tài khoản y tế |
| 2 | Địa chỉ | 11 | Certificate/license |
| 3 | Ngày sinh | 12 | Vehicle identifier |
| 4 | Số điện thoại | 13 | Device serial |
| 5 | Fax | 14 | URL |
| 6 | Email | 15 | IP address |
| 7 | SSN | 16 | Biometric (vân tay, voice) |
| 8 | MRN (medical record #) | 17 | Full-face photo |
| 9 | Number health plan | 18 | Any unique identifier |

### 3.4. 4 quy tắc chính của HIPAA

| Rule | Yêu cầu | Ví dụ |
|------|---------|-------|
| **Privacy Rule** | Hạn chế ai được truy cập PHI | Bác sĩ chỉ xem bệnh nhân mình |
| **Security Rule** | Bảo mật điện tử (ePHI) | Encryption, audit log, IP allowlist DB |
| **Breach Notification** | Phải báo leak trong 60 ngày | Email user + government |
| **Enforcement Rule** | Penalty khi vi phạm | Phạt + audit |

### 3.5. Security Rule — 3 lớp safeguard

#### Administrative Safeguard (chính sách)

- Risk assessment định kỳ
- Training nhân viên
- Sanction policy cho vi phạm
- Incident response plan

#### Physical Safeguard (vật lý)

- Kiểm soát access facility
- Policy workstation use (lock screen khi rời bàn)
- Media disposal (xóa HDD trước khi vứt)

#### Technical Safeguard (kỹ thuật)

| Yêu cầu | Implementation |
|---------|---------------|
| **Access Control** | Unique user ID, automatic logoff, encryption/decryption |
| **Audit Controls** | Log mọi access PHI (who, what, when) |
| **Integrity** | Hash/checksum phát hiện chỉnh sửa trái phép |
| **Authentication** | MFA cho system chứa ePHI |
| **Transmission Security** | TLS 1.2+ cho mọi API transmit ePHI |

### 3.6. Hậu quả vi phạm

| Tier | Mức độ | Phạt tối đa/violation | Tối đa/năm |
|------|--------|----------------------|------------|
| 1 | Không biết + không thể tránh | $100 | $25,000 |
| 2 | Reasonable cause | $1,000 | $100,000 |
| 3 | Willful neglect + corrected <30 ngày | $10,000 | $250,000 |
| 4 | Willful neglect + NOT corrected | $50,000 | $1.5M |

- Cơ sự nếu vi phạm cố ý: **5 năm tù**
- Lose license hành nghề y tế

### 3.7. Best practices cho developer

- **BAA (Business Associate Agreement)**: ký với mọi vendor xử lý PHI (AWS, Stripe, SendGrid... phải có BAA-ready tier)
- **Encryption at rest**: AES-256 cho DB chứa ePHI
- **Encryption in transit**: TLS 1.2+, mTLS cho service-to-service
- **Minimum Necessary**: chỉ trả về field PHI thực sự cần ( không `SELECT *`)
- **Audit log**: log mọi access PHI — `who, what, when, why`
- **Breach response**: procedure 60-day notification + database leak tracking

---

## 4. So sánh PCI-DSS vs HIPAA

| Tiêu chí | PCI-DSS | HIPAA |
|----------|---------|-------|
| **Ngành** | Thanh toán, thẻ tín dụng | Y tế, thông tin sức khỏe |
| **Quốc gia** | Toàn cầu (council) | Mỹ (liên bang) |
| **Dữ liệu bảo vệ** | Cardholder Data (PAN, CVV...) | PHI (Protected Health Information) |
| **Cơ quan ban hành** | PCI SSC | HHS (Mỹ) |
| **Áp dụng** | Mọi org xử lý thẻ | Covered Entities + Business Associates |
| **Audit** | QSA on-site (Level 1) | Self-assessment + OCR audit |
| **Phạt tối đa** | $100K/tháng + revoke | $1.5M/năm + 5 năm tù |
| **Mandatory encryption** | PAN at rest + transit | ePHI at rest + transit (addressable) |
| **Lưu trữ sensitive data** | Cấm CVV/PIN/track | Không cấm, nhưng strict access |
| **Audit log retention** | 1 năm, daily review | 6 năm |
| **Breach notification** | Báo bank + card brand | 60 ngày → user + HHS |

---

## 5. Checklist implementation cho developer

### 5.1. Common checklist (áp dụng cả 2)

- [ ] **TLS 1.2+** cho mọi API endpoint (disable TLS 1.0/1.1)
- [ ] **HSTS** header (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`)
- [ ] **CSP** header (Content-Security-Policy)
- [ ] **MFA** cho admin panel
- [ ] **Audit log** mọi action nhạy cảm (login, access data, export, delete)
- [ ] **Log retention** ít nhất 1 năm (PCI) / 6 năm (HIPAA)
- [ ] **Encryption at rest** (AES-256) cho DB
- [ ] **Backup encryption** + test restore
- [ ] **Secret management** (AWS KMS, HashiCorp Vault) — không hardcode key
- [ ] **Dependency scan** (npm audit, Snyk) — không deploy nếu có critical CVE
- [ ] **Pen test** hàng năm
- [ ] **Incident response plan** documented + test

### 5.2. PCI-DSS specific

- [ ] **Tokenization** với payment processor — không bao giờ chạm PAN raw
- [ ] **Network segmentation** — CDE cô lập
- [ ] **Firewall rules** explicit allowlist (no `0.0.0.0/0` inbound)
- [ ] **No PAN trong log** — mask `************4242`
- [ ] **No CVV lưu** — ngay cả encrypted
- [ ] **Quarterly ASV scan** (Approved Scanning Vendor)
- [ ] **WAF** cho web app xử lý payment
- [ ] **Rate limit** cho payment endpoint
- [ ] **IP allowlist** cho admin DB / internal API

### 5.3. HIPAA specific

- [ ] **BAA** ký với mọi vendor (AWS, GCP, Stripe, SendGrid, Datadog...)
- [ ] **Minimum Necessary** principle — API chỉ trả field cần thiết
- [ ] **Access log** — `who, what, when, why` cho mỗi access PHI
- [ ] **Automatic logoff** sau 15 phút idle
- [ ] **PHI scrub** trong error message / stack trace
- [ ] **Breach notification procedure** 60 ngày documented
- [ ] **Risk assessment** hàng năm
- [ ] **Workforce training** hàng năm + signed acknowledgment

---

## 6. Liên hệ với IP Blacklist / Allowlist

| Compliance | Yêu cầu liên quan IP | Implementation |
|------------|----------------------|----------------|
| **PCI-DSS** req 1 & 7 | Firewall restrict IP truy cập CDE | IP allowlist cho server DB, admin panel |
| **HIPAA Security Rule** | Access control ePHI | IP allowlist cho EHR, audit log IP truy cập |
| **GDPR** art. 32 | Bảo vệ dữ liệu cá nhân | IP blacklist cho known malicious IP, log IP truy cập |
| **SOC 2** CC6.6 | Logical access control | Allowlist + blacklist + MFA |

### Decision matrix

| Endpoint type | Default policy | Layer |
|---------------|----------------|-------|
| Public API (`/api/v1/products`) | Allow all + blacklist | Blacklist middleware |
| Admin panel (`/admin/*`) | Deny all + allowlist | Allowlist middleware |
| Payment (`/api/v1/charge`) | Allow authenticated + blacklist + rate limit | Blacklist + auth + rate limit |
| Internal API (`/internal/*`) | Deny all + allowlist (VPN/private IP) | Allowlist middleware |
| Webhook (`/webhook/github`) | Allowlist GitHub IP range only | Allowlist middleware |
| Health check (`/health`) | Allow all (no sensitive info) | No filter |

---

## 7. Tham khảo

### PCI-DSS

- Official site: https://www.pcisecuritystandards.org/
- Document: PCI-DSS v4.0 Standard
- ASV list: https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors

### HIPAA

- Official site: https://www.hhs.gov/hipaa
- Security Rule guidance: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- Breach portal: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf

### Tools & frameworks

- **OWASP ASVS** — Application Security Verification Standard
- **NIST CSF** — Cybersecurity Framework
- **CIS Controls** — Center for Internet Security
- **SOC 2** — AICPA Trust Services Criteria

---

> **Disclaimer:** Tài liệu này chỉ mang tính tham khảo. Trước khi audit thực tế, luôn tham khảo pháp lý/chuyên gia compliance. Quy định có thể thay đổi — kiểm tra phiên bản mới nhất tại nguồn chính thức.
