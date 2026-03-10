# PaddleOCR Training Analysis

Tài liệu này viết lại nội dung phân tích PaddleOCR training pipeline theo hướng technical documentation dành cho AI Engineer và Computer Vision Engineer. Mục tiêu là mô tả rõ cách PaddleOCR tổ chức bài toán OCR theo từng module, cách dữ liệu được biến thành tensor trong quá trình huấn luyện, cách loss và optimizer vận hành, và cách áp dụng pipeline này vào hệ thống CV parsing trong nền tảng tuyển dụng.

---

## 1. Tổng quan PaddleOCR Training Pipeline

PaddleOCR tổ chức bài toán OCR theo kiến trúc module hóa. Thay vì huấn luyện một mô hình end-to-end duy nhất cho toàn bộ chuỗi từ ảnh đầu vào đến text đầu ra, framework tách hệ thống thành ba module chính:

- `Text Detection`: tìm vị trí các vùng chứa văn bản trong ảnh.
- `Text Recognition`: đọc chuỗi ký tự từ từng vùng chữ sau khi đã crop/rectify.
- `Angle Classification`: xác định crop text có bị lật 180 độ hay không để xoay lại trước khi recognition.

### 1.1 Vai trò của từng module

#### Text Detection

Detection là bước đầu tiên của OCR pipeline. Nhiệm vụ của nó là dự đoán polygon hoặc box bao quanh từng text instance trong ảnh. Đây là module quyết định recall của toàn hệ thống. Nếu detector bỏ sót text region, recognizer không còn dữ liệu để đọc.

Đầu vào:

- Ảnh tài liệu, scan, ảnh chụp CV, PDF đã render thành image.

Đầu ra:

- Danh sách các polygon hoặc quadrilateral chứa text.
- Confidence score cho từng vùng.

#### Text Recognition

Recognition nhận crop ảnh chứa text và dự đoán chuỗi ký tự. Đây là bài toán sequence modeling: ảnh được biến thành chuỗi feature theo chiều ngang rồi decoder sinh ra text.

Đầu vào:

- Ảnh crop sau perspective transform.

Đầu ra:

- Chuỗi ký tự, ví dụ `Nguyen Van A`, `Python`, `2022 - 2025`.

#### Angle Classification

Angle classifier là module phụ, chủ yếu để phân biệt text crop đúng chiều và text crop bị đảo ngược 180 độ.

Đầu vào:

- Text crop.

Đầu ra:

- Nhãn `0` hoặc `180`.

Ý nghĩa:

- Giảm lỗi recognition với dữ liệu scan/chụp không đồng nhất.
- Không thay thế orientation detection ở mức document toàn trang.

### 1.2 Luồng dữ liệu giữa các module

```text
Input image
  -> Text Detection
  -> Detected polygons
  -> Crop + Perspective Rectification
  -> Angle Classification
  -> Rotation correction if needed
  -> Text Recognition
  -> Final OCR result: (box, text, score)
```

### 1.3 Pipeline từ ảnh đầu vào đến text output

Ở mức inference, PaddleOCR hoạt động theo các bước sau:

1. Ảnh đầu vào được resize và normalize.
2. Detector sinh ra probability map cho text region.
3. Post-processing biến map thành polygon/box.
4. Mỗi polygon được crop bằng affine hoặc perspective transform.
5. Crop được resize về chiều cao chuẩn cho recognizer.
6. Angle classifier kiểm tra và xoay lại crop nếu cần.
7. Recognizer sinh ra sequence logits.
8. Decoder chuyển logits thành string.
9. Hệ thống ghép box, text và confidence thành output cuối cùng.

### 1.4 Góc nhìn training pipeline

Điểm quan trọng là PaddleOCR thường không train end-to-end detector + recognizer trong cùng một graph cho cấu hình tiêu chuẩn. Thay vào đó:

- Detection được train với ảnh full-page và polygon annotation.
- Recognition được train với crop ảnh và nhãn text.
- Angle classifier được train với crop ảnh và nhãn góc.

Cách tách này có lợi vì:

- Dễ scale dữ liệu cho từng task.
- Dễ fine-tune riêng theo domain.
- Dễ thay recognizer mà không cần train lại detector.
- Giảm độ phức tạp optimization.

---

## 2. Dataset Structure

### 2.1 Detection annotation format

Một dòng annotation detection thường có dạng:

