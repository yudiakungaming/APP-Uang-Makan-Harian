# Security Specification: Anti-Fraud Geofence & Meal Allowance App

This specification document outlines the security invariants, anti-forge measures, and test boundaries designed to protect the integrity of daily employee check-ins and premium meal allowance allocations.

## 1. Data Invariants

1. **Uang Makan Cap Constraint**: The daily meal allowance (`amountSpent`) must be strictly capped at **Rp 25.000,-** per check-in. Any payload requesting a higher amount must be rejected.
2. **Employee Bind Constraint**: An employee can only check themselves in. The `employeeEmail` field in the attendance document must exactly equal the authenticated account's verified email.
3. **No Retrospective Forgery**: Attendance records are Append-Only for employees. Employees cannot edit (`update`) or remove (`delete`) any committed attendance record to cover up simulated positions or duplicate dates.
4. **Admin Monopoly**: Only the verified administrator (`yudiakungaming@gmail.com`) can create/delete employees, update geofence parameters (coordinates, default allowance, office name), or view aggregate payroll lists for other departments.
5. **Verified Email Mandate**: To prevent malicious accounts from spoofing valid corporate emails, all write accesses require standard authentication with verified email.

---

## 2. The "Dirty Dozen" Cheat Payloads
Below are 12 malicious payloads designed to test the robustness of the Firestore Rules security gates. All of these must be rejected with `PERMISSION_DENIED`.

### Exploit Type A: Privilege Escalation & Role Hijacking
*   **Payload 1 (Ad-hoc admin write)**: A regular employee attempts to create another employee document with custom admin perks.
*   **Payload 2 (Self-promotion in profile)**: An employee attempts to update their own record in the `employees` collection to set themselves as an administrator.

### Exploit Type B: Financial Forgery & Allowance Inflation
*   **Payload 3 (Inflation)**: An employee submits a check-in with `amountSpent: 2500000` (Rp 2,5 Juta) instead of the configured Rp 25.000.
*   **Payload 4 (Ghost Claim)**: An employee uploads an attendance record for a non-existent or deleted employee ID to double-claim money.
*   **Payload 5 (Double Check-in)**: An employee submits a second check-in record for the same date (managed client-side and verified via date index).

### Exploit Type C: Identity Spoofing & Identity Hijacking
*   **Payload 6 (Identity Theft)**: Account `staf-a@corp.com` attempts to insert an attendance record with `employeeEmail: "staf-b@corp.com"`.
*   **Payload 7 (Orphaned Record)**: An unauthenticated guest tries to list or write into the `attendanceRecords` collection.
*   **Payload 8 (Third-party snooping)**: Employee A tries to list current logs of Employee B using direct SDK queries.

### Exploit Type D: Parameter Poisoning & Geo-spoofing
*   **Payload 9 (Geofence Expansion)**: A regular employee attempts to write to `/settings/geofence` to increase the office radius to 50,000 meters.
*   **Payload 10 (Null coordinates inject)**: An employee injects non-numeric characters into latitude/longitude fields of attendance records to crash audit tools.
*   **Payload 11 (Oversized Document Denial-of-Wallet)**: Storing a 1MB junk variable to inflate storage fees.
*   **Payload 12 (Log Eraser)**: An employee attempts to delete a suspicious log of their own coordinate telemetry.

---

## 3. Test Verification Blueprint

The Firestore local ruleset will assert:
1. `request.auth.token.email_verified == true`
2. `request.auth.token.email == 'yudiakungaming@gmail.com'` for admin access
3. `incoming().employeeEmail == request.auth.token.email` on attendance writes
4. Complete prevention of `update` and `delete` on `attendanceRecords` by non-admins
5. Strict schema key length constraints on settings and logs.
