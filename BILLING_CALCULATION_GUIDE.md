# 📊 Billing Calculation Guide

## 🔢 Automatic Calculation Flow

### Step 1: Auto-Calculate Consumption
When `previousreading` or `currentreading` changes:

```javascript
const prev = Number(form.previousreading);
const curr = Number(form.currentreading);
const consumption = curr - prev > 0 ? curr - prev : 0;
```

**Logic:**
- If `current - previous` is **negative**, consumption = `0`
- Otherwise, consumption = `current - previous`

**Examples:**
- Previous: 100, Current: 150 → Consumption: **50 m³**
- Previous: 150, Current: 100 → Consumption: **0 m³** (invalid, negative)

---

### Step 2: Fetch Rates from Customer Type
The system fetches `rate1` and `rate2` from the `customer_type` table:

```javascript
const custType = typeOptions.find(t => t.type === selectedCustomer.type);
```

**Rate Structure:**
- `rate1` → Rate for the first 3 cubic meters
- `rate2` → Rate for consumption above 3 cubic meters

**Example customer_type table:**
| Type | Rate1 | Rate2 |
|------|-------|-------|
| Residential | ₱20 | ₱25 |
| Commercial | ₱30 | ₱35 |
| Industrial | ₱40 | ₱50 |

---

### Step 3: Compute Basic Amount

The calculation happens automatically based on consumption:

```javascript
if (consumption === 0) {
  basic = Number(custType.rate1) || 0; // Minimum charge
} else if (consumption <= 3) {
  basic = consumption * (Number(custType.rate1) || 0);
} else {
  basic = (3 * (Number(custType.rate1) || 0)) +
          ((consumption - 3) * (Number(custType.rate2) || 0));
}
```

#### Calculation Rules:

**Rule 1: Zero Consumption**
- If consumption = 0
- Basic Amount = `rate1` (minimum charge)

**Rule 2: Low Consumption (1-3 m³)**
- If consumption ≤ 3
- Basic Amount = `consumption × rate1`

**Rule 3: High Consumption (>3 m³)**
- If consumption > 3
- Basic Amount = `(3 × rate1) + ((consumption - 3) × rate2)`

---

## 📈 Calculation Examples

### Example 1: Residential Customer - 2 m³
**Customer Type:** Residential (rate1=₱20, rate2=₱25)
**Consumption:** 2 m³

**Calculation:**
```
consumption = 2 (≤ 3)
basic = 2 × ₱20 = ₱40
```

**Result:** ₱40

---

### Example 2: Commercial Customer - 5 m³
**Customer Type:** Commercial (rate1=₱30, rate2=₱35)
**Consumption:** 5 m³

**Calculation:**
```
consumption = 5 (> 3)
basic = (3 × ₱30) + ((5 - 3) × ₱35)
basic = ₱90 + (2 × ₱35)
basic = ₱90 + ₱70
basic = ₱160
```

**Result:** ₱160

---

### Example 3: Residential Customer - 0 m³
**Customer Type:** Residential (rate1=₱20, rate2=₱25)
**Consumption:** 0 m³

**Calculation:**
```
consumption = 0
basic = ₱20 (minimum charge)
```

**Result:** ₱20

---

### Example 4: Industrial Customer - 10 m³
**Customer Type:** Industrial (rate1=₱40, rate2=₱50)
**Consumption:** 10 m³

**Calculation:**
```
consumption = 10 (> 3)
basic = (3 × ₱40) + ((10 - 3) × ₱50)
basic = ₱120 + (7 × ₱50)
basic = ₱120 + ₱350
basic = ₱470
```

**Result:** ₱470

---

## 🔄 Complete Billing Formula

Once the basic amount is calculated, the system applies:

### 1. Discount (if applicable)
```javascript
discountAmount = basicAmount × (customerDiscount / 100)
```

### 2. Surcharge (if overdue)
```javascript
surchargeAmount = calculated based on due date and billing month
```

### 3. Total Bill Amount
```javascript
totalBill = basicAmount + surchargeAmount - discountAmount
```

---

## 💻 Implementation in BillModal.js

The calculation is triggered automatically via `handleFormChange()`:

```javascript
const handleFormChange = (field, value) => {
  const newFormData = { ...formData, [field]: value }
  
  // Step 1: Calculate consumption
  if (field === 'previousreading' || field === 'currentreading') {
    const prev = parseFloat(newFormData.previousreading) || 0
    const curr = parseFloat(newFormData.currentreading) || 0
    newFormData.consumption = Math.max(0, curr - prev)
  }
  
  // Step 2: Calculate basic amount
  if (field === 'consumption' || field === 'previousreading' || field === 'currentreading') {
    const customerType = customerTypes.find(ct => ct.type === selectedCustomer?.type)
    if (customerType && newFormData.consumption >= 0) {
      newFormData.basicamount = billingService.calculateBasicAmount(
        newFormData.consumption, 
        customerType
      )
    }
  }
  
  // Step 3: Calculate discount
  if (selectedCustomer) {
    const discountPercent = selectedCustomer.discount || 0
    newFormData.discountamount = billingService.calculateDiscountAmount(
      newFormData.basicamount, 
      discountPercent
    )
  }
  
  // Step 4: Calculate surcharge
  if (newFormData.billedmonth && surchargeSettings && newFormData.basicamount > 0) {
    const tempBill = {
      billedmonth: newFormData.billedmonth,
      basicamount: newFormData.basicamount
    }
    const surchargeInfo = paymentService.calculateSurcharge(tempBill, surchargeSettings)
    newFormData.surchargeamount = surchargeInfo.surchargeAmount || 0
  }
  
  // Step 5: Calculate total
  newFormData.totalbillamount = 
    parseFloat(newFormData.basicamount || 0) + 
    parseFloat(newFormData.surchargeamount || 0) - 
    parseFloat(newFormData.discountamount || 0)
  
  setFormData(newFormData)
}
```

---

## ✅ Validation Rules

### Consumption Validation
- ✅ Negative consumption automatically set to 0
- ✅ Current reading < Previous reading triggers warning

### Form Validation
- ✅ Customer must be selected
- ✅ Billing month is required
- ✅ Current reading cannot be less than previous reading
- ✅ Duplicate bills prevented (same customer + month)

---

## 🎯 User Experience

**Real-Time Calculations:**
- ✅ Consumption updates as you type readings
- ✅ Basic amount updates when consumption changes
- ✅ Discount applies automatically based on customer
- ✅ Surcharge calculates based on billing month
- ✅ Total updates instantly

**Visual Feedback:**
- 💰 Basic Amount - Bold, primary color
- ⚠️ Surcharge - Red (danger)
- 💚 Discount - Green (success)
- 🎯 Total Bill - Large, bold, primary

---

## 📋 Database Schema Required

### customer_type table
```sql
CREATE TABLE customer_type (
  type TEXT PRIMARY KEY,
  rate1 NUMERIC NOT NULL,  -- Rate for first 3 cubic meters
  rate2 NUMERIC NOT NULL   -- Rate for consumption > 3 cubic meters
);
```

### Example Data
```sql
INSERT INTO customer_type (type, rate1, rate2) VALUES
('Residential', 20.00, 25.00),
('Commercial', 30.00, 35.00),
('Industrial', 40.00, 50.00);
```

---

## 🔧 Calculation Logic Location

**Service Layer:**
- `src/services/billingService.js` → `calculateBasicAmount()`

**Component Layer:**
- `src/components/billing/BillModal.js` → `handleFormChange()`

---

**✅ All calculations are automatic, real-time, and validated!**
