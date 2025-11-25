-- Enable real-time updates for system_settings table
-- Migration: 20250101000009_fix_system_settings_realtime.sql

-- Enable real-time for system_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- Create a function to notify when system settings change
CREATE OR REPLACE FUNCTION notify_system_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify clients about the change
  PERFORM pg_notify(
    'system_settings_changed',
    json_build_object(
      'company_id', NEW.company_id,
      'tax_rate', NEW.tax_rate,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to notify on system settings changes
DROP TRIGGER IF EXISTS system_settings_change_notify ON system_settings;
CREATE TRIGGER system_settings_change_notify
  AFTER UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION notify_system_settings_change();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON system_settings TO authenticated;



