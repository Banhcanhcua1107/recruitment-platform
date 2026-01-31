-- COPY VÀ CHẠY TOÀN BỘ SCRIPT NÀY. ĐÂY LÀ SCRIPT SỬA LỖI CUỐI CÙNG.

-- 1. Sửa cột role: Cho phép NULL (để Google Login không bị lỗi)
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 2. Đảm bảo Policy cho phép INSERT (Đề phòng trường hợp User tự tạo profile)
DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles 
        FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Cấp quyền cho Trigger (Quan trọng)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Tạo lại Trigger với cơ chế "Try-Catch" (Không chặn đăng nhập nếu lỗi profile)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Xử lý role
  IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
     v_role := (new.raw_user_meta_data->>'role')::user_role;
  ELSE
     v_role := NULL;
  END IF;

  -- Thử tạo profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      new.email,
      v_role
    );
  EXCEPTION WHEN OTHERS THEN
    -- Nếu lỗi, chỉ ghi log, KHÔNG chăn đăng nhập
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
