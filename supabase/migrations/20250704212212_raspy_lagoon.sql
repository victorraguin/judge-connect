/*
  # Update Victor as Admin

  1. Changes
    - Set victor.raguin@live.fr as admin role
    - Ensure proper permissions for admin access

  2. Security
    - Admin role grants full access to platform management
*/

-- Update Victor's role to admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'victor.raguin@live.fr';

-- Verify the update
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'victor.raguin@live.fr';