```text
train_images/img_001.jpg\t[{"transcription":"hello","points":[[10,20],[120,20],[120,60],[10,60]]}]
```

Mỗi object annotation gồm:

- `points`: danh sách đỉnh polygon.
- `transcription`: text nằm trong polygon.

Giá trị đặc biệt như `###` hoặc `*` thường được dùng để đánh dấu vùng ignore.

### 2.2 Recognition annotation format

Recognition dùng format đơn giản hơn:

```text
crop_000001.jpg\thello world
crop_000002.jpg\tnguyen van a
crop_000003.jpg\tsoftware engineer
```

Mỗi dòng là một cặp:

- `image_path`
- `text_label`

### 2.3 Angle classification annotation format

```text
crop_000001.jpg\t0
crop_000002.jpg\t180
```

Trong đó:

- `0`: đúng chiều
- `180`: lật ngược

### 2.4 Character dictionary

Character dictionary ánh xạ ký tự sang index integer để huấn luyện recognition model.

Ví dụ:

```text
0
1
2
3
...
a
b
c
...
z
 
```

Với CTC:

- Index `0` thường là `blank`.

Với attention decoder:

- Thường thêm `sos` và `eos`.

Nếu dictionary thiếu ký tự thật trong dataset, sample có thể bị encode sai hoặc bị bỏ qua. Đây là lỗi rất phổ biến khi fine-tune OCR cho tiếng Việt hoặc dữ liệu CV trộn Việt-Anh.

### 2.5 Tổ chức dataset trong thư mục

```text
train_data/
├─ det/
│  ├─ train/
│  ├─ val/
│  ├─ train_label.txt
│  └─ val_label.txt
├─ rec/
│  ├─ train/
│  ├─ val/
│  ├─ train.txt
│  └─ val.txt
├─ cls/
│  ├─ train/
│  ├─ val/
│  ├─ train.txt
│  └─ val.txt
└─ dict/
   └─ vi_en_resume_dict.txt
```

### 2.6 Cách PaddleOCR encode text label thành tensor

Ví dụ recognition sample:

```text
image_001.jpg   hello world
```

Quy trình encode:

1. Đọc string label từ annotation file.
2. Chuẩn hóa theo config như lowercase hoặc giữ nguyên case.
3. Map từng ký tự sang index trong dictionary.
4. Pad vector nhãn về `max_text_length`.
5. Lưu thêm tensor độ dài thực `length`.

Ví dụ:

```python
text = "hello world"
encoded = [8, 5, 12, 12, 15, 37, 23, 15, 18, 12, 4]
label_tensor = [8, 5, 12, 12, 15, 37, 23, 15, 18, 12, 4, 0, 0, 0]
length_tensor = 11
```

Tensor shape điển hình:

- `image`: `[B, 3, H, W]`
- `label`: `[B, max_text_length]`
- `length`: `[B]`

---

## 3. Data Preprocessing Pipeline

Preprocessing là phần lõi của OCR training, không phải bước phụ. Với OCR, chỉ một chút méo phối cảnh, blur, low contrast hoặc resize sai tỉ lệ cũng đủ làm recognizer giảm accuracy rõ rệt.

### 3.1 Resize strategy

#### Detection resize

Detection thường resize ảnh về kích thước cố định hoặc về cạnh ngắn/cạnh dài mục tiêu, sau đó ép kích thước về bội số của 32.

Lý do:

- Backbone CNN/FPN giảm resolution nhiều lần.
- Shape đầu vào cần tương thích với downsampling ratio.
- Batch training ổn định hơn khi kích thước được kiểm soát.

#### Recognition resize

Recognition thường fix chiều cao, ví dụ `H=32` hoặc `H=48`, rồi scale chiều rộng theo aspect ratio và pad về `max_width`.

Công thức điển hình:

```python
new_width = min(max_width, ceil(orig_width * target_height / orig_height))
```

Điều này giúp:

- Giữ hình dạng ký tự theo trục dọc.
- Cho time step của recognizer phản ánh gần đúng độ dài text.

### 3.2 Normalization

Chuẩn hóa phổ biến:

```python
image = image / 255.0
image = (image - mean) / std
```

`mean/std` thường dùng bộ ImageNet để tương thích với pretrained backbone.

### 3.3 Image augmentation

#### Random crop

Mục đích:

- Tăng đa dạng vùng quan sát.
- Giảm phụ thuộc vào full-page composition.

Ảnh hưởng:

