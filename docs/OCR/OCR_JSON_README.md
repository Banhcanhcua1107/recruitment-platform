# OCR JSON Extraction - Hướng Dẫn Sử Dụng

## 📋 Giới Thiệu

Các script này giúp bạn:
- ✅ Quét hình ảnh và trích xuất text không bị lỗi ký tự
- ✅ Xuất kết quả thành JSON chuẩn
- ✅ Xử lý batch nhiều hình ảnh
- ✅ Lọc kết quả theo confidence score
- ✅ Lấy vị trí chính xác của từng text block

## 🚀 Cài Đặt

### Yêu Cầu
- Python 3.7+
- PaddleOCR
- OpenCV (cv2)

### Cài Đặt Dependencies
```bash
pip install paddleocr opencv-python
```

## 📁 Các Files

### 1. `ocr_to_json.py` - Script Cơ Bản Nhất
Quét một hình ảnh và xuất JSON đơn giản

**Cách sử dụng:**
```bash
python ocr_to_json.py image.png result.json
```

**Output JSON:**
```json
{
  "status": "success",
  "image": "image.png",
  "language": "vi",
  "text_blocks": [
    {
      "id": 0,
      "text": "Xin chào",
      "confidence": 0.9854,
      "bounding_box": {
        "top_left": [10, 20],
        "top_right": [150, 20],
        "bottom_right": [150, 50],
        "bottom_left": [10, 50]
      }
    }
  ],
  "full_text": "Xin chào\nThế giới",
  "text_block_count": 2
}
```

---

### 2. `advanced_ocr.py` - Script Nâng Cao
Xử lý một hoặc nhiều hình ảnh với các tùy chọn

**Cách sử dụng:**

#### a) Quét một hình ảnh:
```bash
# Cơ bản
python advanced_ocr.py image.png result.json

# Với ngưỡng confidence
python advanced_ocr.py image.png result.json --min-conf 0.6
```

#### b) Quét thư mục:
```bash
# Tất cả hình ảnh PNG
python advanced_ocr.py --batch ./images batch_result.json

# Với pattern cụ thể
python advanced_ocr.py --batch ./images batch_result.json --pattern "*.jpg"
```

**Output JSON (Single Image):**
```json
{
  "status": "success",
  "metadata": {
    "timestamp": "2026-03-06T10:30:45.123456",
    "image_path": "image.png",
    "image_size": {
      "width": 800,
      "height": 600
    },
    "language": "vi"
  },
  "results": {
    "text_lines": [
      {
        "id": 0,
        "text": "Tiêu đề tài liệu",
        "confidence": 0.9854,
        "position": {
          "x": 400,
          "y": 100
        },
        "bounding_box": {
          "x_min": 100,
          "x_max": 700,
          "y_min": 80,
          "y_max": 120
        },
        "dimensions": {
          "width": 600,
          "height": 40
        }
      }
    ],
    "full_text": "Tiêu đề tài liệu\nNội dung...",
    "statistics": {
      "total_lines": 10,
      "total_words": 50,
      "average_confidence": 0.9654
    }
  }
}
```

**Output JSON (Batch):**
```json
{
  "status": "success",
  "directory": "./images",
  "timestamp": "2026-03-06T10:30:45.123456",
  "images": [
    {
      "metadata": {...},
      "results": {...},
      "status": "success"
    }
  ],
  "summary": {
    "total_images": 5,
    "successful": 5,
    "failed": 0,
    "total_text_lines": 245
  }
}
```

---

### 3. `example_ocr_usage.py` - Ví Dụ Sử Dụng

File này chứa 3 hàm ví dụ có thể import và sử dụng:

#### Ví dụ 1: Quét đơn giản
```python
from example_ocr_usage import simple_ocr_example

simple_ocr_example("image.png", "result.json")
```

#### Ví dụ 2: Batch processing
```python
from example_ocr_usage import batch_ocr_example

batch_ocr_example("./images", "batch_result.json")
```

#### Ví dụ 3: Advanced với filter
```python
from example_ocr_usage import advanced_ocr_with_filters

advanced_ocr_with_filters(
    "image.png", 
    "result.json", 
    min_confidence=0.6
)
```

---

## 🎯 Sử Dụng Trong Code

### Cách 1: Import và sử dụng class
```python
from advanced_ocr import AdvancedOCRProcessor
import json

# Khởi tạo
ocr = AdvancedOCRProcessor(lang='vi', use_gpu=False)

# Xử lý hình ảnh
result = ocr.process_image("image.png", min_confidence=0.5)

# Lưu JSON
with open("result.json", 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
```

### Cách 2: Import từ example_ocr_usage
```python
from example_ocr_usage import simple_ocr_example

simple_ocr_example("image.png", "result.json")
```

### Cách 3: Sử dụng trực tiếp PaddleOCR
```python
from paddleocr import PaddleOCR
import cv2
import json

# Khởi tạo
ocr = PaddleOCR(use_angle_cls=True, lang='vi')

# Đọc ảnh
img = cv2.imread("image.png")

# Chạy OCR
result = ocr.ocr(img, cls=True)

# Xử lý kết quả
output = {
    "text_blocks": [],
    "full_text": ""
}

for line in result[0]:
    bbox, (text, conf) = line
    output["text_blocks"].append({
        "text": text,
        "confidence": float(conf)
    })
    output["full_text"] += text + "\n"

# Lưu
with open("result.json", 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
```

