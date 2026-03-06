# 📖 OCR JSON Extraction - Complete Solution

Tổng hợp toàn bộ solution để **quét hình ảnh và trích xuất nội dung thành JSON** mà chữ không bị lỗi.

---

## 🎯 Mục Đích

Cung cấp toàn bộ công cụ, script và hướng dẫn để:
- ✅ Quét hình ảnh (PNG, JPG, TIFF, BMP)
- ✅ Trích xuất text không bị lỗi ký tự
- ✅ Xuất kết quả thành JSON chuẩn
- ✅ Xử lý batch nhiều hình ảnh
- ✅ Lọc kết quả theo confidence score
- ✅ Lưu ảnh annotated với bounding box

---

## 📁 Cấu Trúc Files

```
d:/PaddleOCR/
├── ocr_to_json.py              # 🔹 Script cơ bản (Simple)
├── advanced_ocr.py             # 🔹 Script nâng cao (Advanced)
├── ocr_complete.py             # 🔹 Script hoàn chỉnh + CLI (Complete)
├── ocr_utils.py                # 🔹 Utilities & Classes
├── example_ocr_usage.py        # 🔹 Ví dụ sử dụng
├── QUICKSTART.py               # 🔹 Quick start guide
├── OCR_JSON_README.md          # 📖 Hướng dẫn chi tiết
└── FILES_SUMMARY.md            # 📋 File này
```

---

## 🚀 Bắt Đầu Nhanh Chóng

### 1️⃣ Quét một ảnh (Cách đơn giản nhất)

```bash
python ocr_to_json.py image.png result.json
```

**Output:** `result.json` chứa:
- ✅ Danh sách text blocks với confidence score
- ✅ Full text được ghép từ tất cả blocks
- ✅ Bounding box cho mỗi text

### 2️⃣ Quét một ảnh (Với options)

```bash
python advanced_ocr.py image.png result.json --min-conf 0.6
```

**Output:** JSON chi tiết hơn với:
- ✅ Vị trí chính xác (`x, y`)
- ✅ Kích thước (`width, height`)
- ✅ Thống kê confidence trung bình

### 3️⃣ Quét thư mục (Batch processing)

```bash
python ocr_complete.py --batch ./images -o batch_result.json
```

**Output:** Batch JSON chứa:
- ✅ Kết quả từ tất cả ảnh
- ✅ Tóm tắt thống kê chung
- ✅ Info mỗi ảnh (success/failed)

### 4️⃣ Quét + Xuất CSV + Annotated images

```bash
python ocr_complete.py --batch ./images \
                          -o result.json \
                          --csv result.csv \
                          --annotated ./marked_images/
```

**Output:**
- ✅ `result.json` - Dữ liệu JSON
- ✅ `result.csv` - Ma trận tất cả text + metadata
- ✅ `./marked_images/` - Ảnh có vẽ bounding box

---

## 📚 Hướng Dẫn Sử Dụng Chi Tiết

### File: `ocr_to_json.py`
**Đơn giản nhất, phù hợp cho beginners**

```bash
# Cơ bản
python ocr_to_json.py image.png

# Chỉ định output
python ocr_to_json.py image.png my_result.json
```

- ✅ Dễ sử dụng
- ✅ Output JSON đơn giản
- ⚠️ Limited options

---

### File: `advanced_ocr.py`
**Nâng cao hơn, có thêm filters**

```bash
# Single image
python advanced_ocr.py image.png result.json

# Với confidence filter
python advanced_ocr.py image.png result.json --min-conf 0.6

# Batch mode
python advanced_ocr.py --batch ./images batch_result.json

# Batch với pattern
python advanced_ocr.py --batch ./images batch.json --pattern "*.jpg"
```

- ✅ Chi tiết hơn
- ✅ Filters mạnh
- ✅ Batch support
- ✅ Có thống kê

---

### File: `ocr_complete.py`
**Hoàn chỉnh nhất, có CLI đầy đủ**

```bash
# Cơ bản
python ocr_complete.py image.png -o result.json

# Với tùy chọn ngôn ngữ
python ocr_complete.py image.png -o result.json --lang vi

# GPU acceleration
python ocr_complete.py image.png -o result.json --gpu

# Batch
python ocr_complete.py --batch ./images -o batch.json

# Tất cả options
python ocr_complete.py --batch ./images \
                          -o result.json \
                          --csv result.csv \
                          --annotated ./marked/ \
                          --lang vi \
                          --gpu \
                          --min-conf 0.5 \
                          --pattern "*.png"
```

