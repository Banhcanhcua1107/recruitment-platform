#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
QUICK START - Hướng dẫn nhanh sử dụng OCR

Sử dụng file này để bắt đầu nhanh chóng
"""

# ============================================================================
# 1. CÁCH ĐƠN GIẢN NHẤT - Copy-Paste Code
# ============================================================================

def quickstart_simple():
    """Ví dụ đơn giản nhất: 5 dòng code"""
    from paddleocr import PaddleOCR
    import cv2
    import json
    
    # Khởi tạo
    ocr = PaddleOCR(lang='vi')
    
    # Đọc ảnh
    img = cv2.imread("image.png")
    
    # Chạy OCR
    result = ocr.ocr(img, cls=True)
    
    # Lưu JSON
    output = {
        "status": "success",
        "text_blocks": [
            {"text": line[1][0], "confidence": float(line[1][1])}
            for line in result[0]
        ]
    }
    
    with open("result.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("✅ Lưu: result.json")


# ============================================================================
# 2. SỬ DỤNG SCRIPT CÓ SẵN
# ============================================================================

def quickstart_using_scripts():
    """Hướng dẫn sử dụng các script có sẵn"""
    
    # Script 1: ocr_to_json.py (đơn giản)
    # Chạy từ terminal:
    # python ocr_to_json.py image.png result.json
    
    # Script 2: advanced_ocr.py (strong)
    # python advanced_ocr.py image.png result.json --min-conf 0.6
    
    # Script 3: ocr_complete.py (hoàn chỉnh + CLI)
    # python ocr_complete.py image.png -o result.json --lang vi
    
    print("""
    Chạy từ terminal/PowerShell:
    
    1️⃣  Quét một ảnh (đơn giản):
        python ocr_to_json.py image.png result.json
    
    2️⃣  Quét một ảnh (advanced):
        python advanced_ocr.py image.png result.json --min-conf 0.6
    
    3️⃣  Quét một ảnh (complete):
        python ocr_complete.py image.png -o result.json
    
    4️⃣  Quét thư mục:
        python ocr_complete.py --batch ./images -o batch_result.json
    
    5️⃣  Quét + Xuất CSV + Annotated images:
        python ocr_complete.py --batch ./images -o result.json --csv result.csv --annotated ./images_marked/
    """)


# ============================================================================
# 3. IMPORT VÀ SỬ DỤNG TỪ CODE
# ============================================================================

def quickstart_import_class():
    """Import class và sử dụng trong code"""
    from advanced_ocr import AdvancedOCRProcessor
    import json
    
    # Khởi tạo
    processor = AdvancedOCRProcessor(lang='vi', use_gpu=False)
    
    # Xử lý ảnh
    result = processor.process_image("image.png", min_confidence=0.5)
    
    # Lưu JSON
    with open("result.json", 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("✅ Hoàn thành!")


def quickstart_import_utils():
    """Import từ ocr_utils.py"""
    from ocr_utils import OCRConfig, OCRResult, TextBlock
    import cv2
    from paddleocr import PaddleOCR
    import json
    
    # Khởi tạo config
    config = OCRConfig(lang='vi', use_gpu=False)
    
    # Khởi tạo OCR
    ocr = PaddleOCR(lang='vi')
    
    # Đọc ảnh
    img = cv2.imread("image.png")
    h, w = img.shape[:2]
    
    # Tạo result object
    result = OCRResult("image.png", w, h)
    
    # Chạy OCR
    ocr_result = ocr.ocr(img, cls=True)
    
    # Populate result
    for line in ocr_result[0]:
        bbox, (text, conf) = line
        block = TextBlock(text, float(conf), bbox)
        result.add_text_block(block)
    
    # Lưu
    with open("result.json", 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
    
    print("✅ Done!")


# ============================================================================
# 4. TÙYC HỌN NÂNG CAO
# ============================================================================

def quickstart_advanced_options():
    """Các tùy chọn nâng cao"""
    from paddleocr import PaddleOCR
    import cv2
    import json
    
    # Tùy chọn 1: Sử dụng GPU
    ocr_gpu = PaddleOCR(use_gpu=True, lang='vi')
    
    # Tùy chọn 2: Ngôn ngữ khác
    ocr_en = PaddleOCR(lang='en')  # Tiếng Anh
    ocr_ch = PaddleOCR(lang='ch')  # Tiếng Trung
    
    # Tùy chọn 3: Không dùng angle classification
    ocr_no_angle = PaddleOCR(use_angle_cls=False, lang='vi')
    
    # Tùy chọn 4: Custom model
    ocr_custom = PaddleOCR(
        lang='vi',
        det_model_dir='/path/to/detection/model',
        rec_model_dir='/path/to/recognition/model'
    )
    
    # Tùy chọn 5: Batch processing
    images_paths = ["image1.png", "image2.png", "image3.png"]
    
    all_results = {
        "status": "success",
        "images": [],
        "total_blocks": 0
    }
    
    for img_path in images_paths:
        img = cv2.imread(img_path)
        result = ocr_gpu.ocr(img, cls=True)
        
        # Process result...
        blocks = [
            {"text": line[1][0], "confidence": float(line[1][1])}
            for line in result[0]
        ]
        
        all_results["images"].append({
            "path": img_path,
            "blocks": blocks
        })
        all_results["total_blocks"] += len(blocks)
    
    # Lưu
    with open("batch_result.json", 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print("✅ Batch processing done!")


# ============================================================================
# 5. XỨNG LỰ COMMON ISSUES
# ============================================================================

def troubleshooting():
    """Giải quyết các vấn đề thường gặp"""
    
    tips = """
    ❌ ISSUE 1: Ký tự Tiếng Việt bị lỗi
    ✅ FIX: 
       - Đảm bảo lang='vi'
       - Lưu JSON với ensure_ascii=False
       - Check encoding UTF-8
    
    ❌ ISSUE 2: Confidence thấp
    ✅ FIX:
       - Cải thiện chất lượng ảnh
       - Tăng resolution hình ảnh
       - Sử dụng use_angle_cls=True
    
    ❌ ISSUE 3: Xử lý chậm
    ✅ FIX:
       - Sử dụng GPU: use_gpu=True
       - Giảm kích thước ảnh
       - Batch processing
    
    ❌ ISSUE 4: Out of Memory
    ✅ FIX:
       - Giảm text_recognition_batch_size
       - Xử lý ảnh nhỏ hơn
       - Sử dụng GPU
    
    ❌ ISSUE 5: Module không tìm thấy
    ✅ FIX:
       - pip install paddleocr
       - pip install opencv-python
       - Kiểm tra Python version (3.7+)
    """
    
    print(tips)


# ============================================================================
# 6. JSON OUTPUT EXAMPLES
# ============================================================================

def json_output_examples():
    """Ví dụ về JSON output"""
    
    simple_json = {
        "status": "success",
        "text_blocks": [
            {
                "text": "Xin chào",
                "confidence": 0.95
            }
        ],
        "full_text": "Xin chào\nThế giới"
    }
    
    detailed_json = {
        "status": "success",
        "metadata": {
            "image_path": "image.png",
            "image_size": {"width": 800, "height": 600}
        },
        "results": {
            "text_lines": [
                {
                    "text": "Xin chào",
                    "confidence": 0.95,
                    "position": {"x": 100, "y": 50},
                    "bounding_box": {
                        "x_min": 10,
                        "x_max": 190,
                        "y_min": 40,
                        "y_max": 60
                    }
                }
            ],
            "full_text": "Xin chào",
            "statistics": {
                "total_blocks": 1,
                "average_confidence": 0.95
            }
        }
    }
    
    batch_json = {
        "status": "success",
        "directory": "./images",
        "summary": {
            "total_images": 3,
            "successful": 3,
            "total_blocks": 45
        },
        "images": [
            # ... detailed_json for each image ...
        ]
    }
    
    print("📋 Xem OCR_JSON_README.md cho JSON schemas đầy đủ")


# ============================================================================
# 7. SCRIPT COMMAND REFERENCE
# ============================================================================

def command_reference():
    """Tham khảo lệnh"""
    
    print("""
    === QUICK COMMAND REFERENCE ===
    
    📌 ocr_to_json.py (Simple)
       python ocr_to_json.py <image> [output.json]
    
    📌 advanced_ocr.py (Advanced)
       Single image:
         python advanced_ocr.py image.png result.json [--min-conf 0.5]
       Batch:
         python advanced_ocr.py --batch ./dir batch_result.json [--pattern *.jpg]
    
    📌 ocr_complete.py (Full Featured)
       Single:
         python ocr_complete.py image.png -o result.json
       Batch:
         python ocr_complete.py --batch ./dir -o result.json
       With all options:
         python ocr_complete.py image.png -o result.json \\
                                --lang vi \\
                                --min-conf 0.6 \\
                                --csv result.csv \\
                                --annotated ./marked/
    
    📌 Options:
       --lang {vi, ch, en, ja, ko}  : Language
       --gpu                         : Use GPU
       --min-conf <float>           : Confidence threshold
       --csv <file>                 : Export to CSV
       --annotated <dir>            : Save annotated images
       --pattern <pattern>          : Search pattern (batch mode)
    """)


# ============================================================================
# MAIN - Choose Your Option
# ============================================================================

if __name__ == "__main__":
    import sys
    
    print("""
