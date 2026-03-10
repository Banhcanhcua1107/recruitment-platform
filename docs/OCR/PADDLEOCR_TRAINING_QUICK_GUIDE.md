# PaddleOCR Training Quick Guide for CV Builder

## Mục đích

Tài liệu này là bản rút gọn từ `PADDLEOCR_TRAINING_ANALYSIS.md`, dùng cho team sản phẩm, frontend và backend khi cần hiểu nhanh OCR pipeline đang áp dụng cho `cv-builder`.

## 1. OCR pipeline đang dùng

Về mặt logic, hệ thống dựa trên pipeline PaddleOCR-style:

```text
Document image/PDF
  -> Text Detection
  -> Crop text regions
  -> Angle correction
  -> Text Recognition
  -> OCR blocks + confidence
  -> CV parsing
```

Trong code hiện tại của dự án, runtime OCR thực tế là RapidOCR/PP-OCR qua ONNX, nhưng tư duy pipeline vẫn bám sát PaddleOCR.

## 2. Ba module chính

### Detection

- tìm vùng chứa chữ
- quyết định recall của toàn hệ thống
- dùng output box/polygon cho bước crop

### Recognition

- đọc text từ crop ảnh
- quyết định chất lượng text đầu ra cho parser

### Angle classification

- sửa crop bị xoay ngược
- giảm lỗi nhận dạng ở dữ liệu scan/chụp

## 3. Điều gì ảnh hưởng accuracy nhiều nhất

- chất lượng annotation
- character dictionary có đúng domain hay không
- resize strategy
- augmentation có khớp dữ liệu thật hay không
- reading order recovery cho CV nhiều cột

## 4. Với CV parser, cần giữ gì từ OCR

- text
- confidence
- bounding box
- page index
- line/block grouping

Nếu chỉ giữ text thuần, parser sẽ mất ngữ cảnh vị trí và khó tái tạo section như `Experience`, `Education`, `Skills`.

## 5. Hạn chế cần biết

- OCR chuẩn không đồng nghĩa parser chuẩn
- model pretrained chung không tốt ngay với CV tiếng Việt
- layout nhiều cột dễ làm sai reading order
- icon, timeline và bảng là các vùng lỗi phổ biến

## 6. Cải tiến nên ưu tiên

### Cho model

- recognizer mạnh hơn cho tiếng Việt và CV song ngữ
- dictionary domain-specific cho email, phone, skill, job title

### Cho training

- synthetic resume data
- curriculum learning từ PDF sạch đến ảnh chụp khó
- multi-language sampling

### Cho pipeline

- layout-aware grouping
- reading order recovery
- field-level validation theo parser output

## 7. Mapping trực tiếp vào cv-builder

Trong `cv-builder`, OCR nên được hiểu là 3 lớp:

1. OCR engine tạo raw blocks
2. layout heuristics nhóm block thành section sơ bộ
3. CV draft transformer chuyển section sang dữ liệu builder

Vì vậy khi chỉnh `cv-builder`, ưu tiên:

- không bỏ bounding box
- không flatten text quá sớm
- giữ confidence để highlight vùng nghi ngờ
- tách rõ raw OCR view và parsed CV view

## 8. Quy tắc vận hành thực tế

- PDF text-layer tốt thì dùng trực tiếp trước, OCR là fallback
- scan/image thì OCR full pipeline
- OCR confidence thấp thì đẩy sang editable overlay
- parser confidence thấp thì đẩy sang draft review thay vì auto-commit

## 9. File nên đọc nếu cần đào sâu

- [PADDLEOCR_TRAINING_ANALYSIS.md](/D:/Maucv/recruitment-platform/docs/OCR/PADDLEOCR_TRAINING_ANALYSIS.md)
- [PADDLEOCR_TRAINING_FORMAL_REPORT.md](/D:/Maucv/recruitment-platform/docs/OCR/PADDLEOCR_TRAINING_FORMAL_REPORT.md)