**Options:**
- `--lang {vi, ch, en, ja, ko}` - Ngôn ngữ
- `--gpu` - Sử dụng GPU
- `--min-conf FLOAT` - Confidence threshold
- `--csv FILE` - Xuất CSV
- `--annotated DIR` - Lưu ảnh marked
- `--pattern PATTERN` - File pattern (batch)
- `--no-angle` - Không dùng angle cls
- `--det-model PATH` - Custom detection model
- `--rec-model PATH` - Custom recognition model

---

### File: `ocr_utils.py`
**Utilities, classes, helper functions**

Cung cấp:
- `OCRConfig` - Configuration class
- `TextBlock` - Đại diện text block
- `OCRResult` - Kết quả OCR
- `draw_boxes_on_image()` - Vẽ boxes
- `export_to_csv()` - Xuất CSV
- và nhiều helper khác

```python
from ocr_utils import OCRConfig, AdvancedOCRProcessor

config = OCRConfig(lang='vi', use_gpu=False)
# ... sử dụng config
```

---

### File: `example_ocr_usage.py`
**Ba ví dụ sử dụng thực tế**

1. **Simple OCR Example**
   ```python
   from example_ocr_usage import simple_ocr_example
   simple_ocr_example("image.png", "result.json")
   ```

2. **Batch OCR Example**
   ```python
   from example_ocr_usage import batch_ocr_example
   batch_ocr_example("./images", "batch_result.json")
   ```

3. **Advanced with Filters**
   ```python
   from example_ocr_usage import advanced_ocr_with_filters
   advanced_ocr_with_filters("image.png", "result.json", min_confidence=0.6)
   ```

---

### File: `QUICKSTART.py`
**7 tùy chọn quick start**

```bash
python QUICKSTART.py
# Hoặc
python QUICKSTART.py 1  # Chọn option 1

# Options:
# 1 - Simple Code (5 dòng)
# 2 - Using Scripts
# 3 - Import Class
# 4 - Advanced Options
# 5 - Troubleshooting
# 6 - JSON Examples
# 7 - Command Reference
```

---

### File: `OCR_JSON_README.md`
**Hướng dẫn đầy đủ (15+ pages)**

Bao gồm:
- Cách cài đặt
- Các language support
- JSON structure examples
- Performance tips
- Troubleshooting
- Tài liệu tham khảo

---

## 🔧 Cài Đặt

### Yêu Cầu
```
Python 3.7+
pip install paddleocr
pip install opencv-python
```

### Cài Đặt Một Dòng
```bash
pip install paddleocr opencv-python
```

---

## 📊 JSON Output Examples

### Format Đơn Giản (ocr_to_json.py)
```json
{
  "status": "success",
  "image": "image.png",
  "text_blocks": [
    {
      "id": 0,
      "text": "Xin chào",
      "confidence": 0.9854,
      "bounding_box": {...}
    }
  ],
  "full_text": "Xin chào\nThế giới",
  "text_block_count": 2
}
```

### Format Chi Tiết (advanced_ocr.py / ocr_complete.py)
```json
{
  "status": "success",
  "metadata": {
    "timestamp": "2026-03-06T10:30:45.123456",
    "image_path": "image.png",
    "image_size": {"width": 800, "height": 600},
    "language": "vi"
  },
  "results": {
    "text_lines": [
      {
        "id": 0,
        "text": "Tiêu đề",
        "confidence": 0.9854,
        "position": {"x": 100, "y": 50},
        "bounding_box": {
          "x_min": 10, "x_max": 190,
          "y_min": 40, "y_max": 60
        },
        "dimensions": {
          "width": 180, "height": 20
        }
      }
    ],
    "full_text": "Tiêu đề\n...",
    "statistics": {
      "total_lines": 10,
      "average_confidence": 0.9654,
      "total_words": 50
    }
  }
}
```

---

## 💡 Sử Dụng Trong Your Project

### Option 1: Copy Code
```python
from paddleocr import PaddleOCR
import cv2, json

ocr = PaddleOCR(lang='vi')
img = cv2.imread("image.png")
result = ocr.ocr(img, cls=True)

output = {
    "text_blocks": [
        {"text": line[1][0], "confidence": float(line[1][1])}
        for line in result[0]
    ]
}

with open("result.json", 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
```

### Option 2: Import Script
```bash
# Copy file vào project
cp ocr_complete.py /your/project/

# Chạy từ project
python -m ocr_complete image.png -o result.json
```

### Option 3: Import Module
```python
from advanced_ocr import AdvancedOCRProcessor

ocr = AdvancedOCRProcessor(lang='vi')
result = ocr.process_image("image.png")

with open("result.json", 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
```

---

## 📈 Performance

