# Windows PowerShell - Hướng Dẫn Sử Dụng

## 🔧 Chạy Scripts từ PowerShell

### Bước 1: Mở PowerShell

1. Nhấn `Win + R`
2. Gõ `powershell` hoặc `pwsh`
3. Nhấn Enter

Hoặc:
- Mở Windows Terminal (Win 11)
- Click PowerShell tab

### Bước 2: Điều hướng đến folder PaddleOCR

```powershell
# Ví dụ: Nếu PaddleOCR ở D:\PaddleOCR
cd D:\PaddleOCR
```

---

## 📋 Các Lệnh Cơ Bản

### 1. Quét một hình ảnh (Đơn giản)

```powershell
# Cách 1: Basic
python ocr_to_json.py image.png

# Cách 2: Chỉ định output
python ocr_to_json.py image.png result.json

# Cách 3: Dùng full path
python ocr_to_json.py C:\path\image.png C:\path\result.json
```

**Output:**
- File `result.json` được tạo trong folder hiện tại
- Hoặc tại folder được chỉ định

---

### 2. Quét với options nâng cao

```powershell
# Cấu hình CLI: advanced_ocr.py

# Single image
python advanced_ocr.py image.png result.json

# Với minimum confidence filter
python advanced_ocr.py image.png result.json --min-conf 0.6

# Với min-conf cụ thể
python advanced_ocr.py image.png my_result.json --min-conf 0.8
```

---

### 3. Quét thư mục (Batch)

```powershell
# Quét tất cả ảnh PNG
python advanced_ocr.py --batch ./images batch_result.json

# Quét ảnh JPG
python advanced_ocr.py --batch ./images batch_result.json --pattern "*.jpg"

# Full path
python advanced_ocr.py --batch D:\my_images batch.json --pattern "*.png"
```

---

### 4. Sử dụng ocr_complete.py (Full CLI)

```powershell
# Basic
python ocr_complete.py image.png -o result.json

# Với tiếng Việt (mặc định)
python ocr_complete.py image.png -o result.json --lang vi

# Batch
python ocr_complete.py --batch ./images -o batch_result.json

# Batch với nhiều options
python ocr_complete.py --batch ./images `
                          -o result.json `
                          --csv result.csv `
                          --annotated ./marked_images/ `
                          --lang vi `
                          --min-conf 0.6

# Với GPU (nếu có)
python ocr_complete.py image.png -o result.json --gpu
```

**Lưu ý:** Trong PowerShell, dùng backtick (`) để nối dòng dài.

---

## 🎯 Ví Dụ Thực Tế

### Ví dụ 1: Quét tệp hình ảnh

```powershell
# Điều hướng
cd D:\PaddleOCR

# Quét ảnh và lưu kết quả
python ocr_to_json.py input.png output.json

# Kiểm tra kết quả
type output.json  # Windows PowerShell
# hoặc
cat output.json   # tương tự Linux
```

---

### Ví dụ 2: Quét thư mục nhiều ảnh

```powershell
cd D:\PaddleOCR

# Quét tất cả PNG trong thư mục images
python ocr_complete.py --batch ./images -o batch_result.json

# Xuất thêm CSV
python ocr_complete.py --batch ./images `
                          -o batch_result.json `
                          --csv batch_result.csv
```

---

### Ví dụ 3: Với tất cả options

```powershell
cd D:\PaddleOCR

# Quét + CSV + Annotated images
python ocr_complete.py --batch D:\Documents\scans `
                          -o D:\Results\ocr_result.json `
                          --csv D:\Results\ocr_result.csv `
                          --annotated D:\Results\annotated `
                          --lang vi `
                          --min-conf 0.5 `
                          --pattern "*.jpg"

# Kiểm tra kết quả
dir D:\Results\
type D:\Results\ocr_result.json | more  # xem file
```

---

### Ví dụ 4: Xử lý lặp lại

```powershell
# Quét nhiều folder khác nhau
python ocr_complete.py --batch D:\Batch1 -o result1.json
python ocr_complete.py --batch D:\Batch2 -o result2.json
python ocr_complete.py --batch D:\Batch3 -o result3.json
```

---

## 📂 Cấu Hình Path (Đường Dẫn)

### Absolute Path (Đường dẫn tuyệt đối)
```powershell
# Windows path format
python ocr_to_json.py D:\Documents\image.png D:\Results\output.json
python ocr_complete.py --batch D:\Images D:\Results\batch.json
```

### Relative Path (Đường dẫn tương đối)
```powershell
# Từ folder hiện tại
# Structure:
# D:\PaddleOCR\
#   ├── ocr_complete.py
#   └── images\
#       ├── image1.png
#       └── image2.png

cd D:\PaddleOCR

# Quét folder images (tương đối)
python ocr_complete.py --batch .\images -o batch.json

# Hoặc
python ocr_complete.py --batch ./images -o batch.json
```

### Current Folder (Folder hiện tại)
```powershell
cd D:\PaddleOCR

# Tệp ảnh trong folder hiện tại
python ocr_to_json.py image.png result.json
```

---

## 🚀 Advanced Commands

### 1. Với GPU (nếu có NVIDIA)

```powershell
# Sử dụng GPU acceleration
python ocr_complete.py image.png -o result.json --gpu

# Nếu không có GPU, command mặc định sẽ dùng CPU
```

### 2. Các ngôn ngữ khác

```powershell
# Tiếng Anh
python ocr_complete.py image.png -o result.json --lang en

# Tiếng Trung
python ocr_complete.py image.png -o result.json --lang ch

# Tiếng Nhật
python ocr_complete.py image.png -o result.json --lang ja
```

### 3. Custom confidence threshold

