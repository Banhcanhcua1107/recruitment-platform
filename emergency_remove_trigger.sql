-- SCRIPT XÓA TRIGGER (CHẠY CÁI NÀY ĐỂ HẾT LỖI ĐĂNG NHẬP)
-- Do trigger hiện tại đang gây lỗi permission/logic trên server Supabase của bạn
-- Chúng ta sẽ xóa nó đi và để Code (Server Actions) tự xử lý việc tạo profile.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Đảm bảo quyền Insert cho code chạy
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
