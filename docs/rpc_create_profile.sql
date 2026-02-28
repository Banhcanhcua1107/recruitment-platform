-- Function to create profile securely (bypassing RLS for registration)
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  _id uuid,
  _email text,
  _full_name text,
  _role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges
SET search_path = public -- Secure search path
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (_id, _email, _full_name, _role)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = now();
END;
$$;

-- Grant permission to anonymous/authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.create_profile_for_user(uuid, text, text, user_role) TO anon, authenticated, service_role;