---

## 🌍 Hỗ Trợ Ngôn Ngữ

Thay đổi `lang` parameter:

| Ngôn Ngữ | Code | Ghi Chú |
|---------|------|--------|
| Tiếng Việt | `vi` | Được tối ưu hóa |
| Tiếng Trung Giản Thể | `ch` | Được tối ưu hóa |
| Tiếng Anh | `en` | Cho English text |
| Tiếng Nhật | `ja` | - |
| Tiếng Hàn | `ko` | - |
| Đa ngôn ngữ | `en` | Sử dụng detection chung |

**Ví dụ:**
```python
ocr = PaddleOCR(lang='en')  # Tiếng Anh
ocr = PaddleOCR(lang='ch')  # Tiếng Trung
```

---

## ⚙️ Các Tham Số Quan Trọng

### PaddleOCR
```python
PaddleOCR(
    use_angle_cls=True,        # Phát hiện góc xoay
    lang='vi',                 # Ngôn ngữ
    use_gpu=False,             # Sử dụng GPU (nếu có CUDA)
    det_model_dir=None,        # Custom detection model
    rec_model_dir=None         # Custom recognition model
)
```

### Process Parameters
```python
process_image(
    image_path,
    min_confidence=0.0         # Lọc text có confidence < 0.0
)
```

---

## 📊 JSON Output Structure

### Single Image - Cấu Trúc Đơn Giản
```
{
  "status": "success" | "error",
  "image": "path/to/image.png",
  "language": "vi",
  "text_blocks": [
    {
      "id": 0,
      "text": "Nội dung text",
      "confidence": 0.95,
      "bounding_box": {...}
    }
  ],
  "full_text": "Nội dung đầy đủ"
}
```

### Single Image - Cấu Trúc Chi Tiết
```
{
  "status": "success",
  "metadata": {
    "timestamp": "ISO 8601",
    "image_path": "string",
    "image_size": {"width": int, "height": int},
    "language": "string"
  },
  "results": {
    "text_lines": [
      {
        "id": int,
        "text": "string",
        "confidence": float,
        "position": {"x": int, "y": int},
        "bounding_box": {
          "x_min": int, "x_max": int,
          "y_min": int, "y_max": int
        },
        "dimensions": {"width": int, "height": int}
      }
    ],
    "full_text": "string",
    "statistics": {
      "total_lines": int,
      "total_words": int,
      "average_confidence": float
    }
  }
}
```

### Batch Processing
```
{
  "status": "success",
  "directory": "path",
  "timestamp": "ISO 8601",
  "images": [
    { /* Mỗi image trong format trên */ }
  ],
  "summary": {
    "total_images": int,
    "successful": int,
    "failed": int,
    "total_text_lines": int
  }
}
```

---

## 🛠️ Troubleshooting

### Vấn đề 1: Ký tự Tiếng Việt bị lỗi
**Giải pháp:**
- Đảm bảo dùng `lang='vi'`
- Lưu file JSON với `ensure_ascii=False`
- Check encoding file là UTF-8

### Vấn đề 2: Confidence thấp
**Giải pháp:**
- Cải thiện chất lượng ảnh (resolution, sáng)
- Thử `use_angle_cls=True` để phát hiện góc xoay
- Sử dụng custom models nếu cần

### Vấn đề 3: Xử lý chậm
**Giải pháp:**
- Sử dụng GPU nếu có: `use_gpu=True`
- Giảm kích thước ảnh trước khi OCR
- Batch processing để tối ưu hóa

### Vấn đề 4: Out of Memory
**Giải pháp:**
- Giảm `text_recognition_batch_size`
- Xử lý ảnh nhỏ hơn
- Sử dụng GPU thay vì CPU

---

## 📈 Performance Tips

1. **GPU Acceleration:** Kật `use_gpu=True` nếu NVIDIA GPU khả dụng
2. **Batch Processing:** Xử lý nhiều ảnh cùng lúc hiệu quả hơn
3. **Image Preprocessing:** Chuẩn bị ảnh trước (crop, resize, rotate)
4. **Caching:** Nếu chạy lặp lại, cache model

---

## 📝 License

Dựa trên PaddleOCR (Apache 2.0 License)

---

## 💡 Tips & Tricks

- **Chữ viết tay:** Sử dụng model với `lang='vi'` chuyên biệt
- **Văn bản máy in:** Đặt `text_det_thresh=0.3` để tăng sensitivity
- **Tối ưu tốc độ:** Dùng PP-OCRv3 thay vì v4
- **Độ chính xác cao:** Dùng PP-OCRv4 hoặc v5

---

## 🤝 Support

Nếu gặp vấn đề:
1. Kiểm tra file ảnh có hợp lệ không
2. Cập nhật PaddleOCR: `pip install --upgrade paddleocr`
3. Xem log error message chi tiết
4. Thử ví dụ đơn giản trước

---

## 📚 Tài Liệu Thêm

- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [PaddleOCR Documentation](https://paddleocr.readthedocs.io/)
- [JSON Format Specification](https://www.json.org/)

---

**Tạo bởi:** PaddleOCR Integration Examples  
**Cập nhật lần cuối:** 2026-03-06
