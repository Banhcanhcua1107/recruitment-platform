#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Complete OCR Solution - CLI Tool
Toàn bộ solution quét hình ảnh và xuất JSON
"""

import argparse
import sys
import time
import json
from pathlib import Path
from typing import List
import cv2
from paddleocr import PaddleOCR

from ocr_utils import (
    OCRConfig,
    OCRResult,
    TextBlock,
    save_result_json,
    draw_boxes_on_image,
    merge_results,
    export_to_csv
)


class OCRCLITool:
    """CLI Tool cho OCR Processing"""
    
    def __init__(self, config: OCRConfig):
        """Khởi tạo"""
        self.config = config
        self.ocr_engine = None
        self._init_ocr()
    
    def _init_ocr(self):
        """Khởi tạo PaddleOCR engine"""
        print(f"🚀 Khởi tạo OCR engine (lang: {self.config.lang}, GPU: {self.config.use_gpu})...")
        
        self.ocr_engine = PaddleOCR(
            use_angle_cls=self.config.use_angle_cls,
            lang=self.config.lang,
            use_gpu=self.config.use_gpu,
            det_model_dir=self.config.det_model_dir,
            rec_model_dir=self.config.rec_model_dir
        )
        print("✅ OCR engine sẵn sàng")
    
    def process_single_image(self, image_path: str) -> OCRResult:
        """Xử lý một hình ảnh"""
        print(f"\n📸 Xử lý: {image_path}")
        
        # Kiểm tra file
        if not Path(image_path).exists():
            result = OCRResult(image_path)
            result.error = f"File không tồn tại: {image_path}"
            return result
        
        # Đọc ảnh
        img = cv2.imread(image_path)
        if img is None:
            result = OCRResult(image_path)
            result.error = f"Không thể đọc ảnh: {image_path}"
            return result
        
        # Khởi tạo result
        height, width = img.shape[:2]
        result = OCRResult(image_path, width, height)
        
        try:
            # Bắt đầu timing
            start_time = time.time()
            
            # Chạy OCR
            ocr_result = self.ocr_engine.ocr(img, cls=True)
            
            # Xử lý kết quả
            if ocr_result and len(ocr_result) > 0:
                for line in ocr_result[0]:
                    bbox, (text, confidence) = line
                    
                    # Lọc theo confidence
                    if confidence < self.config.min_confidence:
                        continue
                    
                    # Tạo TextBlock
                    text_block = TextBlock(text, float(confidence), bbox)
                    result.add_text_block(text_block)
            
            # Lưu processing time
            result.processing_time = time.time() - start_time
            
            # In thông tin
            print(f"  ✅ Found {len(result.text_blocks)} text blocks")
            print(f"  ⏱️  Time: {result.processing_time:.2f}s")
            print(f"  📊 Avg confidence: {result.get_average_confidence():.4f}")
            
        except Exception as e:
            result.error = str(e)
            print(f"  ❌ Error: {e}")
        
        return result
    
    def process_directory(self, directory: str, pattern: str = "*") -> List[OCRResult]:
        """Xử lý thư mục"""
        print(f"\n📁 Xử lý thư mục: {directory}")
        
        dir_path = Path(directory)
        if not dir_path.exists():
            print(f"❌ Thư mục không tồn tại: {directory}")
            return []
        
        # Tìm tất cả ảnh
        image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(dir_path.glob(f'**/{pattern}{ext}'))
            image_files.extend(dir_path.glob(f'**/{pattern}{ext.upper()}'))
        
        image_files = sorted(set(image_files))
        
        if not image_files:
            print(f"⚠️  Không tìm thấy ảnh trong: {directory}")
            return []
        
        print(f"🔍 Tìm thấy {len(image_files)} ảnh")
        
        # Xử lý từng ảnh
        results = []
        for img_file in image_files:
            result = self.process_single_image(str(img_file))
            results.append(result)
        
        return results
    
    def save_results(self,
                    results: List[OCRResult],
                    output_json: str = None,
                    output_csv: str = None,
                    output_images: str = None):
        """Lưu kết quả"""
        print(f"\n💾 Lưu kết quả...")
        
        # Save JSON
        if output_json:
            if len(results) == 1:
                result = results[0]
                save_result_json(result, output_json)
            else:
                # Batch JSON
                merged = merge_results(*results)
                with open(output_json, 'w', encoding='utf-8') as f:
                    json.dump(merged, f, ensure_ascii=False, indent=2)
                print(f"✅ Batch JSON: {output_json}")
        
        # Save CSV
        if output_csv:
            export_to_csv(results, output_csv)
        
        # Save images with boxes
        if output_images:
            output_dir = Path(output_images)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            for result in results:
                if result.text_blocks:
                    img_name = Path(result.image_path).stem
                    output_path = output_dir / f"{img_name}_annotated.png"
                    try:
                        draw_boxes_on_image(
                            result.image_path,
                            result.text_blocks,
                            str(output_path)
                        )
                    except Exception as e:
                        print(f"⚠️  Không thể lưu ảnh: {e}")


def create_parser():
    """Tạo argument parser"""
    parser = argparse.ArgumentParser(
        description="🔤 Complete OCR Solution - Quét hình ảnh và trích xuất JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  # Quét một ảnh
  python ocr_complete.py image.png -o result.json
  
  # Quét thư mục
  python ocr_complete.py --batch ./images -o batch_result.json
  
  # Với các tùy chọn
  python ocr_complete.py image.png -o result.json --lang vi --min-conf 0.6
  
  # Xuất CSV + annotated images
  python ocr_complete.py --batch ./images -o result.json --csv result.csv --annotated ./annotated/
        """
    )
    
    # Input
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument('image', nargs='?', help='Đường dẫn ảnh hoặc thư mục')
    input_group.add_argument('--batch', action='store_true', help='Batch processing')
    
    # Output
    parser.add_argument('-o', '--output', default='ocr_result.json',
                       help='File JSON output (default: ocr_result.json)')
    parser.add_argument('--csv', help='File CSV output')
    parser.add_argument('--annotated', help='Thư mục lưu ảnh annotated')
    
    # OCR Settings
    parser.add_argument('--lang', default='vi', 
                       help='Ngôn ngữ: vi, ch, en, ja, ko (default: vi)')
    parser.add_argument('--gpu', action='store_true', help='Sử dụng GPU')
    parser.add_argument('--no-angle', action='store_true',
                       help='Không sử dụng angle classification')
    parser.add_argument('--min-conf', type=float, default=0.0,
                       help='Ngưỡng confidence tối thiểu (0-1)')
    
    # Advanced
    parser.add_argument('--pattern', default='*',
                       help='Pattern tìm kiếm file (batch mode)')
    parser.add_argument('--det-model', help='Custom detection model')
    parser.add_argument('--rec-model', help='Custom recognition model')
    
    return parser


