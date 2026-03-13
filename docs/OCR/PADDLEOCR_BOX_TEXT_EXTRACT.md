# Cách PaddleOCR lấy Bounding Box & Text chuẩn

## 1. Bounding Box — `db_postprocess.py`

Pipeline xử lý bbox từ DB (Differentiable Binarization) model:

```python
# Bước 1: Từ probability map → contours
contours, _ = cv2.findContours(bitmap, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

# Bước 2: Lọc contour nhỏ quá
if contour_area < self.min_size:
    continue

# Bước 3: Xấp xỉ polygon → box 4 điểm
epsilon = 0.002 * cv2.arcLength(contour, True)
approx = cv2.approxPolyDP(contour, epsilon, True)

# Bước 4: Tính score xem box có đáng tin không
score = self.box_score_fast(pred, points.reshape(-1, 2))
if self.box_thresh > score:
    continue  # Loại box có score thấp

# Bước 5: Unclip (mở rộng box ra một chút để bao hết chữ)
box = self.unclip(points, self.unclip_ratio)

# Bước 6: Scale về kích thước ảnh gốc
boxes[:, :, 0] = np.clip(np.round(boxes[:, :, 0] / width * dest_width), 0, dest_width)
boxes[:, :, 1] = np.clip(np.round(boxes[:, :, 1] / height * dest_height), 0, dest_height)
```

### Key params để tuning

| Param | Default | Tác dụng |
|-------|---------|----------|
| `box_thresh` | 0.6 | Score tối thiểu để giữ box |
| `unclip_ratio` | 1.5 | Mở rộng box thêm bao nhiêu % |
| `min_size` | 3 | Bỏ qua box nhỏ hơn N pixels |

---

## 2. Text Recognition — `rec_postprocess.py`

```python
# CTC decoder: argmax → loại duplicate → loại blank token
preds_idx = preds.argmax(axis=2)   # Index ký tự có prob cao nhất
preds_prob = preds.max(axis=2)     # Prob tương ứng

# Loại duplicate (CTC đặc thù)
selection[1:] = text_index[batch_idx][1:] != text_index[batch_idx][:-1]

# Loại blank token (index 0)
for ignored_token in ignored_tokens:
    selection &= text_index[batch_idx] != ignored_token

# Ghép ký tự thành chuỗi
char_list = [self.character[text_id] for text_id in text_index[selection]]
text = "".join(char_list)

# Confidence = mean của tất cả ký tự
conf = np.mean(conf_list).tolist()
```

---

## 3. Output Format từ `ocr()` method

```python
# Kết quả trả về có dạng:
[
    [
        [[x1,y1],[x2,y2],[x3,y3],[x4,y4]],  # Box 4 góc
        ("text_content", 0.98)               # (text, confidence)
    ],
    ...
]
```

---

## 4. Code sử dụng đúng chuẩn (không bị lỗi)

```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_angle_cls=True,  # Xoay ảnh nghiêng
    lang="vi",           # Tiếng Việt
    use_gpu=False,
    show_log=False
)

result = ocr.ocr("image.jpg", cls=True)

# Parse đúng cách — tránh lỗi None
if result and result[0]:
    for line in result[0]:
        box = line[0]            # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
        text = line[1][0]        # string
        confidence = line[1][1]  # float 0-1

        # Tính bbox đơn giản
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
```

> **Lỗi phổ biến:** `result` có thể là `None` hoặc `result[0]` là `None` khi ảnh trắng/rỗng.  
> → Luôn check `if result and result[0]` trước khi loop.

---

## 5. Sắp xếp Box theo thứ tự đọc (top-to-bottom, left-to-right)

```python
def sort_boxes(ocr_result):
    """Sắp xếp các text block theo thứ tự đọc tự nhiên."""
    blocks = []
    for line in ocr_result[0]:
        box = line[0]
        text = line[1][0]
        conf = line[1][1]
        ys = [p[1] for p in box]
        xs = [p[0] for p in box]
        blocks.append({
            "text": text,
            "confidence": conf,
            "x_min": min(xs),
            "x_max": max(xs),
            "y_min": min(ys),
            "y_max": max(ys),
            "center_y": (min(ys) + max(ys)) / 2
        })

    # Tính line_height trung bình để nhóm cùng dòng
    avg_height = sum(b["y_max"] - b["y_min"] for b in blocks) / len(blocks) if blocks else 20
    threshold = avg_height * 0.5

    # Sắp xếp: ưu tiên Y trước, X sau
    blocks.sort(key=lambda b: (round(b["center_y"] / threshold), b["x_min"]))
    return blocks
```

