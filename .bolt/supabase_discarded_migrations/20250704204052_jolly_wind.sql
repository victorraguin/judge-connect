/*
  # Add is_public column to questions table

  1. Changes
    - Add `is_public` boolean column to `questions` table with default value `false`
    - Add index on `is_public` column for better query performance
    - Update RLS policies to handle public questions visibility

  2. Security
    - Maintain existing RLS policies
    - Ensure public questions are visible to all authenticated users
    - Private questions remain visible only to owners, assigned judges, and admins
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
    user_id = uid() OR 
    assigned_judge_id = uid() OR 
    is_public = true OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'::user_role
    )
  );