- Tăng robustness cho detector.
- Nếu crop quá mạnh có thể làm mất ngữ cảnh text dài.

#### Perspective transform

Mục đích:

- Mô phỏng ảnh chụp tài liệu bị skew và méo hình học.

Ảnh hưởng:

- Rất hữu ích với CV chụp từ điện thoại.
- Không nên quá mạnh nếu domain chủ yếu là PDF render sạch.

#### Blur

Mục đích:

- Mô phỏng out-of-focus hoặc motion blur.

Ảnh hưởng:

- Tăng khả năng chịu ảnh mờ nhẹ.
- Quá nhiều blur có thể làm recognizer mất khả năng phân biệt ký tự gần giống nhau.

#### Brightness / contrast jitter

Mục đích:

- Mô phỏng over-exposure, shadow, low-light, scan chất lượng thấp.

Ảnh hưởng:

- Cải thiện generalization trên dữ liệu nhiều nguồn.

#### Text distortion

Mục đích:

- Mô phỏng cong giấy, warp, biến dạng do camera.

Ảnh hưởng:

- Hữu ích cho scene text và document chụp thực tế.

### 3.4 Ground truth map cho DBNet

DBNet không học box trực tiếp. Nó học các dense target map:

- `shrink_map`: lõi text region sau khi polygon được co lại.
- `threshold_map`: bản đồ ngưỡng mềm cho differentiable binarization.
- `mask`: vùng hợp lệ để tính loss.

Quy trình:

1. Bắt đầu từ polygon gốc.
2. Thu nhỏ polygon theo `shrink_ratio`.
3. Tạo vùng band giữa polygon gốc và polygon co lại.
4. Nội suy band này thành threshold map.

Đây là chìa khóa giúp DBNet học biên text tốt hơn segmentation nhị phân thuần túy.

---

## 4. Model Architecture

PaddleOCR thường đi theo khung chung:

```text
Transform -> Backbone -> Neck -> Head
```

Tùy task mà một số thành phần có thể vắng mặt.

### 4.1 Text Detection: DBNet

#### Backbone

Các lựa chọn phổ biến:

- `MobileNetV3`: nhẹ, nhanh, phù hợp production.
- `ResNet50`: mạnh hơn về accuracy, tốn tài nguyên hơn.

Vai trò của backbone là trích xuất feature đa cấp từ ảnh đầu vào.

#### Feature Pyramid Network

DBFPN hoặc FPN trong PaddleOCR kết hợp feature ở nhiều scale để vừa giữ edge detail ở tầng nông vừa tận dụng semantic context ở tầng sâu.

Output điển hình:

```text
C2: [B, c2, H/4,  W/4]
C3: [B, c3, H/8,  W/8]
C4: [B, c4, H/16, W/16]
C5: [B, c5, H/32, W/32]
```

#### Detection head

DBHead sinh ra ba map:

- `P`: probability map của text region
- `T`: threshold map
- `B`: binary approximation map

Công thức differentiable binarization:

```text
B = sigmoid(k * (P - T))
```

Trong đó `k` làm sigmoid sắc hơn, giúp mô hình xấp xỉ hard-threshold nhưng vẫn backprop được.

#### Output map

Ví dụ với input `640 x 640`:

```text
maps: [B, 3, 160, 160]
```

### 4.2 Text Recognition

#### CRNN

CRNN gồm ba phần:

1. CNN backbone trích xuất feature map
2. Sequence encoder như BiLSTM học phụ thuộc chuỗi
3. CTC head dự đoán ký tự theo time step

Tensor flow điển hình:

```text
input:   [B, 3, 32, 100]
feature: [B, 512, 1, 25]
reshape: [B, 25, 512]
BiLSTM:  [B, 25, hidden]
logits:  [B, 25, num_classes]
```

#### SVTR

SVTR là recognizer theo hướng transformer/token mixing.

Ưu điểm:

- Mô hình hóa ngữ cảnh toàn cục tốt hơn CRNN.
- Accuracy cao hơn ở text khó hoặc font đa dạng.

Nhược điểm:

- Tốn VRAM hơn.
- Tuning optimizer và learning rate khó hơn.

#### SAR

SAR là seq2seq recognizer dùng attention decoder.

Ưu điểm:

- Linh hoạt hơn với alignment khó.

Nhược điểm:

- Inference chậm hơn CTC do autoregressive decoding.

### 4.3 CTC vs Attention

