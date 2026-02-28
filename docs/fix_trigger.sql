-- Trigger để tự động tạo profile khi có user mới đăng ký (Email hoặc Google)
-- COPY TOÀN BỘ VÀ CHẠY TRONG SUPABASE SQL EDITOR

-- 1. Xóa trigger và function cũ nếu có để tránh conflict
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Tạo Function xử lý việc tạo profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'candidate') -- Mặc định là candidate nếu không có role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER: Chạy function với quyền admin, bỏ qua RLS để tránh lỗi permission

-- 3. Gắn Trigger vào bảng auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
