-- FIX LOGIC: Role ban đầu cho Google User phải là NULL để ép buộc chọn role
-- CHẠY SCRIPT NÀY TRONG SUPABASE SQL EDITOR

-- 1. Cho phép cột role được phép NULL và XÓA default value "candidate"
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 2. Cập nhật Trigger Logic
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Lấy role từ metadata (nếu có)
  -- Nếu đăng ký Email: metadata sẽ có 'role' (do ta truyền lên) -> Insert đúng role.
  -- Nếu đăng ký Google: metadata không có 'role' -> v_role sẽ là NULL -> Insert NULL.
  IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
     v_role := (new.raw_user_meta_data->>'role')::user_role;
  ELSE
     v_role := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    v_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
