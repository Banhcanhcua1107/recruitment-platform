#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ví dụ sử dụng OCR Processor để quét hình ảnh và trích xuất JSON
"""

import json
from pathlib import Path
from paddleocr import PaddleOCR
import cv2


def simple_ocr_example(image_path: str, output_json_path: str):
    """
    Ví dụ đơn giản: Quét hình ảnh và lưu kết quả thành JSON
    
    Args:
        image_path: Đường dẫn hình ảnh cần quét
        output_json_path: Đường dẫn file JSON output
    """
    # Khởi tạo PaddleOCR
    # lang='vi' cho Tiếng Việt, 'ch' cho Tiếng Trung, 'en' cho Tiếng Anh
    ocr = PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=False)
    
    # Đọc hình ảnh
    img = cv2.imread(image_path)
    
    # Thực hiện OCR
    result = ocr.ocr(img, cls=True)
    
    # Định dạng kết quả
    formatted_result = {
        "image": image_path,
        "status": "success",
        "text_blocks": [],
        "full_text": ""
    }
    
    # Xử lý kết quả từ PaddleOCR
    text_list = []
    for line in result[0]:
        bbox, (text, confidence) = line
        
        text_block = {
            "text": text,
            "confidence": round(float(confidence), 4),
            "bounding_box": {
                "top_left": list(map(float, bbox[0])),
                "top_right": list(map(float, bbox[1])),
                "bottom_right": list(map(float, bbox[2])),
                "bottom_left": list(map(float, bbox[3]))
            }
        }
        formatted_result["text_blocks"].append(text_block)
        text_list.append(text)
    
    # Ghép full text
    formatted_result["full_text"] = "\n".join(text_list)
    
    # Lưu JSON
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(formatted_result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Lưu thành công: {output_json_path}")
    print(f"📄 Số dòng text: {len(formatted_result['text_blocks'])}")
    print(f"\n🔤 Nội dung:\n{formatted_result['full_text'][:300]}")


def batch_ocr_example(image_directory: str, output_json_path: str):
    """
    Ví dụ batch: Quét nhiều hình ảnh trong thư mục
    
    Args:
        image_directory: Đường dẫn thư mục chứa hình ảnh
        output_json_path: Đường dẫn file JSON output (result.json)
    """
    ocr = PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=False)
    
    batch_results = {
        "status": "success",
        "directory": image_directory,
        "images": [],
        "total_images": 0,
        "total_text_blocks": 0
    }
    
    # Tìm tất cả hình ảnh
    image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(Path(image_directory).glob(f'*{ext}'))
        image_files.extend(Path(image_directory).glob(f'*{ext.upper()}'))
    
    # Xử lý từng hình ảnh
    for img_file in sorted(set(image_files)):
        img = cv2.imread(str(img_file))
        if img is None:
            continue
        
        result = ocr.ocr(img, cls=True)
        
        # Định dạng kết quả
        text_blocks = []
        for line in result[0]:
            bbox, (text, confidence) = line
            text_blocks.append({
                "text": text,
                "confidence": round(float(confidence), 4)
            })
        
        batch_results["images"].append({
            "filename": img_file.name,
            "path": str(img_file),
            "text_blocks": text_blocks,
            "block_count": len(text_blocks)
        })
        
        batch_results["total_images"] += 1
        batch_results["total_text_blocks"] += len(text_blocks)
    
    # Lưu kết quả batch
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(batch_results, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Batch OCR hoàn thành")
    print(f"📊 Tổng số hình ảnh: {batch_results['total_images']}")
    print(f"📄 Tổng số text blocks: {batch_results['total_text_blocks']}")
    print(f"💾 Kết quả lưu tại: {output_json_path}")


def advanced_ocr_with_filters(image_path: str, 
                              output_json_path: str,
                              min_confidence: float = 0.5):
    """
    Ví dụ nâng cao: Quét hình ảnh với các bộ lọc
    
    Args:
        image_path: Đường dẫn hình ảnh
        output_json_path: Đường dẫn file JSON output
        min_confidence: Ngưỡng confidence tối thiểu (0-1)
    """
    ocr = PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=False)
    
    # Đọc hình ảnh
    img = cv2.imread(image_path)
    height, width = img.shape[:2]
    
    # OCR
    result = ocr.ocr(img, cls=True)
    
    # Định dạng chi tiết
    detailed_result = {
        "metadata": {
            "image_path": image_path,
            "image_size": {"width": width, "height": height},
            "language": "vi"
        },
        "text_lines": [],
        "statistics": {
            "total_lines": 0,
            "passed_filter": 0,
            "average_confidence": 0.0,
            "confidence_distribution": {
                "high": 0,      # >= 0.8
                "medium": 0,    # 0.5 - 0.8
                "low": 0        # < 0.5
            }
        }
    }
    
    # Xử lý từng line
    confidences = []
    for idx, line in enumerate(result[0]):
        bbox, (text, confidence) = line
        confidence = float(confidence)
        confidences.append(confidence)
        
        # Lọc theo confidence
        passed_filter = confidence >= min_confidence
        
        # Tính vị trí
        x_coords = [p[0] for p in bbox]
        y_coords = [p[1] for p in bbox]
        
        text_line = {
            "id": idx,
            "text": text,
            "confidence": round(confidence, 4),
            "passed_filter": passed_filter,
            "position": {
                "x": round(sum(x_coords) / len(x_coords)),
                "y": round(sum(y_coords) / len(y_coords))
            },
            "bounding_box": {
                "x_min": round(min(x_coords)),
                "x_max": round(max(x_coords)),
                "y_min": round(min(y_coords)),
                "y_max": round(max(y_coords))
            }
        }
        
        detailed_result["text_lines"].append(text_line)
        detailed_result["statistics"]["total_lines"] += 1
        
        if passed_filter:
            detailed_result["statistics"]["passed_filter"] += 1
        
        # Phân loại confidence
        if confidence >= 0.8:
            detailed_result["statistics"]["confidence_distribution"]["high"] += 1
        elif confidence >= 0.5:
            detailed_result["statistics"]["confidence_distribution"]["medium"] += 1
        else:
            detailed_result["statistics"]["confidence_distribution"]["low"] += 1
    
    # Tính trung bình confidence
    if confidences:
        detailed_result["statistics"]["average_confidence"] = round(
            sum(confidences) / len(confidences), 4
        )
    
    # Lưu kết quả
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(detailed_result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ OCR nâng cao hoàn thành")
    print(f"📊 Thống kê:")
    print(f"  - Tổng lines: {detailed_result['statistics']['total_lines']}")
    print(f"  - Pass filter: {detailed_result['statistics']['passed_filter']}")
    print(f"  - Avg confidence: {detailed_result['statistics']['average_confidence']}")
    print(f"💾 Kết quả: {output_json_path}")


# Sử dụng
if __name__ == "__main__":
    # Ví dụ 1: Quét một hình ảnh
    # simple_ocr_example("image.png", "result.json")
    
    # Ví dụ 2: Quét thư mục các hình ảnh
    # batch_ocr_example("./images", "batch_result.json")
    
    # Ví dụ 3: Quét hình ảnh với bộ lọc confidence
    # advanced_ocr_with_filters("image.png", "advanced_result.json", min_confidence=0.6)
    
    print("📖 Chọn một ví dụ để chạy, bỏ comment lại")
