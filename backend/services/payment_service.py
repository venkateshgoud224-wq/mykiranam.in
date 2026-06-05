'''Payment service handling commitment payments via Razorpay.'''
import razorpay
from datetime import datetime
from ..config.db import db  # Assuming db export

# Assuming ORM models are defined elsewhere; using raw SQL via db

class CommitmentPaymentService:
    def __init__(self, key_id, key_secret):
        self.client = razorpay.Client(auth=(key_id, key_secret))

    def calculate_commitment(self, order_amount_paise: int) -> int:
        # 10% of order amount, capped at ₹50 (5000 paise)
        ten_percent = order_amount_paise // 10
        cap = 5000
        return min(ten_percent, cap)

    def create_payment(self, order_id: int, amount_paise: int) -> dict:
        """Create Razorpay order for the commitment amount and persist record."""
        razor_order = self.client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"commitment_{order_id}_{int(datetime.utcnow().timestamp())}",
            "payment_capture": 1,
        })
        # Insert commitment payment record
        insert_query = """
            INSERT INTO commitment_payments (order_id, amount, status)
            VALUES (%s, %s, %s)
        """
        db.query(insert_query, (order_id, amount_paise, 'pending'))
        return razor_order

    def verify_payment(self, razorpay_payment_id: str, razorpay_order_id: str, razorpay_signature: str) -> bool:
        return self.client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })

    def mark_paid(self, order_id: int):
        update_query = """
            UPDATE commitment_payments SET status = 'paid', updated_at = %s WHERE order_id = %s AND status = 'pending'
        """
        db.query(update_query, (datetime.utcnow(), order_id))

    def process_refund(self, order_id: int, processing_fee_paise: int = 1000):
        # Fetch commitment payment
        cp = db.query("SELECT * FROM commitment_payments WHERE order_id = %s", (order_id,)).rows[0]
        if cp['status'] != 'paid':
            raise ValueError('Cannot refund a non‑paid commitment')
        refund_amount = max(cp['amount'] - processing_fee_paise, 0)
        # Placeholder for Razorpay refund if needed
        # self.client.payment.refund(cp['razorpay_payment_id'], refund_amount)
        db.query("UPDATE commitment_payments SET status = 'refunded', updated_at = %s WHERE id = %s", (datetime.utcnow(), cp['id']))
        return refund_amount

    def settle_to_seller(self, order_id: int, seller_share_pct: int = 60):
        cp = db.query("SELECT * FROM commitment_payments WHERE order_id = %s AND status = 'paid'", (order_id,)).rows[0]
        seller_amount = cp['amount'] * seller_share_pct // 100
        platform_amount = cp['amount'] - seller_amount
        # Transfer logic can be implemented as needed
        db.query("UPDATE commitment_payments SET status = 'settled', updated_at = %s WHERE id = %s", (datetime.utcnow(), cp['id']))
        return seller_amount, platform_amount
