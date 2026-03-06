#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để quét hình ảnh và trích xuất nội dung thành JSON
Sử dụng PaddleOCR để nhận dạng ký tự
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
from paddleocr import PaddleOCR


class OCRProcessor:
    """Xử lý OCR từ hình ảnh và xuất kết quả JSON"""
    
    def __init__(self, lang: str = "vi", use_gpu: bool = False):
        """
        Khởi tạo OCR Processor
        
        Args:
            lang: Ngôn ngữ ('vi' cho Tiếng Việt, 'ch' cho Tiếng Trung, 'en' cho Tiếng Anh, ...)
            use_gpu: Sử dụng GPU hay không
        """
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, use_gpu=use_gpu)
        self.lang = lang
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Quét hình ảnh và trích xuất text
        
        Args:
            image_path: Đường dẫn đến file hình ảnh
            
        Returns:
            Dictionary chứa kết quả OCR
        """
        # Kiểm tra file tồn tại
        if not Path(image_path).exists():
            return {
                "status": "error",
                "message": f"File không tồn tại: {image_path}"
            }
        
        try:
            # Đọc hình ảnh
            img = cv2.imread(image_path)
            if img is None:
                return {
                    "status": "error",
                    "message": f"Không thể đọc hình ảnh: {image_path}"
                }
            
            # OCR
            results = self.ocr.ocr(img, cls=True)
            
            # Xử lý kết quả
            output = self._format_results(results, image_path)
            return output
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Lỗi khi xử lý: {str(e)}"
            }
    
    def _format_results(self, results: List, image_path: str) -> Dict[str, Any]:
        """
        Định dạng kết quả OCR thành JSON
        
        Args:
            results: Kết quả từ PaddleOCR
            image_path: Đường dẫn hình ảnh
            
        Returns:
            Dictionary định dạng JSON
        """
        formatted_data = {
            "status": "success",
            "image": str(image_path),
            "language": self.lang,
            "text_blocks": [],
            "full_text": ""
        }
        
        full_text_parts = []
        
        # Xử lý từng dòng text trong hình ảnh
        if results and len(results) > 0:
            for line_idx, line in enumerate(results[0]):
                if line:
                    # Mỗi phần tử trong line: (bbox, (text, confidence))
                    bbox = line[0]  # Tọa độ hộp chứa text
                    text, confidence = line[1]
                    
                    # Làm tròn confidence để dễ đọc
                    confidence = round(float(confidence), 4)
                    
                    # Tạo block thông tin từ
                    text_block = {
                        "id": line_idx,
                        "text": text,
                        "confidence": confidence,
                        "bounding_box": {
                            "top_left": [round(bbox[0][0]), round(bbox[0][1])],
                            "top_right": [round(bbox[1][0]), round(bbox[1][1])],
                            "bottom_right": [round(bbox[2][0]), round(bbox[2][1])],
                            "bottom_left": [round(bbox[3][0]), round(bbox[3][1])]
                        }
                    }
                    
                    formatted_data["text_blocks"].append(text_block)
                    full_text_parts.append(text)
        
        # Ghép text hoàn chỉnh
        formatted_data["full_text"] = "\n".join(full_text_parts)
        formatted_data["text_block_count"] = len(formatted_data["text_blocks"])
        
        return formatted_data


def save_json(data: Dict[str, Any], output_path: str) -> bool:
    """
    Lưu kết quả vào file JSON
    
    Args:
        data: Dictionary dữ liệu
        output_path: Đường dẫn file JSON output
        
    Returns:
        True nếu thành công, False nếu lỗi
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Lỗi khi lưu JSON: {str(e)}", file=sys.stderr)
        return False


def main():
    """Hàm main để chạy từ dòng lệnh"""
    
    if len(sys.argv) < 2:
        print("Cách sử dụng: python ocr_to_json.py <image_path> [output.json]")
        print("\nVí dụ:")
        print("  python ocr_to_json.py document.png result.json")
        print("  python ocr_to_json.py image.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "ocr_result.json"
    
    # Khởi tạo OCR processor
    print(f"📸 Đang xử lý hình ảnh: {image_path}")
    processor = OCRProcessor(lang="vi", use_gpu=False)
    
    # Process hình ảnh
    result = processor.process_image(image_path)
    
    # Kiểm tra kết quả
    if result["status"] == "success":
        # Lưu JSON
        if save_json(result, output_path):
            print(f"✅ Thành công! Kết quả đã lưu vào: {output_path}")
            print(f"📄 Tổng cộng {result['text_block_count']} khối text")
            print(f"\n🔤 Nội dung trích xuất:\n{result['full_text'][:200]}...")
        else:
            print(f"❌ Lỗi khi lưu file JSON")
    else:
        print(f"❌ Lỗi: {result['message']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
