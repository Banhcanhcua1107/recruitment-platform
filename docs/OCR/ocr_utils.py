#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Utility functions và helpers cho OCR Processing
"""

import json
from typing import Dict, List, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import cv2


@dataclass
class OCRConfig:
    """Cấu hình cho OCR Processing"""
    
    # Model settings
    lang: str = "vi"
    use_gpu: bool = False
    use_angle_cls: bool = True
    det_model_dir: str = None
    rec_model_dir: str = None
    
    # OCR parameters
    text_det_limit_side_len: int = 960
    text_det_thresh: float = 0.3
    text_det_box_thresh: float = 0.5
    text_det_unclip_ratio: float = 1.6
    text_rec_batch_size: int = 10
    
    # Processing settings
    min_confidence: float = 0.0
    save_images_with_bbox: bool = False
    include_timestamp: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'OCRConfig':
        """Create from dictionary"""
        return OCRConfig(**{k: v for k, v in data.items() if hasattr(OCRConfig, k)})


class TextBlock:
    """Đại diện cho một block text được OCR"""
    
    def __init__(self, 
                 text: str,
                 confidence: float,
                 bbox: List[List[float]]):
        """
        Args:
            text: Nội dung text
            confidence: Confidence score (0-1)
            bbox: Bounding box [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        """
        self.text = text
        self.confidence = confidence
        self.bbox = bbox
        self._compute_metrics()
    
    def _compute_metrics(self):
        """Tính toán các metrics từ bbox"""
        x_coords = [p[0] for p in self.bbox]
        y_coords = [p[1] for p in self.bbox]
        
        self.x_min = min(x_coords)
        self.x_max = max(x_coords)
        self.y_min = min(y_coords)
        self.y_max = max(y_coords)
        
        self.width = self.x_max - self.x_min
        self.height = self.y_max - self.y_min
        self.center_x = (self.x_min + self.x_max) / 2
        self.center_y = (self.y_min + self.y_max) / 2
        
        # Tính diện tích gần đúng
        self.area = self.width * self.height
    
    def to_dict(self, include_bbox_points: bool = True) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "text": self.text,
            "confidence": round(self.confidence, 4),
            "position": {
                "x": round(self.center_x),
                "y": round(self.center_y)
            },
            "bounding_box": {
                "x_min": round(self.x_min),
                "x_max": round(self.x_max),
                "y_min": round(self.y_min),
                "y_max": round(self.y_max)
            },
            "dimensions": {
                "width": round(self.width),
                "height": round(self.height),
                "area": round(self.area)
            }
        }
        
        if include_bbox_points:
            data["bbox_points"] = [
                [round(p[0]), round(p[1])] for p in self.bbox
            ]
        
        return data


class OCRResult:
    """Kết quả OCR cho một hình ảnh"""
    
    def __init__(self, 
                 image_path: str,
                 width: int = None,
                 height: int = None):
        """
        Args:
            image_path: Đường dẫn hình ảnh
            width: Chiều rộng ảnh
            height: Chiều cao ảnh
        """
        self.image_path = image_path
        self.width = width
        self.height = height
        self.text_blocks: List[TextBlock] = []
        self.processing_time: float = None
        self.error: str = None
    
    def add_text_block(self, text_block: TextBlock):
        """Thêm text block"""
        self.text_blocks.append(text_block)
    
    def get_full_text(self, separator: str = "\n") -> str:
        """Lấy text đầy đủ"""
        return separator.join(b.text for b in self.text_blocks)
    
    def get_average_confidence(self) -> float:
        """Tính confidence trung bình"""
        if not self.text_blocks:
            return 0.0
        return sum(b.confidence for b in self.text_blocks) / len(self.text_blocks)
    
    def filter_by_confidence(self, min_confidence: float) -> List[TextBlock]:
        """Lọc text blocks theo confidence"""
        return [b for b in self.text_blocks if b.confidence >= min_confidence]
    
    def filter_by_region(self, 
                        x_min: int, 
                        y_min: int,
                        x_max: int,
                        y_max: int) -> List[TextBlock]:
        """Lọc text blocks trong một vùng khác"""
        return [
            b for b in self.text_blocks
            if b.center_x >= x_min and b.center_x <= x_max
            and b.center_y >= y_min and b.center_y <= y_max
        ]
    
    def to_dict(self, 
               include_bbox_points: bool = False,
               include_processing_time: bool = True) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "status": "error" if self.error else "success",
            "metadata": {
                "image_path": self.image_path,
                "timestamp": datetime.now().isoformat()
            },
            "results": {
                "text_blocks": [
                    b.to_dict(include_bbox_points) 
                    for b in self.text_blocks
                ],
                "full_text": self.get_full_text(),
                "statistics": {
                    "total_blocks": len(self.text_blocks),
                    "average_confidence": round(self.get_average_confidence(), 4)
                }
            }
        }
        
        if self.width and self.height:
            data["metadata"]["image_size"] = {
                "width": self.width,
                "height": self.height
            }
        
        if self.processing_time and include_processing_time:
            data["metadata"]["processing_time_ms"] = round(self.processing_time * 1000, 2)
        
        if self.error:
            data["error_message"] = self.error
        
        return data


def draw_boxes_on_image(image_path: str,
                       text_blocks: List[TextBlock],
                       output_path: str = None,
                       thickness: int = 2,
                       color: Tuple[int, int, int] = (0, 255, 0)):
    """
    Vẽ bounding boxes lên hình ảnh
    
    Args:
        image_path: Đường dẫn ảnh gốc
        text_blocks: Danh sách TextBlock
        output_path: Đường dẫn lưu ảnh output (nếu None, hiển thị)
        thickness: Độ dày line
        color: Màu BGR (0-255, 0-255, 0-255)
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    # Vẽ bounding boxes
    for block in text_blocks:
        # Vẽ bbox
        pts = [(int(p[0]), int(p[1])) for p in block.bbox]
        pts = [tuple(p) for p in pts]
        
        for i in range(len(pts)):
            cv2.line(
                img,
                pts[i],
                pts[(i + 1) % len(pts)],
                color,
                thickness
            )
        
        # Vẽ text
        cv2.putText(
            img,
            block.text,
            (int(block.x_min), int(block.y_min) - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1
        )
    
    # Lưu hoặc hiển thị
    if output_path:
        cv2.imwrite(output_path, img)
        print(f"Ảnh đã lưu: {output_path}")
    else:
        cv2.imshow("OCR Result", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


def save_result_json(result: OCRResult,
                    output_path: str,
                    include_bbox_points: bool = False):
    """Lưu OCRResult thành JSON"""
    data = result.to_dict(include_bbox_points=include_bbox_points)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Kết quả lưu: {output_path}")


def load_result_json(json_path: str) -> Dict[str, Any]:
    """Load kết quả JSON"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def merge_results(*results: List[OCRResult]) -> Dict[str, Any]:
    """Merge nhiều OCRResult"""
    merged = {
        "status": "success",
        "timestamp": datetime.now().isoformat(),
        "results": [],
        "summary": {
            "total_images": len(results),
            "total_blocks": 0,
            "average_confidence": 0.0
        }
    }
    
    all_confidences = []
    
    for result in results:
        merged["results"].append(result.to_dict())
        merged["summary"]["total_blocks"] += len(result.text_blocks)
        all_confidences.extend([b.confidence for b in result.text_blocks])
    
    if all_confidences:
        merged["summary"]["average_confidence"] = round(
            sum(all_confidences) / len(all_confidences), 4
        )
    
    return merged


def export_to_csv(results: List[OCRResult],
                  output_path: str):
    """Export kết quả sang CSV"""
    import csv
    
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'image_path', 'block_id', 'text', 'confidence',
            'x_min', 'x_max', 'y_min', 'y_max', 'width', 'height'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for result in results:
            for idx, block in enumerate(result.text_blocks):
                writer.writerow({
                    'image_path': result.image_path,
                    'block_id': idx,
                    'text': block.text,
                    'confidence': block.confidence,
                    'x_min': block.x_min,
                    'x_max': block.x_max,
                    'y_min': block.y_min,
                    'y_max': block.y_max,
                    'width': block.width,
                    'height': block.height
                })
    
    print(f"✅ CSV exported: {output_path}")


# Example usage
if __name__ == "__main__":
    # Tạo config
    config = OCRConfig(lang='vi', use_gpu=False)
    print(config.to_dict())
    
    # Tạo OCRResult
    result = OCRResult("test.png", width=800, height=600)
    
    # Thêm text blocks
    block1 = TextBlock(
        "Xin chào",
        0.95,
        [[10, 20], [100, 15], [105, 50], [15, 55]]
    )
    result.add_text_block(block1)
    
    # In kết quả
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