`CTC` phù hợp khi text được sắp theo trục ngang và alignment gần monotonic. `Attention` linh hoạt hơn nhưng chậm hơn và khó tune hơn.

### 4.4 Angle Classifier

Angle classifier thường là CNN nhẹ như MobileNetV3-small:

- Input: `[B, 3, 48, 192]`
- Output: `[B, 2]`
- Mục tiêu: phân loại `0` hoặc `180`

---

## 5. Loss Functions

### 5.1 Detection loss

DBLoss thường có dạng:

```text
L_det = alpha * L_shrink + beta * L_threshold + L_binary
```

#### Dice Loss

Dùng để đo overlap giữa prediction map và ground-truth map:

```text
Dice = 2 * sum(P * G * M) / (sum(P * M) + sum(G * M) + eps)
L_dice = 1 - Dice
```

Tensor shape:

- `P`: `[B, H, W]`
- `G`: `[B, H, W]`
- `M`: `[B, H, W]`

Dice loss đặc biệt phù hợp với bài toán mất cân bằng foreground/background.

#### L1 Loss

L1 loss thường áp dụng cho threshold map:

```text
L_l1 = sum(|T_pred - T_gt| * M) / (sum(M) + eps)
```

#### Balance loss / hard negative mining

Background pixel nhiều hơn text pixel rất lớn. Vì vậy detection loss cần cơ chế cân bằng positive và negative, nếu không model sẽ học dự đoán background khắp nơi mà vẫn có loss thấp.

### 5.2 Recognition loss

#### CTC Loss

Input shape điển hình:

- `logits`: `[B, T, C]`
- transpose thành `[T, B, C]` cho CTC implementation

Label shape:

- `labels`: `[B, max_len]`
- `label_lengths`: `[B]`
- `pred_lengths`: `[B]`

Loss:

```text
L_ctc = -log P(target_sequence | input_features)
```

Ưu điểm chính của CTC là không cần alignment ký tự-thời gian thủ công.

#### Attention Loss

Attention recognizer thường dùng cross-entropy token-level:

```text
L_att = sum_t CrossEntropy(p_t, y_t)
```

### 5.3 Angle loss

Angle classifier dùng cross-entropy nhị phân hoặc đa lớp:

- `logits`: `[B, 2]`
- `labels`: `[B]`

Loss đơn giản nhưng có tác động rõ tới chất lượng OCR thực tế khi dữ liệu có crop bị đảo chiều.

---

## 6. Optimizer & Learning Rate Strategy

Optimizer và learning rate schedule quyết định tốc độ hội tụ và độ ổn định của training.

### 6.1 Optimizer type

#### Adam

Ưu điểm:

- Hội tụ nhanh
- Dễ tune cho OCR task
- Phù hợp với DBNet, CRNN và classifier nhẹ

#### SGD / Momentum

Ưu điểm:

- Có thể generalize tốt hơn trong một số setup dài hạn
- Hợp với backbone CNN nặng

Nhược điểm:

- Nhạy hơn với learning rate và schedule

#### AdamW

Ưu điểm:

- Tách weight decay khỏi moment update
- Phù hợp với transformer recognizer như SVTR

### 6.2 Learning rate schedule

#### Warmup

Warmup tăng learning rate dần ở giai đoạn đầu:

```text
lr(t) = base_lr * t / warmup_steps
```

Tác dụng:

- Giảm nguy cơ divergence đầu training
- Rất quan trọng với backbone pretrained hoặc transformer

#### Cosine decay

```text
lr(t) = lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(pi * t / T))
```

Ưu điểm:

- Giảm LR mượt
- Hợp với training recognition dài

#### Step decay

Giảm learning rate tại các mốc epoch cố định. Dễ hiểu và phù hợp với recipe truyền thống.

### 6.3 Gradient clipping

Gradient clipping thường dùng với recognizer có RNN hoặc attention để tránh exploding gradients:

```python
clip_grad_norm = 5.0
```

### 6.4 Khuyến nghị thực tế

- `DBNet + MobileNetV3`: Adam, learning rate trung bình, decay nhẹ
- `CRNN + CTC`: Adam + cosine decay + warmup ngắn
- `SVTR`: AdamW + warmup + cosine decay
- `Angle cls`: Adam đơn giản, batch lớn, hội tụ nhanh

---

## 7. Training Loop

