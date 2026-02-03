-- Create a table to store column mappings for CSV imports
CREATE TABLE IF NOT EXISTS public.import_column_mappings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    file_type text NOT NULL, -- 'division' or 'registration'
    headers_hash text NOT NULL,
    mapping jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (file_type, headers_hash)
);

-- Enable Row Level Security
ALTER TABLE public.import_column_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow authenticated users to insert/update mappings (anyone can save a mapping)
CREATE POLICY "Allow authenticated users to insert mappings"
ON public.import_column_mappings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own mappings (or any mapping if it's a shared resource)
-- Since we want global suggestions, we allow any authenticated user to update the mapping for a specific hash
CREATE POLICY "Allow authenticated users to update mappings"
ON public.import_column_mappings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read mappings
CREATE POLICY "Allow authenticated users to read mappings"
ON public.import_column_mappings FOR SELECT
TO authenticated
USING (true);

-- Create index for faster lookups based on file type and headers hash
CREATE INDEX idx_import_column_mappings_lookup 
ON public.import_column_mappings (file_type, headers_hash);
