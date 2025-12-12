ALTER TABLE event_staff 
DROP CONSTRAINT IF EXISTS event_staff_user_id_fkey;

ALTER TABLE event_staff
ADD CONSTRAINT event_staff_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles (id)
ON DELETE CASCADE;