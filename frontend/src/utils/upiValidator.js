/**
 * Utility functions to validate and format UPI Deep Link parameters according to NPCI / UPI specifications.
 */

/**
 * Validates a UPI ID (VPA).
 * Format: username@bankname
 * No spaces, only alphanumeric and characters like dot, hyphen, underscore.
 */
export const validateUpiId = (upiId) => {
  if (!upiId) {
    return { isValid: false, error: "UPI ID is required." };
  }
  
  if (upiId.includes(" ")) {
    return { isValid: false, error: "UPI ID cannot contain spaces." };
  }

  // Basic VPA Regex
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,256}$/;
  if (!vpaRegex.test(upiId)) {
    return { isValid: false, error: "Invalid UPI ID format. Should be like username@bank." };
  }

  return { isValid: true };
};

/**
 * Validates a UPI Transaction Amount.
 * Must be a positive number up to 2 decimal places.
 */
export const validateAmount = (amount) => {
  if (amount === undefined || amount === null || amount === '') {
    return { isValid: false, error: "Amount is required." };
  }

  const amtNum = parseFloat(amount);
  if (isNaN(amtNum) || amtNum <= 0) {
    return { isValid: false, error: "Amount must be a positive number." };
  }

  // Regex to ensure maximum of 2 decimal places
  const decimalRegex = /^\d+(\.\d{1,2})?$/;
  if (!decimalRegex.test(amount.toString())) {
    return { isValid: false, error: "Amount must have at most 2 decimal places (e.g. 10.50)." };
  }

  if (amtNum > 100000) {
    return { isValid: false, error: "Amount exceeds typical single UPI transaction limit of ₹1,00,000." };
  }

  return { isValid: true };
};

/**
 * Validates other UPI parameters (Seller Name, Order ID / Note).
 */
export const validateNoteAndName = (name, note) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: "Seller Name is required." };
  }

  if (note && note.length > 50) {
    return { isValid: false, error: "Transaction Note (Order ID) cannot exceed 50 characters." };
  }

  // Check for characters that must be encoded
  const specialCharRegex = /[^a-zA-Z0-9\s.\-_]/;
  if (specialCharRegex.test(name) || (note && specialCharRegex.test(note))) {
    return { isValid: true, warning: "Parameters contain special characters. Ensure they are properly URL-encoded." };
  }

  return { isValid: true };
};

/**
 * Builds a valid, compliant UPI deep link.
 */
export const buildUpiDeepLink = (upiId, sellerName, amount, orderId, appProtocol = 'upi') => {
  const cleanUpiId = upiId.trim();
  const encodedName = encodeURIComponent(sellerName.trim());
  const formattedAmount = parseFloat(amount).toFixed(2);
  const encodedNote = encodeURIComponent((orderId || '').trim());

  let baseProtocol = 'upi://pay';
  
  if (appProtocol === 'phonepe') {
    baseProtocol = 'phonepe://pay';
  } else if (appProtocol === 'gpay') {
    baseProtocol = 'tez://upi/pay';
  } else if (appProtocol === 'paytm') {
    baseProtocol = 'paytmmp://pay';
  } else if (appProtocol === 'bhim') {
    baseProtocol = 'bhim://pay';
  }

  return `${baseProtocol}?pa=${cleanUpiId}&pn=${encodedName}&am=${formattedAmount}&tn=${encodedNote}&cu=INR`;
};

/**
 * Checks browser/device compatibility warnings.
 */
export const getBrowserCompatibilityInfo = () => {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown Browser";
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  let warning = null;

  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
  } else if (userAgent.indexOf("SamsungBrowser") > -1) {
    browserName = "Samsung Internet";
  } else if (userAgent.indexOf("Edg") > -1) {
    browserName = "Edge";
  }

  if (!isMobile) {
    warning = "UPI deep links are only fully functional on mobile devices with installed UPI applications.";
  } else if (browserName === "Firefox") {
    warning = "Firefox Mobile sometimes blocks external protocol handlers. Chrome or Safari is recommended.";
  }

  return { browserName, isMobile, warning };
};
