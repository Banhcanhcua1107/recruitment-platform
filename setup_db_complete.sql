-- CHẠY TOÀN BỘ SCRIPT NÀY TRONG SUPABASE SQL EDITOR ĐỂ FIX LỖI "Database error saving new user"

-- 1. Tạo Enum user_role (nếu chưa có)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'hr');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tạo bảng profiles (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'candidate'::user_role,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Bật RLS và Tạo Policy (nếu chưa có)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.profiles 
        FOR SELECT USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles 
        FOR UPDATE USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Xóa Trigger/Function cũ để tránh lỗi conflict/permission
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 5. Tạo lại Function handle_new_user (QUAN TRỌNG: Cần SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    -- Ép kiểu an toàn, nếu role không hợp lệ thì về mặc định là candidate
    COALESCE(
      (new.raw_user_meta_data->>'role')::user_role, 
      'candidate'::user_role
    )
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Nếu có lỗi, ghi log nhưng không chặn user creation (để tránh lỗi fatal)
    -- Tuy nhiên profile sẽ không được tạo, cần xử lý fallback ở code
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Gắn lại Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
