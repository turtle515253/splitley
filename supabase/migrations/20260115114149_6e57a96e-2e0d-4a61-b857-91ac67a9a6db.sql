-- Delete all settlements to reset for testing
DELETE FROM settlements WHERE id IN (
  '894f8c5c-733c-4cd1-b019-53b6ebc8694f',
  'e44613a1-e5ed-45a6-b5ab-7fa308390fdd',
  'b17597d6-d236-4832-8457-b90b516ff396'
);