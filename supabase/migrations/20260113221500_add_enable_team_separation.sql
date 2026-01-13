-- Migration to add enable_team_separation to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS enable_team_separation BOOLEAN DEFAULT TRUE;

comment on column events.enable_team_separation is 'Enable/Disable logic to separate teammates in brackets';
