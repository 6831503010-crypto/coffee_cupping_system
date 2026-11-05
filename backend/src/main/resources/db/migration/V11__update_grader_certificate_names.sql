-- Project test credentials, not real qualification records.

UPDATE grader_credentials
SET certificate_name = CASE license_code
    WHEN 'Q-900001' THEN 'P''Moon'
    WHEN 'Q-900002' THEN 'Bhone Myat Paing'
    WHEN 'Q-900003' THEN 'Shwe Yee Thein'
    WHEN 'Q-900004' THEN 'Myo Satt Kyaw'
    WHEN 'Q-900005' THEN 'Kyaw Min Khant'
END
WHERE license_code IN (
    'Q-900001',
    'Q-900002',
    'Q-900003',
    'Q-900004',
    'Q-900005'
);
