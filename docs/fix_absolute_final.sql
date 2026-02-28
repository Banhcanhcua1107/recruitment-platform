-- SCRIPT SỬA LỖI TOÀN DIỆN (CHẠY CÁI NÀY LÀ ĐỦ)
-- Copy toàn bộ và chạy trong Supabase SQL Editor

-- 1. Tạo Type user_role an toàn (nếu chưa có)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'hr');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tạo bảng profiles an toàn (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role user_role DEFAULT NULL, 
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Sửa lại cột role (cho phép NULL) - đảm bảo bảng đã có constraints đúng
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 4. Bật RLS và cấp quyền (tránh lỗi permission)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. Trigger Function Siêu An Toàn (Crash-Proof)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_role_str text;
  v_role_enum user_role;
BEGIN
  -- Lấy role raw dạng text để tránh lỗi type ngay từ đầu
  v_role_str := new.raw_user_meta_data->>'role';

  -- Cast sang enum an toàn (trong block riêng)
  BEGIN
    IF v_role_str IS NOT NULL THEN
       v_role_enum := v_role_str::user_role;
    ELSE
       v_role_enum := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role_enum := NULL; -- Nếu sai format role thì fallback về NULL luôn
  END;

  -- Thực hiện Insert với bọc lỗi (Try-Catch)
  -- Nếu insert profile thất bại, Auth User vẫn được tạo thành công
  BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      new.email,
      v_role_enum
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ghi log lỗi để debug, nhưng KHÔNG CHẶN user
    RAISE WARNING 'Lỗi tạo profile cho user %: %', new.id, SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Gắn lại Trigger mới nhất
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