```powershell
# Chỉ lấy text với confidence >= 0.8
python ocr_complete.py image.png -o result.json --min-conf 0.8

# Chỉ lấy text với confidence >= 0.5 (default 0.0)
python ocr_complete.py image.png -o result.json --min-conf 0.5
```

### 4. Search pattern khác nhau

```powershell
# Chỉ PNG
python ocr_complete.py --batch ./images -o result.json --pattern "*.png"

# Chỉ JPG
python ocr_complete.py --batch ./images -o result.json --pattern "*.jpg"

# Tất cả loại (*, *.*)
python ocr_complete.py --batch ./images -o result.json
```

### 5. Vô hiệu hóa angle classification

```powershell
# Tìm hiểu lệnh này để xử lý nhanh hơn
python ocr_complete.py image.png -o result.json --no-angle
```

---

## 📊 Viewing Results

### Xem JSON output

```powershell
# Hiển thị file JSON
type output.json   # PowerShell 5.1
cat output.json    # PowerShell 7+

# Hiển thị phần đầu
Get-Content result.json -Head 20

# Đếm dòng
(Get-Content result.json | Measure-Object -Line).Lines
```

### Xem CSV output

```powershell
# Hiển thị CSV
type result.csv
cat result.csv

# Mở CSV trong Excel
Invoke-Item result.csv
```

### Xem ảnh annotated

```powershell
# Mở folder
explorer ./annotated_images

# Hoặc
Start-Process explorer -ArgumentList "./annotated_images"

# Xem danh sách ảnh
Get-ChildItem .\annotated_images\ -Filter "*.png"
```

---

## 🔍 Kiểm Tra Lỗi

### Nếu gặp lỗi

```powershell
# 1. Kiểm tra Python cài đặt
python --version

# 2. Kiểm tra PaddleOCR
python -c "import paddleocr; print('OK')"

# 3. Kiểm tra OpenCV
python -c "import cv2; print('OK')"

# 4. Chạy với error detail
python ocr_to_json.py image.png result.json 2>&1 | Tee-Object error.log
```

### Cài đặt lại dependencies

```powershell
# Cài PaddleOCR
pip install paddleocr

# Cài OpenCV
pip install opencv-python

# Hoặc cả hai
pip install paddleocr opencv-python
```

---

## 💡 PowerShell Tips

### 1. Tạo alias cho lệnh dài

```powershell
# Tạo alias
Set-Alias ocr python

# Sử dụng
ocr ocr_complete.py image.png -o result.json

# Hoặc với function
function Scan-Image {
    param([string]$ImagePath, [string]$OutputPath = "result.json")
    python ocr_complete.py $ImagePath -o $OutputPath
}

# Sử dụng
Scan-Image image.png
```

### 2. Batch script

```powershell
# Tạo file scan_all.ps1
@"
# Scan all images in folder
param([string]`$FolderPath = "./images")

python ocr_complete.py --batch `$FolderPath `
                          -o result.json `
                          --csv result.csv
"@ | Out-File scan_all.ps1

# Chạy
.\scan_all.ps1
# hoặc
.\scan_all.ps1 -FolderPath D:\MyImages
```

### 3. Xem output realtime

```powershell
# Chạy và xem output log
python ocr_complete.py --batch ./images | Tee-Object -FilePath log.txt
```

### 4. Nối nhiều lệnh

```powershell
# Chạy lần lượt
python ocr_to_json.py image1.png result1.json; python ocr_to_json.py image2.png result2.json

# Hoặc với full logging
python ocr_complete.py --batch ./images -o result.json; `
  dir result.json; `
  type result.json | more
```

---

## 📝 Example Scripts

### Script 1: Đơn giản

```powershell
# file: scan.ps1
param([string]$ImagePath)

if (-not [System.IO.File]::Exists($ImagePath)) {
    Write-Host "Ảnh không tồn tại: $ImagePath"
    exit 1
}

Write-Host "Quét: $ImagePath"
python ocr_to_json.py $ImagePath "result.json"
Write-Host "Done! Kết quả: result.json"
```

Sử dụng:
```powershell
.\scan.ps1 -ImagePath image.png
```

---

### Script 2: Batch nâng cao

```powershell
# file: scan_batch.ps1
param(
    [string]$FolderPath = "./images",
    [string]$OutputDir = "./results"
)

# Tạo output folder
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "Quét folder: $FolderPath"
python ocr_complete.py --batch $FolderPath `
                          -o "$OutputDir\result.json" `
                          --csv "$OutputDir\result.csv" `
                          --annotated "$OutputDir\annotated" `
                          --lang vi

Write-Host "✅ Hoàn thành!"
Write-Host "📁 Kết quả: $OutputDir"
```

Sử dụng:
```powershell
.\scan_batch.ps1 -FolderPath D:\Images -OutputDir D:\Results
```

---

## 🎓 Summary

**Command reference:**

```powershell
# Cơ bản
python ocr_to_json.py image.png result.json

# Advanced
python advanced_ocr.py image.png result.json --min-conf 0.6

# Complete + Batch
python ocr_complete.py --batch ./images -o result.json

# Complete + All options
python ocr_complete.py --batch ./images `
                          -o result.json `
                          --csv result.csv `
                          --annotated ./marked `
                          --lang vi `
                          --gpu `
                          --min-conf 0.5

# Quick start
python QUICKSTART.py
```

---

**Kết thúc!**

Giờ bạn có thể:
- ✅ Chạy scripts từ PowerShell
- ✅ Quét hình ảnh & xuất JSON
- ✅ Xử lý batch nhiều ảnh
- ✅ Xuất CSV + annotated images
- ✅ Tùy chỉnh các options

🎉 Bắt đầu quét ảnh ngay!