---

## 6. Có Cần Add Gì Thêm Cho Bài Viết Không?

Có. File này đang đúng về mặt PaddleOCR local package, nhưng nếu dùng cho bài của dự án hiện tại thì nên bổ sung 4 ý để tránh người đọc hiểu nhầm.

### A. Phân biệt PaddleOCR local và PaddleOCR API

Nội dung ở trên mô tả khá đúng cho cách dùng thư viện local:

```python
ocr = PaddleOCR(...)
result = ocr.ocr("image.jpg", cls=True)
```

Nhưng dự án hiện tại không gọi `PaddleOCR(...)` local. Backend đang gọi **AI Studio API** của:

- `PP-OCRv5`
- `PP-StructureV3`

Vì vậy output thực tế backend nhận được không phải lúc nào cũng có dạng:

```python
result[0][i] = [box, (text, confidence)]
```

Mà có thể là:

```json
{
    "rec_texts": [...],
    "rec_scores": [...],
    "rec_polys": [...],
    "rec_boxes": [...]
}
```

Hoặc một list item có `bbox`, `text`, `score`.

Kết luận: nếu đưa file này vào bài, nên thêm một câu chốt rằng:

> Format ở trên là format phổ biến của PaddleOCR local. Với AI Studio API, cần viết thêm lớp chuyển đổi response về cùng một schema nội bộ trước khi parse tiếp.

### B. Bổ sung bước chuẩn hoá bbox trong backend

Trong dự án này, polygon OCR không chỉ được giữ ở dạng 4 điểm. Backend còn convert tiếp sang bounding rectangle theo phần trăm ảnh:

```python
rect_x, rect_y, rect_w, rect_h
```

Mục đích:

- dễ sort theo reading order
- dễ group line/section
- dễ render lại lên UI

Tức là bài nên nói rõ có 2 lớp toạ độ:

1. `bbox` polygon gốc từ OCR
2. `rect_*` là toạ độ chuẩn hoá để xử lý layout

### C. Bổ sung rằng text extraction chưa ra JSON ngay

File này hiện dừng ở mức lấy `box + text + confidence`, nhưng với bài CV parser thì đó mới chỉ là raw OCR layer.

Sau bước này còn cần:

- merge blocks thành lines
- detect heading
- detect 1 cột / 2 cột
- group section như contact, skills, education, projects
- map sang JSON schema cuối

Nên thêm một ghi chú ngắn như sau:

> Bounding box và text chỉ là đầu ra OCR thô. JSON CV cuối cùng phải đi qua thêm một tầng layout parser và section parser.

### D. Bổ sung lỗi thực tế khi dùng API

Nếu muốn bài sát thực tế hơn, nên thêm các lỗi thường gặp mà local demo thường không nói tới:

- API có thể trả `401` nếu sai token
- API có thể trả `429` khi vượt quota
- PDF có thể cần render page sang image trước khi OCR
- Response shape của `prunedResult` có thể thay đổi giữa object và list
- OCR có thể trả text đúng nhưng spacing sai như `example. com`, `Duan`, `Ky nang`

Điểm này rất quan trọng vì parser CV thực tế phải có bước hậu xử lý để sửa các artefact như vậy.

---

## 7. Câu Chốt Nên Thêm Vào Bài

Nếu bạn muốn dùng lại file này cho báo cáo hoặc tài liệu dự án, có thể chốt ngắn gọn bằng đoạn này:

> PaddleOCR chịu trách nhiệm phát hiện vùng chữ và nhận dạng text ở mức block. Tuy nhiên, để phục vụ bài toán phân tích CV, hệ thống cần thêm một tầng chuẩn hoá bbox, sắp xếp thứ tự đọc, gom line, nhận diện section và ánh xạ sang JSON schema. Do đó, output của OCR không phải là JSON CV hoàn chỉnh, mà chỉ là dữ liệu đầu vào cho parser phía sau.
