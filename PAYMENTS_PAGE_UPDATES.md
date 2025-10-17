# PaymentsPage Multi-Tab Feature Implementation

## Overview
Updated the PaymentsPage component to support multiple customer tabs, allowing users to work with multiple customers simultaneously without losing their context.

## Key Changes

### 1. State Management Refactoring
- **Replaced**: Single customer state (`selectedCustomer`, `unpaidBills`, `paymentHistory`, `selectedBills`)
- **With**: Array of customer tab objects (`customerTabs`)
- Each tab contains:
  - `customer`: Customer information
  - `unpaidBills`: Unpaid bills for the customer
  - `paymentHistory`: Payment history
  - `billsWithSurcharge`: Bills with calculated surcharges
  - `selectedBills`: Currently selected bills for payment

### 2. Tab Management
- **activeTab**: Now tracks either 'search' or a customer ID
- **Multiple Tabs**: Users can open multiple customers in separate tabs
- **Tab Switching**: Click on any tab to switch between customers
- **Close Button**: Each customer tab has a close button (X) to close individual tabs

### 3. New Functions

#### `handleSelectCustomer(customer)`
- Checks if customer already has a tab open
- If yes: switches to existing tab
- If no: loads customer data and creates new tab
- Automatically calculates surcharges for the bills

#### `handleCloseTab(customerid)`
- Removes the specified customer tab
- Auto-switches to another tab or search if closing active tab

#### `updateSelectedBills(bills)`
- Updates the selected bills for the currently active customer tab

#### `reloadCustomerData(customerid)`
- Reloads unpaid bills and payment history for a specific customer
- Recalculates surcharges
- Clears selected bills

#### `calculateBillsWithSurcharge(bills)`
- Helper function to calculate surcharges for a list of bills
- Returns bills with `surchargeInfo` and `calculatedTotal`

#### `getActiveCustomerTab()`
- Returns the currently active customer tab object

### 4. UI Updates

#### Tab Bar
- Shows "Customer Search" tab (always present)
- Shows one tab for each open customer
- Each customer tab displays:
  - Customer name
  - Close button (X)
  - Active state highlighting

#### Header Button
- Changed from "New Customer" to "Search Customers"
- Only visible when there are open customer tabs
- Switches to search tab when clicked

#### Payment Processing Content
- Wrapped in an IIFE to extract current tab data
- All references updated to use tab-specific data
- Bill selection and payment processing work per-tab

## Benefits

1. **Multi-tasking**: Work with multiple customers without losing context
2. **Efficiency**: No need to search for the same customer multiple times
3. **Context Preservation**: Each tab maintains its own state (selected bills, etc.)
4. **Flexibility**: Close tabs you're done with, keep others open
5. **User-Friendly**: Familiar tab interface similar to web browsers

## Usage Flow

1. Search for customers in the "Customer Search" tab
2. Click "Select" on a customer → Opens new tab with customer name
3. Select bills and process payments
4. Search for another customer → Opens another new tab
5. Switch between tabs as needed
6. Close tabs when done with a customer (X button)
7. All tabs remain independent with their own data