╔═══════════════════════════════════════════════════════════════╗
║          🔤 PaddleOCR - Quick Start Guide                    ║
║         Quét hình ảnh & Xuất JSON không lỗi ký tự           ║
╚═══════════════════════════════════════════════════════════════╝
    
Chọn một option:
    1. Simple Code - 5 dòng code copy-paste
    2. Using Scripts - Chạy script từ terminal
    3. Import Class - Sử dụng trong Python code
    4. Advanced Options - Tùy chọn nâng cao
    5. Troubleshooting - Giải quyết vấn đề
    6. JSON Examples - Ví dụ JSON output
    7. Command Reference - Tham khảo lệnh
    
Hoặc:
    - Đọc file: OCR_JSON_README.md (Đầy đủ)
    - Chạy script: python ocr_complete.py image.png -o result.json
    """)
    
    if len(sys.argv) > 1:
        choice = sys.argv[1]
    else:
        choice = input("Chọn (1-7): ").strip()
    
    options = {
        "1": quickstart_simple,
        "2": quickstart_using_scripts,
        "3": quickstart_import_class,
        "4": quickstart_advanced_options,
        "5": troubleshooting,
        "6": json_output_examples,
        "7": command_reference,
    }
    
    if choice in options:
        print("\n" + "="*60)
        options[choice]()
        print("\n" + "="*60)
    else:
        print("❌ Lựa chọn không hợp lệ")
