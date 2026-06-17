const text = "SELECT id FROM orders WHERE customer_id = $1 AND order_status NOT IN ('Delivered', 'Cancelled')";
const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();

console.log("Normalized Query:", normalizedText);
console.log("Includes customer_id = $1:", normalizedText.includes('customer_id = $1'));
console.log("Includes check (no space):", normalizedText.includes("order_status not in ('delivered','cancelled')"));
console.log("Includes check (with space):", normalizedText.includes("order_status not in ('delivered', 'cancelled')"));
