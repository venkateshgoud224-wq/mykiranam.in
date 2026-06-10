-- Add AI Support Resolution columns to complaints table
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20) DEFAULT 'None' CHECK (ai_priority IN ('None', 'Low', 'Medium', 'High'));
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_risk_score INT DEFAULT 0;

-- Update the CHECK constraint on status to include 'Escalated'
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN ('Open', 'Under Review', 'Seller Responded', 'Escalated', 'Resolved', 'Closed'));
