#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script nâng cao để quét nhiều hình ảnh và trích xuất nội dung thành JSON
Hỗ trợ xử lý batch và các tùy chọn advanced
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import cv2
from paddleocr import PaddleOCR


class AdvancedOCRProcessor:
    """Xử lý OCR nâng cao với hỗ trợ batch và options"""
    
    def __init__(self, 
                 lang: str = "vi", 
                 use_gpu: bool = False,
                 det_model_dir: str = None,
                 rec_model_dir: str = None,
                 use_angle_cls: bool = True):
        """
        Khởi tạo Advanced OCR Processor
        
        Args:
            lang: Ngôn ngữ ('vi', 'ch', 'en', ...)
            use_gpu: Sử dụng GPU hay không
            det_model_dir: Đường dẫn custom detection model
            rec_model_dir: Đường dẫn custom recognition model
            use_angle_cls: Có sử dụng angle classification hay không
        """
        self.ocr = PaddleOCR(
            use_angle_cls=use_angle_cls,
            lang=lang,
            use_gpu=use_gpu,
            det_model_dir=det_model_dir,
            rec_model_dir=rec_model_dir
        )
        self.lang = lang
    
    def process_image(self, 
                     image_path: str,
                     min_confidence: float = 0.0) -> Dict[str, Any]:
        """
        Quét hình ảnh với option lọc confidence
        
        Args:
            image_path: Đường dẫn hình ảnh
            min_confidence: Ngưỡng confidence tối thiểu (0-1)
            
        Returns:
            Dictionary kết quả OCR
        """
        if not Path(image_path).exists():
            return {
                "status": "error",
                "message": f"File không tồn tại: {image_path}"
            }
        
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {
                    "status": "error",
                    "message": f"Không thể đọc hình ảnh: {image_path}"
                }
            
            # Get image dimensions
            height, width = img.shape[:2]
            
            # OCR
            results = self.ocr.ocr(img, cls=True)
            
            # Xử lý kết quả
            output = self._format_results(
                results, 
                image_path, 
                width, 
                height,
                min_confidence
            )
            return output
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Lỗi: {str(e)}"
            }
    
    def _format_results(self, 
                       results: List, 
                       image_path: str,
                       width: int,
                       height: int,
                       min_confidence: float = 0.0) -> Dict[str, Any]:
        """
        Định dạng kết quả OCR thành JSON chuẩn
        """
        formatted_data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "image_path": str(image_path),
                "image_size": {
                    "width": width,
                    "height": height
                },
                "language": self.lang
            },
            "results": {
                "text_lines": [],
                "full_text": "",
                "statistics": {
                    "total_lines": 0,
                    "total_words": 0,
                    "average_confidence": 0.0
                }
            }
        }
        
        full_text_parts = []
        total_confidence = 0
        valid_count = 0
        
        if results and len(results) > 0:
            for line_idx, line in enumerate(results[0]):
                if line:
                    bbox = line[0]
                    text, confidence = line[1]
                    confidence = float(confidence)
                    
                    # Lọc theo confidence
                    if confidence < min_confidence:
                        continue
                    
                    # Tính vị trí trung bình
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    text_line = {
                        "id": line_idx,
                        "text": text,
                        "confidence": round(confidence, 4),
                        "position": {
                            "x": round((min(x_coords) + max(x_coords)) / 2),
                            "y": round((min(y_coords) + max(y_coords)) / 2)
                        },
                        "bounding_box": {
                            "x_min": round(min(x_coords)),
                            "x_max": round(max(x_coords)),
                            "y_min": round(min(y_coords)),
                            "y_max": round(max(y_coords))
                        },
                        "dimensions": {
                            "width": round(max(x_coords) - min(x_coords)),
                            "height": round(max(y_coords) - min(y_coords))
                        }
                    }
                    
                    formatted_data["results"]["text_lines"].append(text_line)
                    full_text_parts.append(text)
                    total_confidence += confidence
                    valid_count += 1
        
        # Tính thống kê
        formatted_data["results"]["full_text"] = "\n".join(full_text_parts)
        formatted_data["results"]["statistics"]["total_lines"] = valid_count
        formatted_data["results"]["statistics"]["total_words"] = sum(
            len(line["text"].split()) for line in formatted_data["results"]["text_lines"]
        )
        if valid_count > 0:
            formatted_data["results"]["statistics"]["average_confidence"] = round(
                total_confidence / valid_count, 4
            )
        formatted_data["status"] = "success"
        
        return formatted_data
    
    def process_directory(self, 
                         directory: str, 
                         pattern: str = "*.png",
                         min_confidence: float = 0.0) -> Dict[str, Any]:
        """
        Xử lý tất cả hình ảnh trong thư mục
        
        Args:
            directory: Đường dẫn thư mục
            pattern: Pattern tìm kiếm file (*.png, *.jpg, ...)
            min_confidence: Ngưỡng confidence tối thiểu
            
        Returns:
            Dictionary chứa kết quả của tất cả hình ảnh
        """
        dir_path = Path(directory)
        if not dir_path.exists():
            return {
                "status": "error",
                "message": f"Thư mục không tồn tại: {directory}"
            }
        
        batch_result = {
            "status": "success",
            "directory": str(directory),
            "timestamp": datetime.now().isoformat(),
            "images": [],
            "summary": {
                "total_images": 0,
                "successful": 0,
                "failed": 0,
                "total_text_lines": 0
            }
        }
        
        # Tìm tất cả hình ảnh
        image_files = list(dir_path.glob(pattern))
        
        for img_file in sorted(image_files):
            result = self.process_image(str(img_file), min_confidence)
            
            if result["status"] == "success":
                batch_result["images"].append(result)
                batch_result["summary"]["successful"] += 1
                batch_result["summary"]["total_text_lines"] += len(
                    result["results"]["text_lines"]
                )
            else:
                batch_result["summary"]["failed"] += 1
            
            batch_result["summary"]["total_images"] += 1
        
        return batch_result


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Cách sử dụng:")
        print("  1. Xử lý một hình ảnh:")
        print("     python advanced_ocr.py image.png [output.json] [--min-conf 0.5]")
        print("  2. Xử lý thư mục:")
        print("     python advanced_ocr.py --batch /path/to/folder [output.json] [--pattern *.png]")
        sys.exit(1)
    
    processor = AdvancedOCRProcessor(lang="vi", use_gpu=False)
    
    # Xử lý tham số
    if sys.argv[1] == "--batch":
        # Batch processing
        directory = sys.argv[2] if len(sys.argv) > 2 else "."
        output_path = sys.argv[3] if len(sys.argv) > 3 else "batch_ocr_result.json"
        
        pattern = "*.png"
        for arg in sys.argv[4:]:
            if arg.startswith("--pattern"):
                pattern = sys.argv[sys.argv.index(arg) + 1]
        
        print(f"📁 Xử lý thư mục: {directory}")
        result = processor.process_directory(directory, pattern)
        
    else:
        # Single image processing
        image_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else "ocr_result.json"
        
        min_conf = 0.0
        for arg in sys.argv[3:]:
            if arg == "--min-conf":
                min_conf = float(sys.argv[sys.argv.index(arg) + 1])
        
        print(f"📸 Xử lý hình ảnh: {image_path}")
        result = processor.process_image(image_path, min_conf)
    
    # Lưu kết quả
    if result["status"] == "success":
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"✅ Lưu thành công: {output_path}")
        except Exception as e:
            print(f"❌ Lỗi lưu: {str(e)}")
    else:
        print(f"❌ Lỗi: {result.get('message', 'Không xác định')}")


if __name__ == "__main__":
    main()