Training loop của PaddleOCR về cơ bản là training loop chuẩn deep learning, nhưng dữ liệu, tensor output, loss function và metric evaluation thay đổi theo từng task.

### 7.1 Step-by-step training pipeline

#### Forward pass

- Lấy batch từ dataloader
- Chạy qua model
- Nhận output tensor theo task

Ví dụ:

- Detection: `maps [B, 3, H', W']`
- Recognition: `logits [B, T, C]`
- Classification: `logits [B, 2]`

#### Loss calculation

- Truyền output tensor và label tensor vào loss tương ứng
- Tính scalar total loss

#### Backpropagation

- `loss.backward()`
- Gradient đi ngược qua head, neck, backbone

#### Gradient update

- Optimizer cập nhật trọng số
- Scheduler cập nhật learning rate
- Clear gradient cho batch tiếp theo

#### Checkpoint saving

- Lưu `latest`
- Lưu `best_model` theo validation metric

### 7.2 Evaluation trong training

Metric phổ biến:

- Detection: `precision`, `recall`, `hmean`
- Recognition: `accuracy`, `norm_edit_distance`
- Classification: `accuracy`

Không nên chỉ nhìn training loss. Với OCR, validation metric mới phản ánh đúng khả năng tổng quát hóa trên tài liệu thật.

### 7.3 Pseudocode training loop

```python
train_loader = build_dataloader(train_config)
val_loader = build_dataloader(val_config)
model = build_model(arch_config)
loss_fn = build_loss(loss_config)
optimizer = build_optimizer(opt_config, model.parameters())
scheduler = build_scheduler(lr_config, optimizer)
metric = build_metric(metric_cfg)

best_score = -1

for epoch in range(num_epochs):
    model.train()

    for batch in train_loader:
        images = batch[0]
        preds = model(images)
        loss_dict = loss_fn(preds, batch)
        total_loss = loss_dict["loss"]

        total_loss.backward()
        clip_gradients_if_needed(model)
        optimizer.step()
        optimizer.clear_grad()
        scheduler.step()

    model.eval()
    metric.reset()

    with no_grad():
        for batch in val_loader:
            preds = model(batch[0])
            outputs = post_process(preds, batch)
            metric.update(outputs, batch)

    score = metric.accumulate()
    save_latest_checkpoint(model, optimizer)
    if score > best_score:
        best_score = score
        save_best_checkpoint(model, optimizer)
```

---

## 8. Config System

Một điểm mạnh của PaddleOCR là config YAML khá rõ ràng. Các cấu hình thường nằm trong `configs/` với ba nhóm chính:

- `configs/det/`
- `configs/rec/`
- `configs/cls/`

Ví dụ:

- `configs/det/db_resnet50.yml`
- `configs/rec/crnn.yml`
- `configs/cls/cls_mv3.yml`

### 8.1 Cấu trúc config điển hình

```yaml
Global:
  use_gpu: true
  epoch_num: 200
  save_model_dir: ./output/rec_crnn
  character_dict_path: ./dict/vi_en_dict.txt
  max_text_length: 40

Optimizer:
  name: Adam
  beta1: 0.9
  beta2: 0.999
  lr:
    name: Cosine
    learning_rate: 0.001
    warmup_epoch: 2

Architecture:
  model_type: rec
  algorithm: CRNN
  Backbone:
    name: MobileNetV3
  Neck:
    name: SequenceEncoder
    encoder_type: rnn
  Head:
    name: CTCHead

Train:
  dataset:
    data_dir: ./train_data/rec/
    label_file_list: [./train_data/rec/train.txt]
  loader:
    batch_size_per_card: 256
    shuffle: true
```

### 8.2 Tham số quan trọng

#### `batch_size`

Ảnh hưởng tới:

- độ ổn định gradient
- VRAM usage
- throughput

#### `learning_rate`

Nếu quá lớn, training dễ divergence. Nếu quá nhỏ, training chậm và dễ kẹt local minima.

#### `optimizer`

Phải phù hợp với kiến trúc. CRNN thường chạy ổn với Adam, transformer recognition thường hợp hơn với AdamW.

#### `dataset_path` / `data_dir`

Đây là nơi trỏ tới dữ liệu huấn luyện. Ngoài path đúng, còn phải kiểm tra:

- delimiter đúng chưa
- file label có UTF-8 sạch không
- dictionary có khớp nhãn không

### 8.3 Ý nghĩa thực tế của config system

