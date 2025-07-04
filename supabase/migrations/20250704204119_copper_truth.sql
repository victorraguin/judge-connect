/*
  # Add is_public column to questions table

  1. New Columns
    - `is_public` (boolean, default false) - Determines if question is visible to all users

  2. Security
    - Update RLS policy to handle public questions visibility
    - Add index for better query performance

  3. Changes
    - Questions can now be marked as public or private
    - Public questions are visible to all authenticated users
    - Private questions remain visible only to owner, assigned judge, and admins
*/

-- Add is_public column to questions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE questions ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add index for better performance on public questions queries
CREATE INDEX IF NOT EXISTS idx_questions_is_public ON questions (is_public);

-- Update the existing RLS policy for SELECT to handle public questions
DROP POLICY IF EXISTS "Users can view own questions" ON questions;

CREATE POLICY "Users can view accessible questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    assigned_judge_id = auth.uid() OR 
    is_public = true OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );