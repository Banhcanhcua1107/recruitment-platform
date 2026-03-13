# Implementation Plan: CV OCR Pipeline với PaddleOCR

## Mục tiêu

Xây dựng pipeline hoàn chỉnh để:
1. Nhận file CV (PDF hoặc Image)
2. OCR bằng PaddleOCR với xử lý bbox
3. Parse text thành structured JSON CV data
4. Trả về qua FastAPI endpoint

---

## Các Files Sẽ Tạo / Chỉnh Sửa

### [NEW] `cv_ocr_pipeline.py`

Module chính chứa toàn bộ logic:

**1. `CVTextBlock`** — dataclass lưu text + bbox, tính `x_min`, `y_min`, `x_max`, `y_max`, `center_x`, `center_y`

**2. `sort_text_blocks_by_position(blocks)`** — sắp xếp text theo thứ tự đọc tự nhiên:
- Nhóm các blocks có cùng hàng dọc (`y_center` gần nhau trong ngưỡng `LINE_THRESHOLD`)
- Trong mỗi hàng → sắp xếp theo `x_min` (trái sang phải)
- Các hàng → sắp xếp theo `y_min` tăng dần (trên xuống dưới)

**3. `merge_text_blocks_into_lines(blocks)`** — gom text gần nhau thành dòng text hoàn chỉnh

**4. `CVSectionParser`** — class parse text thành JSON:

```python
SECTION_KEYWORDS = {
  "personal_information": ["thông tin cá nhân", "personal info", "liên hệ", "contact"],
  "skills": ["kỹ năng", "skills", "công nghệ", "technologies"],
  "programming_languages": ["ngôn ngữ lập trình", "programming languages"],
  "frontend": ["front-end", "frontend"],
  "backend": ["back-end", "backend"],
  "education": ["học vấn", "education", "trình độ"],
  "experience": ["kinh nghiệm", "experience", "work experience"],
  "projects": ["dự án", "projects"]
}
```

- `detect_section(text)` — regex + keyword matching nhận diện tiêu đề section
- `parse_personal_info(lines)` — regex extract email, phone, facebook/URL, address
- `parse_skills_section(lines)` — group skills sau dấu `:` hoặc bullet point
- `build_cv_json(sorted_lines)` — iterate qua lines, detect sections, fill JSON structure

**5. `CVOCRProcessor`** — class chính:
- `__init__()` — khởi tạo PaddleOCR với `lang="vi"` (nhận dạng cả tiếng Anh)
- `ocr_image(image: np.ndarray)` — OCR một ảnh, trả về list `CVTextBlock`
- `ocr_pdf(pdf_path: str)` — convert PDF → images (dùng `pymupdf`) rồi OCR từng page
- `process_file(file_path: str)` — detect file type, gọi hàm OCR tương ứng
- `parse_cv(file_path_or_bytes)` — main method: OCR → sort bbox → parse → return JSON

---

### [NEW] `cv_api_server.py`

FastAPI server với 2 endpoints:

```
POST /api/cv/extract
  Content-Type: multipart/form-data
  Field: file  (CV PDF hoặc Image)
  Returns: {"success": true, "data": {CV_JSON}}

GET /health
  Returns: {"status": "ok"}
```

Chạy: `python cv_api_server.py` → server tại `http://localhost:8000`

---

### [MODIFY] `requirements.txt`

