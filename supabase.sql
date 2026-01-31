////// profiles.sql
-- 1. Tạo loại dữ liệu Enum cho vai trò
CREATE TYPE user_role AS ENUM ('candidate', 'hr');

-- 2. Tạo bảng profiles (Hồ sơ người dùng)
create table public.profiles (
  id uuid not null,
  full_name text null,
  email text null,
  avatar_url text null,
  role public.user_role null default 'candidate'::user_role,
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- 3. Bật Row Level Security (RLS) để bảo mật
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Cho phép người dùng xem hồ sơ của chính mình
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- 5. Cho phép người dùng cập nhật hồ sơ của chính mình
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

//////