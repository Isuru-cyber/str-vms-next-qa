-- Fix sequences and clean template newlines
-- 1. Reset serial sequences to avoid duplicate key errors
SELECT setval(pg_get_serial_sequence('invoice_pods', 'id'), coalesce(max(id), 0) + 1, false) FROM invoice_pods;
SELECT setval(pg_get_serial_sequence('trip_reconciliations', 'id'), coalesce(max(id), 0) + 1, false) FROM trip_reconciliations;
SELECT setval(pg_get_serial_sequence('trip_gate_passes', 'id'), coalesce(max(id), 0) + 1, false) FROM trip_gate_passes;

-- 2. Clean literal escaped newlines in mail_templates
UPDATE mail_templates
SET body = replace(replace(replace(body, E'\\r\\n', E'\n'), E'\r\n', E'\n'), E'\\n', E'\n')
WHERE body LIKE '%\r%' OR body LIKE '%\\n%';