Config không chỉ là file tham số. Nó là bản mô tả đầy đủ của experiment:

- dữ liệu nào đang dùng
- mô hình nào được dựng
- loss nào đang tối ưu
- metric nào quyết định best checkpoint

Với team AI production, YAML config cần được version hóa như một artifact chính thức.

---

## 9. Command Training

Command cơ bản:

```bash
python tools/train.py -c configs/rec/crnn.yml
```

### 9.1 Ý nghĩa của command

- `python tools/train.py`: entry point cho training
- `-c`: đường dẫn tới file config

### 9.2 Override tham số qua CLI

Ví dụ:

```bash
python tools/train.py \
  -c configs/det/db_resnet50.yml \
  -o Global.use_gpu=True \
     Global.save_model_dir=./output/det_resume \
     Train.loader.batch_size_per_card=8
```

Ý nghĩa:

- `-o`: override trực tiếp các giá trị trong YAML
- giảm batch để phù hợp VRAM
- đổi output directory mà không cần sửa file config gốc

### 9.3 Ba command phổ biến

#### Train detection

```bash
python tools/train.py -c configs/det/db_resnet50.yml
```

#### Train recognition

```bash
python tools/train.py -c configs/rec/crnn.yml
```

#### Train angle classifier

```bash
python tools/train.py -c configs/cls/cls_mv3.yml
```

### 9.4 Checklist trước khi train

- Annotation detection đúng JSON format
- Recognition label không vượt quá `max_text_length`
- Character dictionary bao phủ đầy đủ ký tự thật
- Validation set tách độc lập khỏi train set
- Augmentation phù hợp domain thật

---

## 10. Deployment Pipeline

Pipeline inference chuẩn của PaddleOCR có thể mô tả như sau:

```text
image
  ↓
text detection
  ↓
cropped text region
  ↓
angle classification
  ↓
text recognition
  ↓
final text output
```

### 10.1 Các bước triển khai production

1. Render PDF page thành image nếu input là PDF
2. Chạy detector để lấy text boxes
3. Crop từng box bằng perspective transform
4. Chạy angle classifier nếu bật
5. Chạy recognizer trên các crop
6. Ghép text với box và confidence
7. Đưa kết quả sang downstream parser hoặc IE pipeline

### 10.2 Pseudocode inference

```python
def ocr_infer(image):
    det_boxes = det_model.predict(image)
    results = []

    for box in det_boxes:
        crop = perspective_crop(image, box)

        if use_angle_cls:
            angle = cls_model.predict(crop)
            if angle == 180:
                crop = rotate_180(crop)

        text, score = rec_model.predict(crop)
        results.append({
            "box": box,
            "text": text,
            "score": score,
        })

    return results
```

### 10.3 Điểm nghẽn khi deploy

- Detection là bottleneck nếu ảnh lớn
- Recognition là bottleneck nếu một trang có quá nhiều box
- Crop bằng CPU có thể trở thành chi phí đáng kể
- PDF dài nhiều trang cần song song hóa hoặc batching hợp lý

---

## 11. Các hạn chế của PaddleOCR

Dù rất mạnh trong thực tế, PaddleOCR vẫn có các hạn chế kiến trúc và vận hành cần nhận diện rõ.

### 11.1 Latency

OCR là pipeline nhiều stage, không phải một model duy nhất. Detection, crop, angle classification và recognition tạo ra độ trễ cộng dồn. Với document nhiều text box, latency recognition tăng gần tuyến tính theo số lượng crop.

### 11.2 Model size

Nếu dùng detector mạnh và recognizer transformer, footprint deployment sẽ tăng nhanh. Multi-language dictionary cũng làm prediction head lớn hơn.

### 11.3 Difficulty in training

- Detection annotation polygon tốn công gán nhãn
- Recognition nhạy với label noise
- Tuning augmentation, dictionary và `max_text_length` không đơn giản
- Fine-tune sai config có thể làm accuracy giảm dù loss nhìn vẫn ổn

### 11.4 Layout limitation

PaddleOCR cơ bản là OCR engine tốt, nhưng chưa phải document understanding system hoàn chỉnh.

Các hạn chế chính:

- Không tự hiểu semantic block như heading, experience, education, skills
- Không tự phục hồi quan hệ `label -> value`
- Không xử lý reading order phức tạp của layout nhiều cột nếu không bổ sung module khác

### 11.5 Domain gap

Model pretrained chung thường gặp khó với:

