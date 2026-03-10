# PaddleOCR Training Pipeline Formal Report

## 1. Mục tiêu tài liệu

Tài liệu này trình bày PaddleOCR dưới dạng một báo cáo kỹ thuật chính quy, phù hợp cho thesis nội bộ, design review hoặc tài liệu phân tích hệ thống OCR trong môi trường AI engineering. Trọng tâm là mô tả logic huấn luyện, cấu trúc dữ liệu, mô hình, loss, chiến lược tối ưu và hướng áp dụng cho bài toán CV parsing.

## 2. Tóm tắt điều hành

PaddleOCR là framework OCR theo kiến trúc module hóa, trong đó toàn bộ hệ thống được tách thành ba bài toán tương đối độc lập:

- Text Detection
- Text Recognition
- Angle Classification

Thiết kế này cho phép tối ưu từng module theo domain, giảm độ phức tạp training và thuận lợi cho việc fine-tune production. Tuy nhiên, bản thân PaddleOCR chỉ giải quyết tốt bài toán OCR ở mức text region. Để áp dụng vào CV parser hoặc document intelligence system, cần bổ sung thêm layout analysis, reading order recovery và information extraction.

## 3. Kiến trúc tổng thể hệ thống

Pipeline inference chuẩn có dạng:

```text
Input document image
  -> Text Detection
  -> Polygon extraction
  -> Crop and rectify
  -> Angle Classification
  -> Text Recognition
  -> Text blocks with confidence
  -> Downstream parser
```

Ở mức training, PaddleOCR thường không huấn luyện detector và recognizer theo hướng end-to-end chung trong cấu hình phổ thông. Thay vào đó:

- Detection dùng ảnh tài liệu đầy đủ và annotation polygon
- Recognition dùng text crop và nhãn chuỗi ký tự
- Angle classifier dùng text crop và nhãn orientation

## 4. Cấu trúc dữ liệu huấn luyện

### 4.1 Detection dataset

Detection dataset thường dùng một file annotation dạng:

```text
image_path\t[{"transcription":"text","points":[[x1,y1],[x2,y2],[x3,y3],[x4,y4]]}]
```

Trong đó:

- `image_path` là đường dẫn ảnh
- `points` là polygon bao quanh vùng chữ
- `transcription` là chuỗi text trong polygon

Các giá trị `###` hoặc `*` thường dùng để đánh dấu vùng ignore.

### 4.2 Recognition dataset

Recognition dataset có cấu trúc:

```text
crop_000001.jpg\thello world
crop_000002.jpg\tnguyen van a
```

Mỗi sample tương ứng với một text region đã crop và một nhãn chuỗi.

### 4.3 Character dictionary

Character dictionary là cấu phần quyết định cách recognition model mã hóa text sang tensor. Với CTC, dictionary thường thêm token `blank`; với attention decoder, thường thêm `sos` và `eos`.

Đây là điểm rất quan trọng khi fine-tune cho tiếng Việt hoặc CV song ngữ Việt-Anh, vì dictionary thiếu coverage sẽ gây mất mẫu hoặc encode sai.

## 5. Pipeline preprocessing

### 5.1 Detection preprocessing

Detection thường bao gồm:

- decode image
- label encode
- random crop
- geometric augmentation
- normalize
- generate shrink map / threshold map

Kích thước đầu vào thường được ép về bội số của 32 để đồng bộ với backbone downsampling.

### 5.2 Recognition preprocessing

Recognition thường:

- resize ảnh về chiều cao cố định
- scale chiều rộng theo aspect ratio
- pad về `max_width`
- normalize về mean/std tiêu chuẩn

Mục tiêu của quy trình này là giữ hình thái ký tự ổn định trên trục dọc và bảo tồn thông tin chuỗi trên trục ngang.

## 6. Kiến trúc mô hình

### 6.1 Text Detection

Text Detection trong PaddleOCR thường dùng DBNet.

Các thành phần chính:

- Backbone: MobileNetV3 hoặc ResNet
- Neck: FPN/DBFPN để fuse feature đa tỉ lệ
- Head: DBHead sinh ra probability map, threshold map và binary approximation map

