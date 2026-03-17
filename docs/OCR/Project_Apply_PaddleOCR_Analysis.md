# Project Apply PaddleOCR Analysis

## 1. Mục tiêu của lượt sửa này

Lượt sửa này tập trung đưa OCR editor về đúng flow 2 cột ổn định:

- bên trái luôn hiển thị CV gốc
- bên phải chỉ có 2 trạng thái:
  - đang xử lý: hiển thị tiến trình OCR/parsing
  - đã hoàn tất: hiển thị nội dung cuối cùng

Đồng thời backend được siết lại theo hướng content-first:

- đọc toàn bộ tài liệu nhiều trang
- không truncate nội dung
- giảm rơi block, rơi sidebar và nhảy section
- ưu tiên giữ full content nếu parser chưa map hoàn hảo

## 2. Nguyên nhân trước đây quét xong vẫn còn hiện trạng thái quét

Nguyên nhân chính nằm ở [OCRPreviewModal.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRPreviewModal.tsx).

Trước khi khóa lại flow:

- UI trải qua nhiều màn trung gian khác nhau
- panel phải dùng lại trạng thái phân tích ngay cả khi đã có kết quả
- shell preview và shell kết quả không có một điểm mount ổn định duy nhất

Hệ quả:

- người dùng có cảm giác panel trạng thái là “màn cuối”
- tiến trình và kết quả bị lẫn lifecycle
- preview và result không có vai trò tách bạch rõ

## 3. Nguyên nhân OCR bị thiếu nội dung hoặc nhảy section

### 3.1. Thiếu nội dung

Các điểm gây thiếu nội dung nằm ở:

- fallback section trong [cv_layout_parser.py](/D:/Maucv/recruitment-platform/ai-service/services/cv_layout_parser.py) chưa phủ đủ:
  - thông tin liên hệ
  - chứng chỉ
  - hoạt động
  - sở thích
- parser trước đó có xu hướng chỉ giữ phần map tốt, còn các line bổ sung dễ bị rơi
- DOCX đi đường tắt direct parse nên không đi theo cùng pipeline page-based như PDF/image

### 3.2. Nhảy section

Các điểm dễ làm line nhảy section:

- fallback line không được merge lại vào section cùng loại
- tách entry theo date quá sớm trong `_split_entries_by_dates()`
- CV 2 cột cần vừa đọc đúng reading order theo cột, vừa có fallback heading để giữ sidebar

## 4. File đã sửa

- [OCRPreviewModal.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRPreviewModal.tsx)
- [OriginalFilePreview.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OriginalFilePreview.tsx)
- [OCRFinalResultView.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRFinalResultView.tsx)
- [cv_layout_parser.py](/D:/Maucv/recruitment-platform/ai-service/services/cv_layout_parser.py)
- [ocr_pipeline.py](/D:/Maucv/recruitment-platform/ai-service/services/ocr_pipeline.py)

## 5. Đã sửa logic chuyển từ status view sang final result như thế nào

Trong [OCRPreviewModal.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRPreviewModal.tsx):

- chỉ giữ 2 state giao diện:
  - `upload`
  - `workspace`
- sau khi chọn file là vào `workspace` ngay
- trong `workspace`:
  - trái luôn là [OriginalFilePreview.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OriginalFilePreview.tsx)
  - phải render theo điều kiện:
    - còn xử lý hoặc có lỗi: `OCRAnalysisPanel`
    - xử lý xong và không lỗi: `OCRFinalResultView`

Điểm chốt:

- `showFinalResult` là cờ duy nhất quyết định thay progress bằng final result
- progress panel không còn là UI cuối cùng sau khi OCR hoàn tất

## 6. Đã sửa OCR/parsing như thế nào

### 6.1. Multipage OCR

Trong [ocr_pipeline.py](/D:/Maucv/recruitment-platform/ai-service/services/ocr_pipeline.py):

- PDF và image tiếp tục đi theo pipeline page-based:
  - prepare pages
  - OCR từng page
  - layout parsing từng page
  - merge toàn bộ raw text
- DOCX giờ ưu tiên:
  - convert sang PDF
  - render thành nhiều page
  - OCR/layout theo đúng pipeline page-based giống PDF
- chỉ khi DOCX không convert được sang PDF mới fallback sang direct parse

