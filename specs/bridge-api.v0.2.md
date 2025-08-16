# Blockchain Payment Bridge API Specification v0.2

This updated specification introduces **insurance pool contribution** and cancellation forfeiture logic to ensure ride protection even in the case of cancellations.

---

## 🔧 New Feature: Insurance Pool Contribution

When a rider books a ride, they may optionally contribute to an **insurance pool**. This contribution is:
- Non-refundable if the ride is cancelled
- Held in a separate smart contract-managed pool
- Used to cover future cancellation-related losses

### 💡 Why?
This ensures that cancellation-related financial risks can be offset by pooling small, voluntary rider contributions. The system encourages collective ride reliability while remaining optional.

---

## 🆕 New API Fields & Behavior

### `/api/escrow/initiate`

**Updated JSON body:**
```json
{
  "rideId": "ride_xyz",
  "riderWallet": "0x...",
  "driverWallet": "0x...",
  "amount": "15.00",
  "currency": "ETH",
  "insuranceContribution": "0.50", // Optional
  "referrerId": "user_abc" // Optional
}
```

**New behavior:**
- If `insuranceContribution` is provided, it is sent to a dedicated `InsurancePool` smart contract
- Insurance contribution is **non-refundable** in case of cancellation

---

## 🧠 Smart Contract Logic Update

Two contracts will now be deployed:

1. **Escrow Contract (per ride)**  
   - Holds payment for the driver
   - Releases or refunds based on ride events

2. **InsurancePool.sol (global)**  
   - Accepts contributions during `initiate`
   - Holds funds for cancellation compensation
   - Logs each contribution for audit

### New Function in Escrow Contract:

```solidity
function contributeToInsurance(address contributor, uint256 amount) external {
    // Called during ride initiation if contribution provided
    InsurancePool(poolAddress).deposit{value: amount}(contributor);
}
```

---

## 🔁 Ride Cancellation Flow

### `/api/escrow/cancel` behavior update:

- The rider’s insurance contribution (if any) is **not refunded**
- Only the ride fee is partially refunded (if applicable)
- InsurancePool logs the contribution as a retained cancellation offset

---

## 📊 Transparency

A future API endpoint (`/api/pool/status`) will expose:
- Total pool balance
- Number of contributors
- Number of covered cancellations

---

## 🔄 Spec Versioning

This is **v0.2** of the specification.  
Previous version: [`specs/bridge-api.v0.1.md`](bridge-api.v0.1.md)

---

## ✅ Summary

- Riders can opt-in to a small insurance fee
- Fee is collected in a secure, auditable smart contract
- Cancelled rides forfeit insurance contribution
- Pool grows to protect future drivers or subsidize rebooking logic
