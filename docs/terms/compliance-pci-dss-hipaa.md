# Compliance Cheatsheet: PCI-DSS & HIPAA

> Quick reference for developers building systems that handle payment data (PCI-DSS) or health data (HIPAA).

---

## Table of Contents

1. [What is compliance?](#1-what-is-compliance)
2. [PCI-DSS — Payment Card Industry Data Security Standard](#2-pci-dss--payment-card-industry-data-security-standard)
3. [HIPAA — Health Insurance Portability and Accountability Act](#3-hipaa--health-insurance-portability-and-accountability-act)
4. [PCI-DSS vs HIPAA](#4-pci-dss-vs-hipaa)
5. [Implementation checklist for developers](#5-implementation-checklist-for-developers)
6. [Relation to IP Blacklist / Allowlist](#6-relation-to-ip-blacklist--allowlist)
7. [References](#7-references)

---

## 1. What is compliance?

**Compliance** = an organization following the regulations, standards, or laws set by governments or industries, so that it operates legally, securely, and in a trustworthy way.

Put simply: **do what the law/regulation requires; violations lead to fines or lawsuits.**

### Why care?

- Avoid fines (can reach millions of USD)
- Keep the business license
- Protect customer data → keep reputation
- Required to sign contracts with large partners (banks, healthcare, government)

### Common compliance categories

| Category | Examples | Sector |
|----------|----------|--------|
| Personal data protection | GDPR (EU), CCPA (California), PDPA (VN) | Global |
| Credit card security | **PCI-DSS** | Payments, e-commerce |
| Healthcare | **HIPAA** (US), PIPEDA (Canada) | Hospitals, health apps |
| Finance | SOX, GLBA, Basel III | Banks, securities |
| Defense | FedRAMP, CMMC | Government, defense contractors |
| System certification | ISO 27001, SOC 2 | All industries |

---

## 2. PCI-DSS — Payment Card Industry Data Security Standard

### 2.1. Overview

- **Issued by:** PCI SSC (Payment Card Industry Security Standards Council) — founded by the 5 major brands: Visa, Mastercard, American Express, Discover, JCB
- **Current version:** PCI-DSS v4.0 (released 2022, mandatory since 2024-03-31)
- **Purpose:** protect cardholder data when it is stored, processed, or transmitted

### 2.2. Who does it apply to?

Every organization that **stores, processes, or transmits card data** — even 1 transaction/month:

- E-commerce (Shopee, Tiki, Shopify stores)
- In-store POS
- Payment gateways (Stripe, Momo, VNPay)
- SaaS that charges via card

### 2.3. Merchant levels (by transaction volume)

| Level | Transactions/year | Audit requirement |
|-------|-------------------|-------------------|
| **Level 1** | > 6 million | Annual on-site assessment by a QSA |
| **Level 2** | 1 – 6 million | Annual Self-Assessment + quarterly scan |
| **Level 3** | 20,000 – 1 million | Annual Self-Assessment + quarterly scan |
| **Level 4** | < 20,000 | Self-Assessment + quarterly scan (depends on acquirer) |

### 2.4. The 12 core requirements (PCI-DSS v4.0)

| # | Requirement | Real-world example |
|---|-------------|--------------------|
| 1 | Secure firewall + router config | Block outside IPs from reaching the DB |
| 2 | Change vendor default passwords | No `admin/admin` |
| 3 | Protect stored cardholder data | Encrypt PAN, never store CVV |
| 4 | Encrypt data in transit | TLS 1.2+ for every payment API |
| 5 | Antivirus + updates | Patch the OS regularly |
| 6 | Secure, patched systems | No dependencies with known CVEs |
| 7 | Restrict access by need-to-know | IP allowlist for DB admin |
| 8 | User authentication | MFA for card systems |
| 9 | Physical access control | Cameras in the server room |
| 10 | Logging + monitoring | Keep audit logs for 1 year |
| 11 | Regular security testing | Annual pentest, quarterly scan |
| 12 | Information security policy | Internal docs, staff training |

### 2.5. Card data — allowed / not allowed to store

| Data | Storage | Notes |
|------|---------|-------|
| PAN (card number) | Yes (must be masked; display at most first 6 + last 4) | Must be encrypted |
| Cardholder name | Yes | Not sensitive on its own |
| Expiry date | Yes | — |
| **CVV/CVC** | **NO (not even encrypted)** | Only used at authorization time |
| **PIN** | **NO (not even encrypted)** | Never store |
| Track data (magstripe) | **NO** | — |

### 2.6. Consequences of violations

- Fines of **$5,000 – $100,000/month** from the bank
- **Card acceptance revoked** = the end of an e-commerce business
- Audit fees of **$30,000 – $500,000/year**
- Brand reputation damage (public disclosure)

### 2.7. Developer best practices

- **Tokenization**: replace the PAN with a token from the payment processor (Stripe, Braintree) → never touch the PAN
- **Scope reduction**: isolate the Cardholder Data Environment (CDE) from the rest of the app
- **Network segmentation**: dedicated VLAN, firewall rules that allow only specific IPs
- **Encryption at rest**: AES-256 for DBs holding PANs
- **Encryption in transit**: TLS 1.2+ (1.3 preferred), HSTS, certificate pinning
- **No logging sensitive data**: scrub CVV and PAN from logs (mask `************4242`)

---

## 3. HIPAA — Health Insurance Portability and Accountability Act

### 3.1. Overview

- **Country:** US (1996)
- **Regulator:** HHS OCR (Department of Health and Human Services — Office for Civil Rights)
- **Purpose:** keep personal health information from leaking or being accessed without authorization

### 3.2. Who does it apply to?

Every organization handling health information in the US:

- **Covered Entities**: hospitals, clinics, doctors, health insurers
- **Business Associates**: SaaS serving healthcare (EHR, telemedicine, health-tracking apps connected to hospitals)

> ⚠️ If your app has US users and stores any health information (test results, prescriptions, BMI from a device...) → it must comply with HIPAA.

### 3.3. The 18 protected PHI identifiers

| # | PHI type | # | PHI type |
|---|----------|---|----------|
| 1 | Name | 10 | Account number |
| 2 | Address | 11 | Certificate/license |
| 3 | Dates (e.g. birth date) | 12 | Vehicle identifier |
| 4 | Phone number | 13 | Device serial |
| 5 | Fax | 14 | URL |
| 6 | Email | 15 | IP address |
| 7 | SSN | 16 | Biometric (fingerprint, voice) |
| 8 | MRN (medical record #) | 17 | Full-face photo |
| 9 | Health plan number | 18 | Any unique identifier |

### 3.4. The 4 main HIPAA rules

| Rule | Requirement | Example |
|------|-------------|---------|
| **Privacy Rule** | Limit who can access PHI | Doctors see only their own patients |
| **Security Rule** | Electronic security (ePHI) | Encryption, audit log, DB IP allowlist |
| **Breach Notification** | Report leaks within 60 days | Email users + government |
| **Enforcement Rule** | Penalties for violations | Fines + audit |

### 3.5. Security Rule — 3 layers of safeguards

#### Administrative Safeguards (policy)

- Regular risk assessment
- Staff training
- Sanction policy for violations
- Incident response plan

#### Physical Safeguards

- Facility access control
- Workstation use policy (lock the screen when leaving the desk)
- Media disposal (wipe HDDs before discarding)

#### Technical Safeguards

| Requirement | Implementation |
|-------------|----------------|
| **Access Control** | Unique user ID, automatic logoff, encryption/decryption |
| **Audit Controls** | Log every PHI access (who, what, when) |
| **Integrity** | Hash/checksum to detect unauthorized changes |
| **Authentication** | MFA for systems holding ePHI |
| **Transmission Security** | TLS 1.2+ for every API transmitting ePHI |

### 3.6. Consequences of violations

| Tier | Culpability | Max fine/violation | Max/year |
|------|-------------|--------------------|----------|
| 1 | Did not know + could not have avoided | $100 | $25,000 |
| 2 | Reasonable cause | $1,000 | $100,000 |
| 3 | Willful neglect + corrected <30 days | $10,000 | $250,000 |
| 4 | Willful neglect + NOT corrected | $50,000 | $1.5M |

- Criminal penalty for knowing violations: up to **5 years in prison**
- Loss of medical practice license

### 3.7. Developer best practices

- **BAA (Business Associate Agreement)**: sign with every vendor handling PHI (AWS, Stripe, SendGrid... must offer a BAA-ready tier)
- **Encryption at rest**: AES-256 for DBs holding ePHI
- **Encryption in transit**: TLS 1.2+, mTLS for service-to-service
- **Minimum Necessary**: return only the PHI fields actually needed (no `SELECT *`)
- **Audit log**: log every PHI access — `who, what, when, why`
- **Breach response**: 60-day notification procedure + database leak tracking

---

## 4. PCI-DSS vs HIPAA

| Criterion | PCI-DSS | HIPAA |
|-----------|---------|-------|
| **Sector** | Payments, credit cards | Healthcare, health information |
| **Jurisdiction** | Global (council) | US (federal) |
| **Protected data** | Cardholder Data (PAN, CVV...) | PHI (Protected Health Information) |
| **Issuing body** | PCI SSC | HHS (US) |
| **Applies to** | Every org handling cards | Covered Entities + Business Associates |
| **Audit** | On-site QSA (Level 1) | Self-assessment + OCR audit |
| **Max penalty** | $100K/month + revocation | $1.5M/year + 5 years in prison |
| **Mandatory encryption** | PAN at rest + in transit | ePHI at rest + in transit (addressable) |
| **Storing sensitive data** | CVV/PIN/track data forbidden | Not forbidden, but strict access |
| **Audit log retention** | 1 year, daily review | 6 years |
| **Breach notification** | Notify bank + card brands | 60 days → users + HHS |

---

## 5. Implementation checklist for developers

### 5.1. Common checklist (applies to both)

- [ ] **TLS 1.2+** for every API endpoint (disable TLS 1.0/1.1)
- [ ] **HSTS** header (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`)
- [ ] **CSP** header (Content-Security-Policy)
- [ ] **MFA** for the admin panel
- [ ] **Audit log** every sensitive action (login, data access, export, delete)
- [ ] **Log retention** of at least 1 year (PCI) / 6 years (HIPAA)
- [ ] **Encryption at rest** (AES-256) for the DB
- [ ] **Backup encryption** + tested restores
- [ ] **Secret management** (AWS KMS, HashiCorp Vault) — never hardcode keys
- [ ] **Dependency scan** (npm audit, Snyk) — do not deploy with critical CVEs
- [ ] **Annual pen test**
- [ ] **Incident response plan** documented + tested

### 5.2. PCI-DSS specific

- [ ] **Tokenization** with the payment processor — never touch the raw PAN
- [ ] **Network segmentation** — isolated CDE
- [ ] **Firewall rules** with an explicit allowlist (no `0.0.0.0/0` inbound)
- [ ] **No PAN in logs** — mask `************4242`
- [ ] **No stored CVV** — not even encrypted
- [ ] **Quarterly ASV scan** (Approved Scanning Vendor)
- [ ] **WAF** for web apps handling payments
- [ ] **Rate limit** on payment endpoints
- [ ] **IP allowlist** for DB admin / internal API

### 5.3. HIPAA specific

- [ ] **BAA** signed with every vendor (AWS, GCP, Stripe, SendGrid, Datadog...)
- [ ] **Minimum Necessary** principle — APIs return only the needed fields
- [ ] **Access log** — `who, what, when, why` for each PHI access
- [ ] **Automatic logoff** after 15 minutes idle
- [ ] **PHI scrubbing** in error messages / stack traces
- [ ] **Breach notification procedure** (60 days) documented
- [ ] **Annual risk assessment**
- [ ] **Annual workforce training** + signed acknowledgment

---

## 6. Relation to IP Blacklist / Allowlist

| Compliance | IP-related requirement | Implementation |
|------------|------------------------|----------------|
| **PCI-DSS** req 1 & 7 | Firewall restricts IPs reaching the CDE | IP allowlist for DB servers, admin panel |
| **HIPAA Security Rule** | ePHI access control | IP allowlist for EHR, audit log of accessing IPs |
| **GDPR** art. 32 | Personal data protection | IP blacklist for known malicious IPs, log accessing IPs |
| **SOC 2** CC6.6 | Logical access control | Allowlist + blacklist + MFA |

### Decision matrix

| Endpoint type | Default policy | Layer |
|---------------|----------------|-------|
| Public API (`/api/v1/products`) | Allow all + blacklist | Blacklist middleware |
| Admin panel (`/admin/*`) | Deny all + allowlist | Allowlist middleware |
| Payment (`/api/v1/charge`) | Allow authenticated + blacklist + rate limit | Blacklist + auth + rate limit |
| Internal API (`/internal/*`) | Deny all + allowlist (VPN/private IP) | Allowlist middleware |
| Webhook (`/webhook/github`) | Allowlist GitHub IP ranges only | Allowlist middleware |
| Health check (`/health`) | Allow all (no sensitive info) | No filter |

---

## 7. References

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

> **Disclaimer:** This document is for reference only. Before a real audit, always consult legal/compliance experts. Regulations change — check the latest version at the official sources.