Điều này giúp:

- DOCX không còn là một nhánh tách rời quá sớm
- multipage được áp dụng nhất quán hơn
- page count phản ánh đúng document nhiều trang khi convert thành công

### 6.2. Giữ full content và giảm rơi section

Trong [cv_layout_parser.py](/D:/Maucv/recruitment-platform/ai-service/services/cv_layout_parser.py):

- bổ sung fallback heading cho:
  - `contact`
  - `work_experience`
  - `certifications`
  - `activities`
  - `interests`
- khi fallback tìm được line thuộc section đã có:
  - merge line vào section cũ
  - sort lại theo `page, y, x`
- `_split_entries_by_dates()` đã nới để không tách cụm quá sớm khi company/title/date đang ở cùng nhóm

Trong [ocr_pipeline.py](/D:/Maucv/recruitment-platform/ai-service/services/ocr_pipeline.py):

- generic non-CV fallback không truncate text
- tiêu đề generic content được đổi sang tiếng Việt
- nếu parse CV chưa đủ mạnh, hệ thống vẫn giữ full content thay vì ép summary ngắn

## 7. Đã sửa UI final result như thế nào

Trong [OCRFinalResultView.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRFinalResultView.tsx):

- panel cuối ưu tiên builder sections đã dựng lại
- detected sections chỉ còn là fallback nếu structured sections chưa đủ mạnh
- các section rỗng không còn bị render ra
- luôn có khối:
  - `Toàn bộ nội dung trích xuất từ tài liệu`

Điều này đảm bảo:

- nếu parser map đẹp: người dùng thấy section rõ ràng
- nếu parser chưa map đẹp: người dùng vẫn thấy full text đầy đủ
- UI cuối là bản kết quả cuối cùng, không còn là progress screen kéo dài

## 8. Đã thêm flow lưu CV như thế nào

Trong [OCRFinalResultView.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRFinalResultView.tsx), sau nội dung cuối cùng luôn có:

**“Bạn có muốn lưu CV của bạn lên web không?”**

Kèm nút:

- `Lưu CV`
- `Để sau`

Luồng lưu:

- `Lưu CV` gọi `onSave()`
- [OCRPreviewModal.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/components/ocr/OCRPreviewModal.tsx) chuyển dữ liệu thành `CVSection[]`
- phần cha dùng `createResumeFromSections()` để insert vào `resumes`
- lưu xong thì đóng modal, reload danh sách CV và hiện notice xác nhận

## 9. Đã chia trang quản lý CV thành 2 phần như thế nào

Trang [page.tsx](/D:/Maucv/recruitment-platform/src/app/candidate/cv-builder/page.tsx) vẫn được giữ đúng layout 2 phần:

### Phần trên: Tạo hoặc tải CV lên

- tạo CV mới
- upload CV để AI quét

### Phần dưới: Các CV bạn đã lưu

- xem danh sách CV đã lưu
- mở xem/chỉnh sửa
- dùng tiếp khi ứng tuyển nhà tuyển dụng

Sau khi lưu CV từ OCR:

- modal đóng lại
- danh sách phía dưới được reload
- CV vừa lưu xuất hiện ngay trong phần `Các CV bạn đã lưu`

## 10. Kết luận

Sau lượt sửa này:

- bên trái luôn giữ CV gốc
- bên phải chỉ hiện progress khi đang xử lý
- xong là chuyển hẳn sang final result
- DOCX ưu tiên convert sang PDF để đi cùng pipeline multipage
- parser fallback giữ nhiều nội dung hơn và giảm rơi section
- người dùng có thể lưu CV ngay sau khi xem kết quả
- danh sách CV đã lưu nhận dữ liệu mới ngay sau thao tác lưu

## 11. Hướng nâng cấp tiếp theo

1. benchmark parser trên nhiều CV 2 cột thực tế để tinh chỉnh thêm heading detection và section assignment
2. thêm debug mode nội bộ cho mapping `block -> line -> section`
3. đẩy DOCX backend preview/convert ổn định hơn nếu môi trường thiếu LibreOffice
4. nếu cần độ chính xác cao hơn nữa, bổ sung model/layout parser chuyên biệt kiểu PP-Structure sâu hơn cho CV nhiều bố cục phức tạp