Công thức đặc trưng:

```text
B = sigmoid(k * (P - T))
```

Trong đó:

- `P` là probability map
- `T` là threshold map
- `B` là differentiable binary map

### 6.2 Text Recognition

Recognition thường dùng các họ mô hình:

- CRNN
- SVTR
- SAR

CRNN phù hợp cho production baseline vì đơn giản, nhanh và ổn định. SVTR hoặc transformer-style recognizer mạnh hơn về accuracy nhưng đòi hỏi compute cao hơn. SAR và các attention decoder linh hoạt hơn về alignment nhưng chậm hơn ở inference.

### 6.3 Angle Classification

Angle classifier thường là CNN nhẹ với output nhị phân `0/180`. Module này đơn giản nhưng có giá trị thực tế lớn nếu dữ liệu đầu vào có nhiều crop bị xoay sai chiều.

## 7. Hàm loss và tối ưu hóa

### 7.1 Detection loss

DBLoss thường được mô tả:

```text
L_det = alpha * L_shrink + beta * L_threshold + L_binary
```

Trong đó:

- `L_shrink` thường dùng Dice/Balanced loss
- `L_threshold` thường dùng masked L1 loss
- `L_binary` thường dùng Dice loss trên map nhị phân xấp xỉ

### 7.2 Recognition loss

Với CTC:

```text
L_ctc = -log P(target_sequence | input_features)
```

Với attention:

```text
L_att = sum_t CrossEntropy(p_t, y_t)
```

### 7.3 Angle classification loss

Angle classifier thường dùng cross entropy hai lớp.

## 8. Optimizer và learning rate

Các lựa chọn phổ biến:

- Adam cho baseline OCR
- AdamW cho transformer recognizer
- SGD/Momentum cho một số backbone nặng

Learning rate schedule điển hình:

- warmup
- cosine decay
- step decay

Gradient clipping thường cần cho RNN/attention recognizer để ổn định training.

## 9. Training loop

Training loop của PaddleOCR có dạng:

```python
for epoch in range(num_epochs):
    model.train()
    for batch in train_loader:
        preds = model(batch[0])
        loss = loss_fn(preds, batch)["loss"]
        loss.backward()
        optimizer.step()
        optimizer.clear_grad()
        scheduler.step()

    model.eval()
    score = validate(model, val_loader)
    save_checkpoints(score)
```

Metric quan trọng:

- Detection: precision, recall, hmean
- Recognition: accuracy, edit distance
- Classification: accuracy

## 10. Hạn chế hệ thống

Các hạn chế quan trọng của PaddleOCR:

- latency tăng theo số lượng text box
- model size tăng nhanh khi dùng multi-language hoặc transformer recognizer
- layout understanding còn hạn chế
- reading order với tài liệu nhiều cột chưa đủ mạnh nếu không có module phụ trợ

## 11. Đề xuất cải tiến

Các hướng cải tiến phù hợp:

- synthetic CV data generation
- multi-language dictionary cho domain tuyển dụng
- curriculum learning theo độ khó dữ liệu
- layout-aware OCR
- reading order recovery theo block/column
- đánh giá theo field extraction accuracy thay vì chỉ CER/WER

## 12. Áp dụng cho AI CV Parser

PaddleOCR chỉ nên là lớp OCR core. Với hệ thống CV parser hoàn chỉnh, cần kiến trúc:

```text
CV/PDF
  -> OCR
  -> Block grouping
  -> Reading order recovery
  -> Information extraction
  -> Structured candidate profile
```

Thông tin cần giữ lại từ OCR:

- text
- confidence
- bounding box
- page index
- line/block grouping

## 13. Kết luận

PaddleOCR là lựa chọn tốt để xây dựng baseline OCR production nhờ tính module hóa, khả năng fine-tune và hệ config mạnh. Tuy nhiên, nếu mục tiêu là CV parsing hoặc recruitment intelligence, framework này cần được mở rộng thành một document understanding pipeline đầy đủ, trong đó OCR chỉ là bước khởi đầu.
