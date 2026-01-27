-- Add unique constraint for upsert functionality
ALTER TABLE external_reviewer_sessions 
ADD CONSTRAINT unique_ip_page_type UNIQUE (ip_address, page_type);