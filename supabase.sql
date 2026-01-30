////// profiles.sql
-- 1. Tạo loại dữ liệu Enum cho vai trò
CREATE TYPE user_role AS ENUM ('candidate', 'hr');

-- 2. Tạo bảng profiles (Hồ sơ người dùng)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'candidate',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

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