Thêm dependencies:
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
pymupdf>=1.23.0
Pillow>=9.0.0
```

> **Lý do dùng `pymupdf`:** Không cần cài `poppler` ngoài trên Windows, import thẳng bằng `import fitz`.

---

## CV JSON Output Structure

```json
{
  "success": true,
  "data": {
    "personal_information": {
      "name": "Nguyễn Văn A",
      "email": "haidangakar11@gmail.com",
      "phone": "0329638454",
      "facebook": "facebook.com/bcandht1007",
      "address": "276/18A2 Lê Văn Lương, Kp1, P Tân Hưng, Q7",
      "other_links": []
    },
    "skills": {
      "programming_languages": ["C++", "Java", "Javascript", "Python", "C#"],
      "frontend": ["HTML5", "CSS3", "SASS", "TailwindCSS", "Bootstrap", "ReactJS"],
      "backend": [],
      "other": []
    },
    "education": [
      {
        "school": "Đại học Sư phạm Kỹ thuật",
        "degree": "Cử nhân Công nghệ Thông tin",
        "year": "2021 - 2025"
      }
    ],
    "experience": [
      {
        "company": "ABC Corp",
        "position": "Frontend Developer",
        "duration": "01/2024 - 06/2024",
        "description": "..."
      }
    ],
    "projects": [
      {
        "name": "TalentFlow",
        "description": "...",
        "technologies": [],
        "link": ""
      }
    ],
    "raw_text": "Full OCR text..."
  }
}
```

Nếu không OCR được gì:
```json
{
  "success": false,
  "message": "No readable text detected"
}
```

---

## Cách Hệ Thống Lấy JSON Từ PaddleOCR

Phần trên mới mô tả mục tiêu. Trong implementation hiện tại của dự án, JSON không được lấy trực tiếp từ một field JSON duy nhất của PaddleOCR, mà được dựng qua 4 bước:

### 1. Gọi 2 API riêng

- PP-OCRv5: dùng để lấy text + confidence + polygon/bbox.
- PP-StructureV3: dùng để lấy layout block, markdown, reading hints.

Payload thực tế gửi đi gồm:

```json
{
  "file": "<base64>",
  "fileType": 0,
  "useDocOrientationClassify": false,
  "useDocUnwarping": false,
  "useTextlineOrientation": false
}
```

Với PP-StructureV3 thì thêm:

```json
{
  "useChartRecognition": false
}
```

Trong code hiện tại, file PDF được render thành ảnh trước, sau đó mỗi page được gửi lên API dưới dạng base64.

### 2. Parse raw OCR response thành text blocks chuẩn hoá

PP-OCRv5 trả về `result.ocrResults[].prunedResult`. Nhưng `prunedResult` trên thực tế có thể có 2 dạng:

- Dạng object có các field như `rec_texts`, `rec_scores`, `rec_polys`, `rec_boxes`.
- Dạng list các item chứa `bbox`, `text`, `score`.

Implementation hiện tại đọc cả 2 dạng này, rồi convert về một format nội bộ thống nhất:

```python
OCRBlock(
  text=str,
  bbox=[[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
  confidence=float,
  page=int,
  rect_x=float,
  rect_y=float,
  rect_w=float,
  rect_h=float,
)
```

Trong đó:

- `bbox` giữ lại polygon gốc của OCR.
- `rect_x`, `rect_y`, `rect_w`, `rect_h` là toạ độ đã đổi sang phần trăm theo ảnh, để dễ group theo layout.
- Sau khi parse xong, các block được sort theo `rect_y`, rồi tới `rect_x`.

Nói ngắn gọn: Paddle không trả về ngay CV JSON, mà chỉ trả về text fragments. Hệ thống phải gom các fragments này lại trước.

### 3. Dùng layout + reading order để hiểu cấu trúc CV

Sau OCR text, hệ thống chạy `parse_structured_cv_from_ocr(page_results)` để suy ra cấu trúc tài liệu.

Quá trình này gồm:

- Gộp OCR blocks thành lines.
- Phát hiện single-column hoặc two-column.
- Xác định thứ tự đọc theo page, column và vertical order.
- Tìm heading như `Kỹ năng`, `Học vấn`, `Dự án`, `Kinh nghiệm`, `Liên hệ`.
- Có fallback keyword matching nếu heading bị OCR lỗi như `Ky nang`, `Duan`, `Hoc van`.
- Lọc noise OCR kiểu `?`, `C`, `0`, hoặc line quá ngắn vô nghĩa.

Kết quả bước này tạo ra 3 lớp dữ liệu khác nhau:

1. `data`: JSON CV sạch để frontend và API dùng.
2. `detected_sections`: danh sách section đã detect, giữ `line_ids` và `block_indices` để trace ngược về OCR.
3. `builder_sections`: dữ liệu đã map sẵn sang các section mà CV Builder hiểu được.

### 4. Map section sang JSON schema cuối cùng

Sau khi section đã được detect, hệ thống map từng loại section vào JSON:

- `header` -> `full_name`, `job_title`, `profile.full_name`, `profile.job_title`
- `career_objective` -> `summary`, `profile.career_objective`, `profile.summary`
- `contact` -> `contact.email`, `contact.phone`, `contact.linkedin`, `contact.address`
- `skills` -> `skills[]`
- `education` -> `education[]`
- `projects` -> `projects[]`
- `work_experience` -> `experience[]`
- `certifications` -> `certifications[]`

Ngoài `data`, hệ thống còn dựng thêm `builder_sections` để UI không cần parse lại text thô. Ví dụ:

- `personal_info` được đưa sang `sidebar-column`
- `skill_list` được đưa sang `sidebar-column`
- `education_list`, `project_list`, `experience_list` được đưa sang `main-column`

Điểm này quan trọng vì frontend hiện tại render theo `containerId`, không chỉ theo text OCR.

### JSON cuối cùng thực tế gồm những gì

Response cuối không chỉ có `data`, mà có thêm metadata để debug và dựng UI:

```json
{
  "success": true,
  "extraction_method": "paddle_ppocrv5_ppstructurev3",
  "ocr_provider": "PP-OCRv5 + PP-StructureV3",
  "page_count": 1,
  "total_blocks": 18,
  "blocks": [],
  "data": {},
  "detected_sections": [],
  "builder_sections": [],
  "layout": {},
  "markdown_pages": [],
  "raw_text": "...",
  "timings": {
    "ocr_seconds": 0.94,
    "layout_seconds": 0.61,
    "total_seconds": 1.84
  }
}
```

Ý nghĩa từng field:

- `blocks`: từng block text sau khi đã map loại block.
- `data`: structured CV JSON cuối cùng.
- `detected_sections`: các section trung gian để audit parser.
- `builder_sections`: dữ liệu sẵn cho CV Builder.
- `layout`: reading order, columns, profile layout, section layout.
- `markdown_pages`: markdown do PP-StructureV3 trả về.
- `raw_text`: toàn bộ text OCR đã ghép lại.
- `timings`: thời gian OCR, layout parsing và tổng thời gian.

### Ví dụ mapping thực tế

Giả sử OCR đọc được các line như sau:

```text
Dang Thanh Hai
Lap trinh vien
Email: hai@example.com
Phone: 0329638454
Ky nang
ReactJS NodeJS MySQL
Hoc van
Dai hoc Hung Vuong
Du an
Coffee House Hub
```

Sau parser, hệ thống có thể dựng thành:

```json
{
  "profile": {
    "full_name": "Dang Thanh Hai",
    "job_title": "Lap trinh vien",
    "career_objective": null,
    "summary": null
  },
  "contact": {
    "email": "hai@example.com",
    "phone": "0329638454",
    "linkedin": null,
    "address": null
  },
  "skills": ["ReactJS Node JS MySQL"],
  "education": [
    {
      "institution": "Dai hoc Hung Vuong",
      "degree": "",
      "field_of_study": "",
      "start_date": "",
      "end_date": "",
      "gpa": ""
    }
  ],
  "projects": [
    {
      "name": "Coffee House Hub",
      "description": "",
      "technologies": [],
      "url": ""
    }
  ]
}
```

Ví dụ này cho thấy rõ: JSON được suy ra từ OCR lines + layout heuristics + section parser, chứ không phải PaddleOCR tự sinh ra schema CV hoàn chỉnh.

### Kết luận ngắn

Cách họ lấy JSON trong hệ thống này là:

1. OCR lấy text fragments từ PP-OCRv5.
2. Layout parsing lấy cấu trúc trang từ PP-StructureV3.
3. Chuẩn hoá tất cả về `OCRBlock` và `OCRPageResult`.
4. Gom block thành line, detect section, lọc noise.
5. Map section sang `data`, `detected_sections`, `builder_sections`, `layout`.

Nói cách khác, PaddleOCR chỉ là tầng nhận dạng. JSON cuối cùng là kết quả của tầng parser nội bộ của dự án.

---

## Có Cần PaddleOCR-VL Hoặc PaddleOCR-VL-1.5 Không?

Ngắn gọn: với bài toán CV hiện tại của dự án này, **không bắt buộc**.

### Vì sao chưa cần

Pipeline hiện tại đã có đủ 3 tầng cần thiết:

1. `PP-OCRv5` để đọc text và bbox.
2. `PP-StructureV3` để lấy layout block, markdown và reading hints.
3. Parser nội bộ để biến OCR text thành JSON CV có schema rõ ràng.

Với CV, thứ ta cần chủ yếu là:

- họ tên
- email, số điện thoại
- kỹ năng
- học vấn
- kinh nghiệm
- dự án

Các trường này hiện đã được lấy bằng OCR + section parser + heuristic layout. Tức là JSON cuối đang được dựng chủ động trong backend, không phụ thuộc vào một model VLM sinh ra toàn bộ output.

### Khi nào mới nên dùng PaddleOCR-VL hoặc VL-1.5

Chỉ nên cân nhắc nếu bạn muốn chuyển sang hướng model đa phương thức end-to-end, ví dụ:

- muốn model hiểu tài liệu phức tạp hơn CV thường, như brochure, biểu mẫu, bảng, chart, formula
- muốn giảm bớt heuristic parser tự viết
- muốn thử để model tự suy luận semantic structure nhiều hơn thay vì tự detect section bằng rule
- muốn benchmark chất lượng trên các CV cực khó, nhiều cột lạ, icon, box, infographic

### Trong 2 model đó thì chọn cái nào

Nếu chỉ thử nghiệm một cái, nên ưu tiên **PaddleOCR-VL-1.5** thay vì giữ cả 2:

- `PaddleOCR-VL` là dòng cũ hơn.
- `PaddleOCR-VL-1.5` là bản mới hơn, thường hợp lý hơn để benchmark nếu thật sự muốn thử VLM.

Không có lý do rõ ràng để chạy song song cả `PaddleOCR-VL` và `PaddleOCR-VL-1.5` cho use case CV hiện tại, vì như vậy sẽ tăng:

- độ phức tạp tích hợp
- chi phí request
- thời gian xử lý
- khó debug khi output khác nhau

### Khuyến nghị cho dự án này

Kiến trúc hiện tại nên giữ như sau:

- Production path: `PP-OCRv5 + PP-StructureV3 + parser nội bộ`
- Optional research path: chỉ thử thêm `PaddleOCR-VL-1.5` như một nhánh benchmark riêng nếu muốn so sánh chất lượng

Kết luận thực dụng:

- **Không cần** `PaddleOCR-VL`
- **Không cần** `PaddleOCR-VL-1.5` để hệ thống hiện tại chạy tốt
- Nếu muốn nghiên cứu thêm, chỉ nên thử **một mình VL-1.5**, không cần giữ cả hai

---

## Bounding Box Sort Algorithm

```
1. Tính avg_line_height = trung bình height của tất cả bboxes
2. LINE_THRESHOLD = avg_line_height * 0.5
3. Sort tất cả blocks theo y_min (trên xuống dưới)
4. Gom nhóm theo hàng:
   - Block A và B cùng hàng nếu |A.center_y - B.center_y| < LINE_THRESHOLD
5. Trong mỗi hàng: sort theo x_min (trái → phải)
6. Join text trong hàng bằng space, join các hàng bằng newline
```

---

## Verification Plan

### Chạy test nhanh
```bash
cd d:\PaddleOCR
python -c "from cv_ocr_pipeline import CVOCRProcessor; p = CVOCRProcessor(); print('OK')"
```

### Test API bằng curl
```bash
# Chạy server
python cv_api_server.py

# Test với ảnh CV
curl -X POST http://localhost:8000/api/cv/extract -F "file=@cv_sample.jpg"

# Test với PDF
curl -X POST http://localhost:8000/api/cv/extract -F "file=@cv_sample.pdf"
```

### Kiểm tra output
- ✅ `success: true` khi OCR thành công
- ✅ `personal_information` có email, phone đúng
- ✅ `skills` được group đúng sub-category
- ✅ `"No readable text detected"` khi ảnh rỗng