| Task | Time | GPU? |
|------|------|------|
| Single image (~800x600) | 1-2s | No |
| Single image | 0.5-1s | Yes |
| Batch 10 images | 10-20s | No |
| Batch 10 images | 5-10s | Yes |

**Tips:**
- Sử dụng GPU nếu có: `--gpu`
- Giảm kích thước ảnh trước xử lý
- Batch processing hiệu quả hơn

---

## 🌍 Ngôn Ngữ Hỗ Trợ

| Language | Code | Speed | Accuracy |
|----------|------|-------|----------|
| 🇻🇳 Việt | `vi` | Fast | High |
| 🇨🇳 Trung | `ch` | Fast | High |
| 🇬🇧 Anh | `en` | Fast | High |
| 🇯🇵 Nhật | `ja` | Medium | Medium |
| 🇰🇷 Hàn | `ko` | Medium | Medium |

---

## ⚠️ Common Issues & Solutions

### 1. Ký tự Tiếng Việt bị lỗi
```
❌ ISSUE: Chữ hiển thị sai
✅ FIX: 
   - lang='vi'
   - ensure_ascii=False ở JSON
   - File encoding UTF-8
```

### 2. Confidence thấp
```
❌ ISSUE: Accuracy kém
✅ FIX:
   - Cải thiện chất lượng ảnh
   - Tăng resolution
   - use_angle_cls=True
```

### 3. Xử lý chậm
```
❌ ISSUE: Gọn batch lầu
✅ FIX:
   - use_gpu=True
   - Giảm kích thước ảnh
   - Batch processing
```

---

## 🎓 Học Thêm

- [QUICKSTART.py](QUICKSTART.py) - 7 quick examples
- [OCR_JSON_README.md](OCR_JSON_README.md) - 15+ pages guide
- [example_ocr_usage.py](example_ocr_usage.py) - 3 real examples
- [PaddleOCR Docs](https://paddleocr.readthedocs.io/) - Official docs

---

## 📝 Chọn Script Nào?

| Nhu Cầu | Script |
|---------|--------|
| Quét 1 ảnh, nhanh | `ocr_to_json.py` |
| Quét 1 ảnh, chi tiết | `advanced_ocr.py` |
| Batch processing | `ocr_complete.py` |
| Sử dụng trong code | `ocr_utils.py` + `example_ocr_usage.py` |
| Học sử dụng | `QUICKSTART.py` |
| Tìm hiểu chi tiết | `OCR_JSON_README.md` |

---

## 🤝 Support

Gặp lỗi?

1. Đọc [OCR_JSON_README.md](OCR_JSON_README.md) - Troubleshooting section
2. Chạy `python QUICKSTART.py` rồi chọn option 5 (Troubleshooting)
3. Kiểm tra:
   - File ảnh có hợp lệ?
   - Dependencies cài đặt chưa?
   - Python version >= 3.7?

---

## 📋 Danh Sách Đầy Đủ

| File | Mục Đích | Mức Độ |
|------|----------|--------|
| `ocr_to_json.py` | Simple OCR | ⭐ Beginner |
| `advanced_ocr.py` | Advanced OCR + Batch | ⭐⭐ Intermediate |
| `ocr_complete.py` | Full CLI Tool | ⭐⭐⭐ Advanced |
| `ocr_utils.py` | Utilities & Classes | ⭐⭐ Intermediate |
| `example_ocr_usage.py` | Usage Examples | ⭐ Beginner |
| `QUICKSTART.py` | Quick Start Guide | ⭐ Beginner |
| `OCR_JSON_README.md` | Full Documentation | ⭐⭐ Intermediate |
| `FILES_SUMMARY.md` | This File | 📋 Overview |

---

## ✨ Tóm Tắt

Bạn đã có:
- ✅ 3 scripts (Simple, Advanced, Complete)
- ✅ Utilities & Classes riêng
- ✅ 3 real-world examples
- ✅ Quick start guide
- ✅ 15+ pages documentation
- ✅ JSON output examples
- ✅ Troubleshooting guide
- ✅ Performance tips

**Bắt đầu ngay:**
```bash
# Cách 1: Script đơn giản
python ocr_to_json.py image.png result.json

# Cách 2: Script nâng cao
python advanced_ocr.py image.png result.json --min-conf 0.6

# Cách 3: CLI hoàn chỉnh
python ocr_complete.py image.png -o result.json

# Cách 4: Quick guide
python QUICKSTART.py
```

---

**Tạo bởi:** PaddleOCR Integration  
**Ngày:** 2026-03-06  
**Status:** ✅ Ready to use

Chúc bạn quét ảnh thành công! 🎉
