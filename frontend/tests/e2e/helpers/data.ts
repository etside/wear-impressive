/**
 * Test data helpers. Every call produces fresh, unique values so
 * tests can run repeatedly against a shared backend without conflict.
 */

export function uniqueId(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}

export interface VendorCreds {
  name: string;
  storeName: string;
  storeHandle: string;
  email: string;
  phone: string;
  password: string;
}

export function newVendorCreds(): VendorCreds {
  const id = uniqueId();
  // Bangladeshi phone-style number (11 digits, 017xxxxxxxx)
  const phoneDigits = Math.floor(10000000 + Math.random() * 89999999).toString();
  return {
    name: `Test Vendor ${id.slice(0, 6)}`,
    storeName: `Test Store ${id.slice(0, 6)}`,
    storeHandle: `test-${id}`.slice(0, 40),
    email: `vendor-${id}@example.com`,
    phone: `017${phoneDigits.slice(0, 8)}`,
    password: 'Password123!',
  };
}

export interface CustomerCreds {
  name: string;
  email: string;
  password: string;
}

export function newCustomerCreds(): CustomerCreds {
  const id = uniqueId();
  return {
    name: `Test Customer ${id.slice(0, 6)}`,
    email: `customer-${id}@example.com`,
    password: 'Password123!',
  };
}