def main():
    """Main function"""
    parser = create_parser()
    args = parser.parse_args()
    
    # Xác định mode (single hoặc batch)
    if args.batch:
        if not args.image:
            print("❌ Lỗi: Cần chỉ định thư mục khi dùng --batch")
            sys.exit(1)
        mode = 'batch'
        path = args.image
    else:
        mode = 'single'
        path = args.image
    
    # Tạo config
    config = OCRConfig(
        lang=args.lang,
        use_gpu=args.gpu,
        use_angle_cls=not args.no_angle,
        min_confidence=args.min_conf,
        det_model_dir=args.det_model,
        rec_model_dir=args.rec_model
    )
    
    # Khởi tạo tool
    tool = OCRCLITool(config)
    
    # Xử lý
    print("=" * 50)
    if mode == 'single':
        results = [tool.process_single_image(path)]
    else:
        results = tool.process_directory(path, pattern=args.pattern)
    
    # Kiểm tra kết quả
    if not results:
        print("❌ Không có kết quả")
        sys.exit(1)
    
    # Lưu kết quả
    print("=" * 50)
    tool.save_results(
        results,
        output_json=args.output,
        output_csv=args.csv,
        output_images=args.annotated
    )
    
    # In summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    total_blocks = sum(len(r.text_blocks) for r in results)
    total_time = sum(r.processing_time or 0 for r in results)
    avg_conf = sum(r.get_average_confidence() for r in results) / len(results)
    
    print(f"✅ Xử lý: {len(results)} ảnh")
    print(f"📄 Tổng text blocks: {total_blocks}")
    print(f"⏱️  Tổng thời gian: {total_time:.2f}s")
    print(f"📊 Avg confidence: {avg_conf:.4f}")
    print(f"💾 Output: {args.output}")
    
    if args.csv:
        print(f"📋 CSV: {args.csv}")
    if args.annotated:
        print(f"🖼️  Images: {args.annotated}")
    
    print("=" * 50)
    print("✨ Hoàn thành!")


if __name__ == "__main__":
    main()