- CV template sáng tạo
- Font cách điệu
- Ảnh chụp có shadow hoặc blur
- CV tiếng Việt lẫn tiếng Anh
- Section có icon, timeline hoặc bảng

---

## 12. Đề xuất cải tiến

### 12.1 Model improvements

#### Transformer-based recognition

Thay CRNN bằng SVTR hoặc recognizer transformer hiện đại có thể cải thiện accuracy với:

- font đa dạng
- text méo hình học
- crop khó hoặc nhiều context

#### Lightweight backbone

Nếu ưu tiên latency, nên dùng backbone nhẹ cho detection và distillation cho recognizer để tạo cấu hình `fast-inference` và `high-accuracy` riêng.

#### Vision Transformer OCR

Với domain khó và đủ tài nguyên, có thể cân nhắc ViT-based OCR hoặc encoder-decoder document OCR để tăng khả năng học ngữ cảnh toàn cục.

### 12.2 Training improvements

#### Synthetic text data

Sinh dữ liệu synthetic là cải tiến có hiệu quả rất cao cho OCR.

Ứng dụng cho CV parser:

- render resume giả với nhiều template
- mô phỏng scan, blur, JPEG compression
- tạo text Việt-Anh, email, phone number, skill name, company name

#### Curriculum learning

Huấn luyện từ dễ tới khó:

1. PDF render sạch
2. scan nhẹ
3. ảnh chụp điện thoại
4. hard samples nhiều distortion

Cách này giúp recognizer hội tụ ổn định hơn.

#### Multi-language training

CV thường chứa tiếng Việt, tiếng Anh, từ khóa kỹ thuật và tên riêng quốc tế. Vì vậy nên:

- dùng dictionary hỗn hợp vi/en/domain-specific
- cân bằng sampling theo nhóm ngôn ngữ
- theo dõi metric riêng cho từng nhóm dữ liệu

### 12.3 Pipeline improvements

#### Layout-aware OCR

Bổ sung module layout analysis để hiểu block như:

- header
- contact info
- summary
- experience
- education
- skills
- projects

#### Document structure detection

Không nên coi OCR output chỉ là text phẳng. Cần giữ lại box, page index và block grouping để downstream extraction hiểu cấu trúc tài liệu.

#### Table detection

Nhiều CV có layout dạng bảng hoặc timeline. Nếu không detect cấu trúc này, reading order sẽ sai và parser dễ nhầm trường.

#### Reading order recovery

Cần thêm heuristic hoặc model để sắp xếp text theo line, block và column thay vì chỉ sort theo tọa độ `y` rồi `x`.

### 12.4 Đánh giá mô hình ở mức hệ thống

Ngoài metric cơ bản như CER/WER, nên bổ sung:

- field extraction accuracy
- section classification accuracy
- latency per page
- cost per document
- end-to-end parser accuracy

OCR tốt chưa chắc parser tốt. Với nền tảng tuyển dụng, metric cuối cùng phải gắn với chất lượng hồ sơ ứng viên có cấu trúc.

---

## 13. Áp dụng cho hệ thống AI CV Parser

### 13.1 Pipeline áp dụng

```text
CV image/PDF
  ↓
Page rendering and preprocessing
  ↓
OCR detection + recognition
  ↓
Text blocks with coordinates
  ↓
Reading order recovery
  ↓
Information extraction
  ↓
Structured candidate profile
```

### 13.2 Tại sao OCR có tọa độ quan trọng với CV parser

CV không chỉ là text thuần. Cùng một token, vị trí khác nhau sẽ mang nghĩa khác nhau.

Ví dụ:

- Text ở đầu trang có thể là tên ứng viên
- Text gần icon điện thoại thường là số điện thoại
- Text trong block `Experience` phải được diễn giải khác block `Education`

Do đó output OCR nên giữ:

- bounding box
- page index
- line index
- block index
- confidence

### 13.3 Kiến trúc đề xuất cho Resume Extraction

#### Stage 1: Input normalization

- render PDF ở 200-300 DPI
- deskew nếu cần
- đánh giá quality page

#### Stage 2: OCR

- detector cho text region
- recognizer với vi/en dictionary
- angle classifier nếu cần

#### Stage 3: Layout understanding

- gom box thành line
- gom line thành block
- gán nhãn block như experience, education, skills

#### Stage 4: Information extraction

- regex cho email, phone, URL
- NER hoặc span extraction cho name, title, company, school
- relation extraction cho `company - role - duration`

#### Stage 5: Candidate profile assembly

Ví dụ output:

```json
{
  "name": "Nguyen Van A",
  "email": "a.nguyen@gmail.com",
  "phone": "+84 912 345 678",
  "skills": ["Python", "SQL", "PyTorch"],
  "experience": [
    {
      "company": "ABC Tech",
      "title": "ML Engineer",
      "duration": "2022-2025"
    }
  ]
}
```

### 13.4 Cải tiến phù hợp cho Recruitment AI Platform

- dictionary chuyên biệt cho CV/resume
- synthetic data với template resume thực tế
- reading order recovery tốt cho layout nhiều cột
- human-in-the-loop correction cho các field confidence thấp
- đánh giá OCR theo tác động thực tế lên parser và matching engine

---

## 14. Tài liệu cuối cùng

### 14.1 Mục tiêu đầu ra

Một tài liệu PaddleOCR training chất lượng cho team AI nên có:

- mô tả pipeline training hoàn chỉnh
- giải thích rõ dataset và annotation
- mô tả model architecture theo từng module
- pseudocode training loop và inference loop
- phần hạn chế và phần cải tiến thực tế
- định hướng áp dụng vào bài toán CV parsing

### 14.2 Code example tối thiểu cho recognition training

```python
images, labels, lengths = batch
logits = rec_model(images)           # [B, T, C]
logits = logits.transpose(1, 0, 2)   # [T, B, C]
loss = ctc_loss(logits, labels, pred_lengths, lengths)
loss.backward()
optimizer.step()
optimizer.zero_grad()
```

### 14.3 Pseudocode end-to-end OCR + parser

```python
def parse_resume(document):
    pages = render_pdf_if_needed(document)
    all_lines = []

    for page in pages:
        det_boxes = det_model(page)
        page_text = []

        for box in det_boxes:
            crop = rectify(page, box)
            if angle_cls_enabled and cls_model(crop) == 180:
                crop = rotate_180(crop)
            text, score = rec_model(crop)
            page_text.append((box, text, score))

        ordered_lines = recover_reading_order(page_text)
        all_lines.extend(ordered_lines)

    structured_profile = information_extraction(all_lines)
    return structured_profile
```

### 14.4 Kết luận kỹ thuật

PaddleOCR là OCR framework rất thực dụng vì:

- module hóa rõ ràng
- dễ fine-tune từng thành phần
- có hệ config mạnh
- phù hợp để làm baseline production

Tuy nhiên, nếu mục tiêu là AI CV Parser, PaddleOCR chỉ nên được xem là lõi OCR. Để tạo ra hệ thống parser tốt, cần mở rộng thêm layout analysis, reading order recovery và information extraction. Giá trị cuối cùng không nằm ở việc đọc đúng từng ký tự riêng lẻ, mà ở khả năng chuyển tài liệu CV đa dạng thành hồ sơ ứng viên có cấu trúc, đáng tin cậy và sẵn sàng cho matching/search.

---

## Phụ lục A - Ví dụ config recognition cho domain CV

```yaml
Global:
  use_gpu: true
  epoch_num: 72
  save_model_dir: ./output/rec_resume
  character_dict_path: ./train_data/dict/vi_en_resume_dict.txt
  max_text_length: 40
  use_space_char: true

Optimizer:
  name: Adam
  beta1: 0.9
  beta2: 0.999
  lr:
    name: Cosine
    learning_rate: 0.0005
    warmup_epoch: 2

Architecture:
  model_type: rec
  algorithm: CRNN
  Backbone:
    name: MobileNetV3
    scale: 0.5
  Neck:
    name: SequenceEncoder
    encoder_type: rnn
    hidden_size: 96
  Head:
    name: CTCHead

Loss:
  name: CTCLoss
```

## Phụ lục B - Checklist fine-tune cho CV OCR

- kiểm tra dictionary bao phủ tiếng Việt có dấu, email, số điện thoại và ký hiệu kỹ thuật
- kiểm tra `max_text_length` đủ cho dòng dài trong CV
- tách validation theo nguồn dữ liệu: PDF render, scan, ảnh chụp
- đánh giá không chỉ CER/WER mà cả field extraction accuracy
- bổ sung synthetic resume data nếu dữ liệu thật chưa đủ đa dạng
- giữ lại bounding box để phục vụ layout-aware parsing

