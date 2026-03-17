# Phân tích source code PaddleOCR public

## 1. Phạm vi và cách đọc

Tài liệu này được viết dựa trên việc đọc trực tiếp các file mã nguồn, cấu hình và tài liệu trong repo `d:\PaddleOCR`.

Nguyên tắc:

- Không suy đoán ngoài những gì có trong source hoặc docs đi kèm repo.
- Mỗi nhận định đều gắn với file hoặc module cụ thể.
- Khi code ở `paddleocr/` chỉ đóng vai trò wrapper sang PaddleX, tôi ghi rõ đó là wrapper và chỉ kết luận trong phạm vi wrapper + docs hiện có.
- Mọi ví dụ có token/key được thay bằng `[REDACTED]`.

## 2. Cây thư mục mức 2-3

```text
PaddleOCR/
  applications/
    benchmark/PaddleOCR_DBNet/...
  configs/
    cls/ch_PP-OCRv3/
    det/ch_ppocr_v2.0/
    det/ch_PP-OCRv2/
    det/PP-OCRv3/
    det/PP-OCRv4/
    det/PP-OCRv5/
    e2e/
    kie/layoutlm_series/
    kie/sdmgr/
    kie/vi_layoutxlm/
    rec/ch_ppocr_v2.0/
    rec/ch_PP-OCRv2/
    rec/multi_language/
    rec/PP-FormuaNet/
    rec/PP-OCRv3/
    rec/PP-OCRv4/
    rec/PP-OCRv5/
    rec/SVTRv2/
    sr/
    table/
  deploy/
    cpp_infer/src/
    docker/hubserving/
    hubserving/ocr_system/
    hubserving/ocr_det/
    hubserving/ocr_rec/
    hubserving/ocr_cls/
    hubserving/structure_system/
    hubserving/structure_layout/
    hubserving/structure_table/
    hubserving/kie_ser/
    hubserving/kie_ser_re/
    paddleocr_vl_docker/hps/
    slim/auto_compression/
    slim/prune/
    slim/quantization/
  docs/
    version2.x/
    version3.x/algorithm/
    version3.x/deployment/
    version3.x/module_usage/
    version3.x/paddlex/
    version3.x/pipeline_usage/
  mcp_server/
    paddleocr_mcp/
  paddleocr/
    _models/
    _pipelines/
    _utils/
  ppocr/
    data/imaug/
    losses/
    metrics/
    modeling/architectures/
    modeling/backbones/
    modeling/heads/
    modeling/necks/
    modeling/transforms/
    optimizer/
    postprocess/
    utils/
  ppstructure/
    kie/
    layout/
    pdf2word/
    recovery/
    table/
  test_tipc/
    configs/
  tools/
    end2end/
    infer/
```

## 3. Các file đầu mối được xác định trước khi phân tích chi tiết

### 3.1 README / packaging / dependency

- `README.md`: quick start, ví dụ CLI/Python API, ví dụ output `save_to_json`, `save_to_markdown`, ví dụ API key cho `PPChatOCRv4Doc`.
- `pyproject.toml`: package name, dependency, optional dependency, CLI entry point `paddleocr`.
- `setup.py`: chỉ gọi `setup()`, việc đóng gói chính nằm ở `pyproject.toml`.
- `requirements.txt`: dependency cài đặt bổ sung cho repo.

### 3.2 Docs

- `docs/version3.x/pipeline_usage/OCR.md`
- `docs/version3.x/pipeline_usage/PP-StructureV3.md`
- `docs/version3.x/pipeline_usage/formula_recognition.md`
- `docs/version3.x/deployment/serving.md`
- `docs/version3.x/deployment/mcp_server.md`

Các docs trên rất quan trọng vì package mới trong `paddleocr/` bọc PaddleX khá nhiều, nên docs là nguồn chính để xác nhận input type, output schema và serving flow.

### 3.3 API server / serving / public interface

- `paddleocr/__main__.py`
- `paddleocr/_cli.py`
- `paddleocr/__init__.py`
- `paddleocr/_pipelines/base.py`
- `deploy/hubserving/ocr_system/module.py`
- `deploy/hubserving/structure_system/module.py`
- `deploy/paddleocr_vl_docker/hps/gateway/app.py`
- `mcp_server/paddleocr_mcp/__main__.py`
- `mcp_server/paddleocr_mcp/pipelines.py`
- `deploy/cpp_infer/src/api/pipelines/ocr.h`
- `deploy/cpp_infer/src/api/pipelines/ocr.cc`

### 3.4 Inference / infer scripts

- `tools/infer/predict_system.py`
- `tools/infer/predict_det.py`
- `tools/infer/predict_rec.py`
- `tools/infer/predict_cls.py`
- `tools/infer/predict_e2e.py`
- `tools/infer/utility.py`
- `tools/infer_table.py`
- `tools/infer_kie.py`
- `ppstructure/predict_system.py`

### 3.5 Train / eval / export / program loop

- `tools/train.py`
- `tools/eval.py`
- `tools/export_model.py`
- `tools/program.py`

### 3.6 Configs

- `configs/det/PP-OCRv5/PP-OCRv5_server_det.yml`
- `configs/rec/PP-OCRv5/PP-OCRv5_server_rec.yml`
- `configs/table/SLANet.yml`
- `configs/kie/layoutlm_series/ser_layoutxlm_xfund_zh.yml`
- `configs/rec/LaTeX_OCR_rec.yaml`
- `configs/e2e/e2e_r50_vd_pg.yml`

## 4. Kết luận kiến trúc tổng quan của codebase

### 4.1 Repo có 2 lớp chính

#### Lớp 1: public SDK/CLI đời mới

- Nằm chủ yếu ở `paddleocr/`.
- Theo `pyproject.toml`, package `paddleocr` phụ thuộc trực tiếp vào `paddlex[ocr-core]`.
- `paddleocr/_pipelines/base.py` cho thấy các pipeline mới tạo instance bằng `paddlex.create_pipeline(...)`.
- `paddleocr/_models/base.py` cho thấy các model wrapper tạo predictor bằng `paddlex.create_predictor(...)`.

Nói ngắn gọn: `paddleocr/` là lớp public interface đời mới, thiên về wrapper, config merge và CLI.

#### Lớp 2: engine OCR/structure/train đời cũ nhưng đầy đủ lõi năng lực

- OCR core, data, model, loss, metric, postprocess nằm ở `ppocr/`.
- Document structure, table, KIE, recovery nằm ở `ppstructure/`.
- Train/eval/export/infer script nằm ở `tools/`.

Nói ngắn gọn: nếu cần hiểu repo “làm được gì” ở mức thực thi mô hình, phải đọc cả `ppocr/`, `ppstructure/` và `tools/`.

### 4.2 Public surface được export

`paddleocr/__init__.py` export cả model-level API và pipeline-level API:

- Model wrappers: `TextDetection`, `TextRecognition`, `LayoutDetection`, `FormulaRecognition`, `TableStructureRecognition`, `TableCellsDetection`, `TableClassification`, `TextImageUnwarping`, `DocImgOrientationClassification`, `TextLineOrientationClassification`, `ChartParsing`, `DocVLM`.
- Pipeline wrappers: `PaddleOCR`, `PPStructureV3`, `PaddleOCRVL`, `FormulaRecognitionPipeline`, `TableRecognitionPipelineV2`, `SealRecognition`, `DocPreprocessor`, `DocUnderstanding`, `PPChatOCRv4Doc`, `PPDocTranslation`.

Nguồn: `paddleocr/__init__.py`.

## 5. Chức năng chính của codebase và mapping theo file/thư mục

### 5.1 OCR văn bản tổng quát

- Public Python API: `paddleocr/_pipelines/ocr.py` với class `PaddleOCR`.
- Legacy OCR system: `tools/infer/predict_system.py` với class `TextSystem`.
- Text detection model wrappers: `paddleocr/_models/text_detection.py`, `tools/infer/predict_det.py`.
- Text recognition model wrappers: `paddleocr/_models/text_recognition.py`, `tools/infer/predict_rec.py`.
- Text line orientation / cls: `tools/infer/predict_cls.py`, `paddleocr/_models/textline_orientation_classification.py`.

Chức năng: phát hiện vùng text, nhận dạng text, tùy chọn phân loại hướng dòng chữ, tùy chọn tiền xử lý tài liệu.

### 5.2 Document preprocessing

- `paddleocr/_pipelines/doc_preprocessor.py`
- Tùy chọn được map trong `paddleocr/_pipelines/ocr.py` và `paddleocr/_pipelines/pp_structurev3.py`:
  - `use_doc_orientation_classify`
  - `use_doc_unwarping`

Chức năng: chỉnh hướng tài liệu, unwarp/hiệu chỉnh ảnh tài liệu trước khi OCR hoặc structure parsing.

### 5.3 Layout parsing / document structure

- Public wrapper: `paddleocr/_pipelines/pp_structurev3.py`
- Legacy orchestrator: `ppstructure/predict_system.py`
- Layout detection model: `ppstructure/layout/predict_layout.py`, `paddleocr/_models/layout_detection.py`
- Recovery sang Markdown/DOCX: `ppstructure/recovery/recovery_to_markdown.py`, `ppstructure/recovery/recovery_to_doc.py`

Chức năng: phân vùng tài liệu thành paragraph, title, table, formula, seal, image... rồi gắn OCR/structure tương ứng.

### 5.4 Table parsing

- Pipeline wrapper: `paddleocr/_pipelines/table_recognition_v2.py`
- Table structure model: `ppstructure/table/predict_structure.py`, `paddleocr/_models/table_structure_recognition.py`
- Table system: `ppstructure/table/predict_table.py`
- Xuất Excel: `ppstructure/table/predict_table.py` qua `to_excel(...)`

Chức năng: detect/crop bảng, parse cấu trúc bảng, OCR ô bảng, ghép HTML/XLSX.

### 5.5 Formula recognition

- Pipeline wrapper: `paddleocr/_pipelines/formula_recognition.py`
- Model wrapper: `paddleocr/_models/formula_recognition.py`
- Legacy formula branch trong `ppstructure/predict_system.py`
- Training config: `configs/rec/LaTeX_OCR_rec.yaml`

Chức năng: nhận dạng công thức và xuất kết quả dạng LaTeX / structured result.

### 5.6 KIE

- `ppstructure/kie/predict_kie_token_ser_re.py`
- `tools/infer_kie.py`
- `tools/infer_kie_token_ser.py`
- `tools/infer_kie_token_ser_re.py`
- Configs: `configs/kie/layoutlm_series/...`

Chức năng: SER (semantic entity recognition) và RE (relation extraction) trên tài liệu.

### 5.7 End-to-end text spotting

- `tools/infer_e2e.py`
- `tools/infer/predict_e2e.py`
- Config: `configs/e2e/e2e_r50_vd_pg.yml`

Chức năng: pipeline e2e kiểu PGNet, không chỉ tách det/rec rời.

### 5.8 Train / eval / export / compression

- Train: `tools/train.py`
- Eval: `tools/eval.py`
- Export: `tools/export_model.py`
- Program loop: `tools/program.py`
- Compression/prune/quantization: `deploy/slim/auto_compression/`, `deploy/slim/prune/`, `deploy/slim/quantization/`

### 5.9 Serving / integration

- CLI package: `paddleocr/_cli.py`
- PaddleX serving docs: `docs/version3.x/deployment/serving.md`
- PaddleHub service modules: `deploy/hubserving/*/module.py`
- MCP server: `mcp_server/paddleocr_mcp/*`
- FastAPI gateway cho PaddleOCR-VL docker: `deploy/paddleocr_vl_docker/hps/gateway/app.py`
- C++ API: `deploy/cpp_infer/src/api/pipelines/ocr.h`, `deploy/cpp_infer/src/api/pipelines/ocr.cc`

## 6. API call / endpoint / CLI / public interface

### 6.1 Python package API

Theo `paddleocr/__init__.py`, public import chính là:

```python
from paddleocr import PaddleOCR, PPStructureV3, FormulaRecognitionPipeline
```

Ngoài ra còn có các wrapper model-level và pipeline-level khác như `PaddleOCRVL`, `PPChatOCRv4Doc`, `PPDocTranslation`, `LayoutDetection`, `TextRecognition`...

### 6.2 CLI `paddleocr`

Nguồn CLI entry:

- `pyproject.toml`: `paddleocr = "paddleocr.__main__:console_entry"`
- `paddleocr/__main__.py`: chuyển vào `_cli.main()`

Đoạn code ngắn minh họa:

```python
def _get_parser():
    parser = argparse.ArgumentParser(prog="paddleocr")
    subparsers = parser.add_subparsers(dest="subcommand")
    _register_pipelines(subparsers)
    _register_models(subparsers)
```

Nguồn: `paddleocr/_cli.py`.

Ý nghĩa:

- CLI được sinh theo kiểu subcommand.
- Có 2 nhóm chính: pipeline subcommand và model subcommand.
- Ngoài ra còn có command cài dependency và chạy genai server.

Ví dụ CLI được README public hóa:

- `paddleocr ocr -i <url>`
- `paddleocr pp_structurev3 -i <url>`
- `paddleocr doc_parser -i <url>`

Nguồn: `README.md`.

### 6.3 Legacy CLI / infer scripts

Các script độc lập vẫn tồn tại và rất quan trọng:

- `python tools/infer/predict_system.py ...`
- `python tools/infer/predict_det.py ...`
- `python tools/infer/predict_rec.py ...`
- `python tools/infer/predict_cls.py ...`
- `python tools/infer/predict_e2e.py ...`
- `python ppstructure/predict_system.py ...`
- `python tools/train.py -c <config>`
- `python tools/eval.py -c <config>`
- `python tools/export_model.py -c <config>`

Nhóm này phản ánh năng lực lõi của repo rõ hơn lớp wrapper mới.

### 6.4 PaddleX serving

`docs/version3.x/deployment/serving.md` ghi cách chạy:

```bash
paddlex --serve --pipeline OCR
```

Ý nghĩa:

- Phần `paddleocr/` không tự dựng server riêng cho OCR thường.
- Cách serving được khuyến nghị cho pipeline mới là thông qua PaddleX.

### 6.5 HubServing modules

Có nhiều module phục vụ theo kiểu PaddleHub:

- `deploy/hubserving/ocr_system/module.py`
- `deploy/hubserving/ocr_det/module.py`
- `deploy/hubserving/ocr_rec/module.py`
- `deploy/hubserving/ocr_cls/module.py`
- `deploy/hubserving/structure_system/module.py`
- `deploy/hubserving/structure_table/module.py`
- `deploy/hubserving/structure_layout/module.py`
- `deploy/hubserving/kie_ser/module.py`
- `deploy/hubserving/kie_ser_re/module.py`

Ví dụ decode Base64 trong service:

```python
@serving
def serving_method(self, images, **kwargs):
    images_decode = [base64_to_cv2(image) for image in images]
    results = self.predict(images_decode, **kwargs)
    return results
```

Nguồn: `deploy/hubserving/ocr_system/module.py`.

Ý nghĩa:

- HubServing nhận list Base64 image.
- Bên trong chuyển sang `numpy.ndarray` rồi đưa vào `predict(...)`.

### 6.6 FastAPI endpoints trong docker PaddleOCR-VL

`deploy/paddleocr_vl_docker/hps/gateway/app.py` có các endpoint:

- `GET /health`
- `GET /health/ready`
- `POST /layout-parsing`
- `POST /restructure-pages`

Đoạn code ngắn:

```python
@app.post("/layout-parsing", operation_id="infer")
async def _handle_infer(request: Request, body: dict):
    return await _process_triton_request(
        request, body, TRITON_MODEL_LAYOUT_PARSING,
        request.app.state.inference_semaphore,
    )
```

Ý nghĩa:

- Gateway FastAPI này là lớp proxy/orchestrator cho Triton model server.
- Đây không phải API chung cho mọi phần của repo; nó phục vụ stack Docker của PaddleOCR-VL.

### 6.7 MCP server

Entrypoint:

- `mcp_server/paddleocr_mcp/__main__.py`
- `mcp_server/paddleocr_mcp/pipelines.py`

Tool được đăng ký:

- `ocr`
- `pp_structurev3`
- `paddleocr_vl`

Handler `ocr` mô tả rõ input:

```python
"""Extracts text from images and PDFs. Accepts file path, URL, or Base64."""
```

Nguồn: `mcp_server/paddleocr_mcp/pipelines.py`.

### 6.8 C++ public API

`deploy/cpp_infer/src/api/pipelines/ocr.h` khai báo class `PaddleOCR` với:

- `Predict(const std::string&)`
- `Predict(const std::vector<std::string>&)`

Đây là public interface C++ để nhúng OCR pipeline vào hệ thống native.

## 7. Khả năng đọc file / input type

### 7.1 Kết luận ngắn

Repo có bằng chứng rõ ràng cho các loại input sau:

- Ảnh: có.
- GIF: có trong legacy infer.
- PDF: có.
- Base64 image: có.
- Base64 PDF: có ở service/MCP service mode; không có ở MCP local mode.
- Folder/directory: có.
- URL: có ở lớp wrapper mới, docs và MCP/service.
- `numpy.ndarray`: có trong Python API/docs mới và HubServing.
- Bytes thô: có xử lý nội bộ để infer file type trong MCP/service; nhưng tôi chưa thấy public Python API nhận trực tiếp `bytes` như input chuẩn.
- JSON: có mạnh ở output schema và dataset/config; tôi chưa thấy “đọc file JSON như tài liệu OCR đầu vào”.
- Office docs (`.docx`, `.xlsx`, `.pptx`) làm input OCR: chưa thấy bằng chứng trực tiếp.
- Office docs làm output: có `.docx` và `.xlsx`.

### 7.2 Bằng chứng theo loại input

#### 7.2.1 Image / directory / PDF trong legacy core

Đoạn code ngắn:

```python
img_end = {"jpg", "bmp", "png", "jpeg", "rgb", "tif", "tiff", "gif", "pdf"}
if os.path.isfile(img_file) and _check_image_file(img_file):
    imgs_lists.append(img_file)
elif os.path.isdir(img_file):
    for single_file in os.listdir(img_file):
        ...
```

Nguồn: `ppocr/utils/utility.py`.

Ý nghĩa:

- Legacy input helper chấp nhận file ảnh đơn, PDF, GIF và directory.
- Duyệt directory bằng `os.listdir`, tức là duyệt nông, không phải recursive.

Đoạn code PDF/GIF:

```python
if os.path.basename(img_path)[-3:].lower() == "gif":
    ...
elif os.path.basename(img_path)[-3:].lower() == "pdf":
    fitz = try_import("fitz")
    ...
    with fitz.open(img_path) as pdf:
        for pg in range(0, pdf.page_count):
```

Nguồn: `ppocr/utils/utility.py`.

Ý nghĩa:

- GIF được đọc frame đầu.
- PDF được rasterize từng trang bằng `fitz`/PyMuPDF.

#### 7.2.2 URL / directory / numpy.ndarray trong pipeline mới

`docs/version3.x/pipeline_usage/OCR.md` và `docs/version3.x/pipeline_usage/PP-StructureV3.md` ghi rõ `predict(...)` hỗ trợ:

- `numpy.ndarray`
- local file path
- URL
- local directory
- list của các kiểu trên

Các docs này cũng ghi rõ:

- directory hiện không hỗ trợ trường hợp bên trong chứa PDF; PDF phải chỉ đến file cụ thể.

#### 7.2.3 Base64 image trong code

Đoạn code ngắn:

```python
def base64_to_cv2(b64str):
    data = base64.b64decode(b64str.encode("utf8"))
    data = np.frombuffer(data, np.uint8)
    data = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return data
```

Nguồn: `tools/infer/utility.py`.

Ý nghĩa:

- Repo có helper decode Base64 image thành OpenCV image.
- Helper này được dùng lại ở HubServing modules.

#### 7.2.4 Base64 image/PDF trong MCP

`mcp_server/paddleocr_mcp/pipelines.py` cho local mode:

```python
if file_type != "image":
    raise ValueError("Currently, only images can be passed via Base64.")
```

Ý nghĩa:

- MCP local mode chỉ nhận Base64 image, không nhận Base64 PDF.

`mcp_server/paddleocr_mcp/pipelines.py` cho service mode:

```python
if file_type_str is None:
    raise ValueError(
        "Unsupported file type in Base64 data. "
        "Only images (JPEG, PNG, etc.) and PDF documents are supported."
    )
```

Ý nghĩa:

- MCP service mode chấp nhận Base64 image và Base64 PDF.

`docs/version3.x/deployment/mcp_server.md` cũng ghi rõ:

- local Python library mode hiện không xử lý được Base64 PDF.

#### 7.2.5 URL trong MCP

`mcp_server/paddleocr_mcp/pipelines.py` có `_is_url(...)` và `_process_input_for_service(...)`.

Ý nghĩa:

- URL là public input type có thật, không chỉ là ví dụ docs.

#### 7.2.6 Raw bytes

`mcp_server/paddleocr_mcp/pipelines.py` có `_infer_file_type_from_bytes(data: bytes)`.

Ý nghĩa:

- Code có xử lý `bytes` nội bộ để nhận diện image/PDF.
- Tuy nhiên trong các public interface đã đọc, tôi chưa thấy Python API public kiểu `predict(input=b"...")` được xác nhận rõ ràng như một contract ổn định.

#### 7.2.7 JSON

Cần tách 2 nghĩa:

- JSON output/result: có rất rõ, vì README và docs nhắc `save_to_json(...)`.
- JSON dataset/config/payload: có, ví dụ PubTab dataset đọc JSONL trong `ppocr/data/pubtab_dataset.py`, service/MCP gửi nhận JSON payload.
- JSON document làm input OCR: chưa thấy bằng chứng trực tiếp trong các file đã đọc.

#### 7.2.8 Office docs

Bằng chứng đã thấy:

- Xuất `.docx`: `ppstructure/recovery/recovery_to_doc.py`
- Xuất `.xlsx`: `ppstructure/table/predict_table.py`
- PDF to Word bằng `pdf2docx`: `ppstructure/predict_system.py`, `ppstructure/pdf2word/pdf2word.py`

Chưa thấy bằng chứng trực tiếp:

- đọc `.docx`, `.xlsx`, `.pptx` như input đầu vào OCR/structure pipeline.

Vì vậy kết luận an toàn là:

- Có output Office.
- Chưa xác nhận input Office trực tiếp.

## 8. Khả năng OCR / scan / parse ra text

### 8.1 OCR pipeline mới

`paddleocr/_pipelines/ocr.py` là wrapper public cho pipeline OCR mới.

Các ý quan trọng đọc được từ file này:

- pipeline name mặc định là `"OCR"`.
- Có mapping tham số public sang config PaddleX:
  - doc orientation
  - unwarping
  - textline orientation
  - detection threshold/shape
  - recognition threshold/shape
  - `return_word_box`
- Có logic map `lang` + `ocr_version` sang tên model thích hợp.

Đoạn code ngắn minh họa mapping config:

```python
"SubModules.TextDetection.thresh": self._params["text_det_thresh"],
"SubModules.TextRecognition.score_thresh": self._params["text_rec_score_thresh"],
"SubModules.TextRecognition.return_word_box": self._params["return_word_box"],
```

Nguồn: `paddleocr/_pipelines/ocr.py`.

Ý nghĩa:

- Wrapper này không tự viết OCR engine mới.
- Nó chủ yếu chuyển public parameter thành PaddleX pipeline config.

### 8.2 OCR system đời cũ vẫn thể hiện rõ luồng xử lý

`tools/infer/predict_system.py` dựng `TextSystem` bằng detector + recognizer + optional classifier.

`ppstructure/predict_system.py` cũng reuse text system khi parse document structure.

Luồng cơ bản:

1. Đọc input qua `get_image_file_list(...)` và `check_and_read(...)`.
2. Text detection.
3. Tách crop text box.
4. Text recognition.
5. Optional orientation/classifier.
6. Ghép kết quả, lưu txt/hình/json theo script.

### 8.3 Output text schema

MCP OCR local parser cho kết quả rất rõ:

```python
instance = {
    "text": text.strip(),
    "confidence": round(conf, 3),
    "bbox": boxes[i].tolist(),
}
```

Nguồn: `mcp_server/paddleocr_mcp/pipelines.py`.

Ý nghĩa:

- Ở mức API logic, output OCR tối thiểu là:
  - text
  - confidence
  - bbox

HubServing `ocr_system` cũng trả:

- `text`
- `confidence`
- `text_region`

Nguồn: `deploy/hubserving/ocr_system/module.py`.

## 9. Layout parsing, table, formula, structure, KIE

### 9.1 PP-StructureV3 là pipeline document parsing tổng hợp

`paddleocr/_pipelines/pp_structurev3.py` và `docs/version3.x/pipeline_usage/PP-StructureV3.md` cho thấy pipeline này có thể ghép nhiều submodule:

- layout detection
- chart parsing
- region detection
- document orientation
- document unwarping
- overall OCR
- table classification
- table structure recognition
- table cells detection
- seal recognition
- formula recognition

Ngoài ra docs còn mô tả:

- `save_to_markdown(...)`
- `concatenate_markdown_pages(...)`
- service response field `layoutParsingResults`

### 9.2 StructureSystem trong `ppstructure/` là bằng chứng rõ nhất cho orchestration

Đoạn code ngắn:

```python
if self.layout_predictor is not None:
    layout_res, elapse = self.layout_predictor(img)
...
if self.text_system is not None:
    text_res, ocr_time_dict = self._predict_text(img)
...
if region["label"] == "table":
    res, table_time_dict = self.table_system(...)
elif region["label"] == "equation" and self.formula_system is not None:
    latex_res, formula_time = self.formula_system([roi_img])
```

Nguồn: `ppstructure/predict_system.py`.

Ý nghĩa:

- Layout là tầng điều phối.
- OCR tổng quát được chạy trước, sau đó lọc theo region.
- Với region kiểu `table` thì dùng table subsystem.
- Với region kiểu `equation` thì dùng formula subsystem.

### 9.3 Table

Năng lực table được xác nhận bởi:

- `ppstructure/table/predict_structure.py`: dự đoán token cấu trúc bảng + bbox.
- `ppstructure/table/predict_table.py`: ghép table structure với OCR.
- `ppstructure/table/predict_table.py` có `to_excel(html_table, excel_path)`.
- `configs/table/SLANet.yml`: config train/infer của SLANet.
- `docs/version3.x/pipeline_usage/table_recognition_v2.md`: có `save_to_xlsx()`, `save_to_json()`, `save_to_html()` trong docs.

Kết luận:

- Repo không chỉ detect bảng.
- Repo còn parse cấu trúc và có đường xuất Excel/HTML.

### 9.4 Formula

Năng lực formula được xác nhận bởi:

- `paddleocr/_pipelines/formula_recognition.py`
- `paddleocr/_models/formula_recognition.py`
- `configs/rec/LaTeX_OCR_rec.yaml`
- `docs/version3.x/pipeline_usage/formula_recognition.md`

Docs cho thấy:

- input hỗ trợ image/PDF/URL/directory/`numpy.ndarray`
- service payload nhận URL hoặc Base64 file
- response có `formulaRecResults`

### 9.5 KIE

Năng lực KIE được xác nhận bởi:

- `ppstructure/kie/predict_kie_token_ser_re.py`
- `configs/kie/layoutlm_series/ser_layoutxlm_xfund_zh.yml`
- `tools/infer_kie.py`

Kết luận:

- Có SER.
- Có RE.
- Có train/infer config dựa trên LayoutXLM và các VQA/KIE transform.

### 9.6 Recovery sang Markdown / DOCX

`ppstructure/recovery/recovery_to_markdown.py` và `ppstructure/recovery/recovery_to_doc.py` xác nhận repo không dừng ở detect/parse mà còn có bước “reconstruct”.

`ppstructure/predict_system.py` cho thấy:

- Có thể `convert_info_docx(...)`
- Có thể `convert_info_markdown(...)`
- Nếu `use_pdf2docx_api=True` và input là PDF, có thể dùng `pdf2docx.Converter`.

## 10. Training AI: train scripts, configs, datasets, augmentation, model, eval, fine-tuning, export

### 10.1 Entry script train/eval/export

- Train: `tools/train.py`
- Eval: `tools/eval.py`
- Export: `tools/export_model.py`
- Common loop/config/device/logger/checkpoint: `tools/program.py`

Đoạn code ngắn trong `tools/train.py`:

```python
train_dataloader = build_dataloader(config, "Train", device, logger, seed)
post_process_class = build_post_process(config["PostProcess"], global_config)
model = build_model(config["Architecture"])
```

Ý nghĩa:

- Huấn luyện được build theo config YAML:
  - dataloader
  - postprocess
  - model
  - loss
  - optimizer
  - metric

### 10.2 Datasets

`ppocr/data/__init__.py` đăng ký nhiều dataset class:

- `SimpleDataSet`
- `LMDBDataSet`
- `PGDataSet`
- `PubTabDataSet`
- `LMDBDataSetSR`
- `LMDBDataSetTableMaster`
- `MultiScaleDataSet`
- `KieDataset`
- `LaTeXOCRDataSet`

Ý nghĩa:

- Không chỉ có dataset OCR văn bản thường.
- Có dataset riêng cho e2e, table, KIE, formula.

### 10.3 Một số dataset file tiêu biểu

- `ppocr/data/simple_dataset.py`: đọc label file dạng `image_path<TAB>label`.
- `ppocr/data/lmdb_dataset.py`: đọc LMDB nhiều biến thể.
- `ppocr/data/pubtab_dataset.py`: đọc JSONL với `html.cells` và `html.structure.tokens`.
- `ppocr/data/latexocr_dataset.py`: dataset pickle/tokenizer cho formula recognition.

### 10.4 Augmentation / preprocess

`ppocr/data/imaug/__init__.py` và `ppocr/data/imaug/operators.py` cung cấp nhiều operator:

- `DecodeImage`
- `NormalizeImage`
- `ToCHWImage`
- `KeepKeys`
- `Pad`
- `Resize`
- `DetResizeForTest`
- `E2EResizeForTest`
- `KieResize`
- `SRResize`

Config examples cho augmentation:

- `configs/det/PP-OCRv5/PP-OCRv5_server_det.yml` có `CopyPaste`, `IaaAugment`, `EastRandomCropData`, `MakeBorderMap`, `MakeShrinkMap`.
- `configs/rec/PP-OCRv5/PP-OCRv5_server_rec.yml` có `RecAug`, `MultiLabelEncode`.

### 10.5 Model assembly

`ppocr/modeling/architectures/base_model.py` cho thấy model được lắp theo khối:

- `Transform`
- `Backbone`
- `Neck`
- `Head`

`ppocr/modeling/architectures/__init__.py` cung cấp `build_model(...)` và `apply_to_static(...)`.

### 10.6 Loss / metric / postprocess

- `ppocr/losses/__init__.py`: nhiều loss cho det/rec/table/KIE/formula.
- `ppocr/metrics/__init__.py`: `DetMetric`, `RecMetric`, `TableMetric`, `KIEMetric`, `LaTeXOCRMetric`, ...
- `ppocr/postprocess/__init__.py`: decoder/postprocess cho DB/EAST/SAST/FCE/PSE, OCR decoders, VQA, table, layout, formula.

Điều này xác nhận repo hỗ trợ nhiều family model, không chỉ một pipeline cố định.

### 10.7 Config train tiêu biểu

#### Detection

- `configs/det/PP-OCRv5/PP-OCRv5_server_det.yml`
- Có đầy đủ `Global`, `Architecture`, `Loss`, `Optimizer`, `PostProcess`, `Metric`, `Train`, `Eval`.

#### Recognition

- `configs/rec/PP-OCRv5/PP-OCRv5_server_rec.yml`
- Dùng `MultiScaleDataSet`, `MultiScaleSampler`, `SVTR_HGNet`, `MultiHead`, `MultiLoss`.

#### Table

- `configs/table/SLANet.yml`
- Dùng `PubTabDataSet`, `TableLabelEncode`, `TableBoxEncode`, `ResizeTableImage`, `PaddingTableImage`.

#### KIE

- `configs/kie/layoutlm_series/ser_layoutxlm_xfund_zh.yml`
- Dùng `LayoutXLM`, `VQATokenLabelEncode`, `VQATokenPad`, `VQASerTokenChunk`.

#### Formula

- `configs/rec/LaTeX_OCR_rec.yaml`
- Dùng `LaTeXOCRDataSet`, `LatexTrainTransform`, `LatexImageFormat`.

#### End-to-end

- `configs/e2e/e2e_r50_vd_pg.yml`
- Dùng `PGDataSet`, `E2ELabelEncodeTrain`, `PGProcessTrain`.

### 10.8 Fine-tuning

Repo cho thấy 2 đường fine-tuning chính:

#### Đường cũ

- Fine-tune theo YAML train config trong `configs/...`
- Chạy bằng `tools/train.py`
- Eval bằng `tools/eval.py`
- Export bằng `tools/export_model.py`

#### Đường mới theo pipeline config

`paddleocr/_pipelines/base.py` có `export_paddlex_config_to_yaml(...)`.

`docs/version3.x/pipeline_usage/formula_recognition.md` mô tả rõ quy trình:

1. export config hiện tại ra YAML,
2. sửa `model_dir` / `model_name`,
3. nạp lại pipeline bằng config đã sửa.

Kết luận:

- Repo hỗ trợ fine-tune model lõi theo config train.
- Với pipeline wrapper mới, repo hỗ trợ “gắn model fine-tuned vào pipeline” qua YAML config export/import.

### 10.9 Export

- `tools/export_model.py`: export model từ config.
- `tools/program.py`: quản lý save/load/checkpoint.
- `deploy/cpp_infer/`, `deploy/paddle2onnx/`, `tools/infer/utility.py`: cho thấy repo có hướng triển khai Paddle Inference, ONNX Runtime và C++ infer.

## 11. Bản đồ chức năng -> file/thư mục

| Chức năng | File/thư mục chính |
| --- | --- |
| Public Python package | `paddleocr/__init__.py`, `pyproject.toml` |
| CLI `paddleocr` | `paddleocr/__main__.py`, `paddleocr/_cli.py` |
| Wrapper sang PaddleX | `paddleocr/_pipelines/base.py`, `paddleocr/_models/base.py` |
| OCR pipeline mới | `paddleocr/_pipelines/ocr.py` |
| Structure pipeline mới | `paddleocr/_pipelines/pp_structurev3.py` |
| Formula pipeline mới | `paddleocr/_pipelines/formula_recognition.py` |
| Table pipeline mới | `paddleocr/_pipelines/table_recognition_v2.py` |
| OCR infer cũ | `tools/infer/predict_system.py`, `tools/infer/predict_det.py`, `tools/infer/predict_rec.py`, `tools/infer/predict_cls.py` |
| Input file helper | `ppocr/utils/utility.py`, `tools/infer/utility.py` |
| OCR data/model/loss/metric | `ppocr/data/`, `ppocr/modeling/`, `ppocr/losses/`, `ppocr/metrics/`, `ppocr/postprocess/` |
| Layout parsing | `ppstructure/layout/predict_layout.py`, `ppstructure/predict_system.py` |
| Table parsing | `ppstructure/table/predict_structure.py`, `ppstructure/table/predict_table.py` |
| KIE | `ppstructure/kie/predict_kie_token_ser_re.py`, `tools/infer_kie*.py`, `configs/kie/` |
| Recovery Markdown/DOCX | `ppstructure/recovery/recovery_to_markdown.py`, `ppstructure/recovery/recovery_to_doc.py` |
| PDF to Word UI | `ppstructure/pdf2word/pdf2word.py` |
| Train | `tools/train.py` |
| Eval | `tools/eval.py` |
| Export | `tools/export_model.py` |
| Common train loop | `tools/program.py` |
| Config train/infer | `configs/` |
| HubServing | `deploy/hubserving/` |
| FastAPI gateway | `deploy/paddleocr_vl_docker/hps/gateway/app.py` |
| MCP server | `mcp_server/paddleocr_mcp/` |
| C++ API | `deploy/cpp_infer/src/api/pipelines/ocr.h`, `deploy/cpp_infer/src/api/pipelines/ocr.cc` |

## 12. Checklist để tự dựng lại API tương tự PaddleOCR

Checklist này được rút ra từ các file `pyproject.toml`, `paddleocr/_pipelines/base.py`, `ppocr/utils/utility.py`, `mcp_server/paddleocr_mcp/pipelines.py`, `deploy/hubserving/ocr_system/module.py`, `docs/version3.x/pipeline_usage/OCR.md`, `docs/version3.x/pipeline_usage/PP-StructureV3.md`, `docs/version3.x/deployment/serving.md`.

### 12.1 Dependencies

- Python >= 3.8.
- `paddlex[ocr-core]>=3.4.0,<3.5.0` nếu đi theo public package mới.
- `PyYAML`, `requests`, `typing-extensions`.
- Nếu cần full document parsing / IE / translation:
  - `paddlex[ocr,genai-client]`
  - `paddlex[ie]`
  - `paddlex[trans]`
- Nếu đi theo legacy core:
  - OpenCV
  - PaddlePaddle
  - PyMuPDF/`fitz` cho PDF
  - PIL/Pillow
  - `python-docx` cho DOCX output
  - `tablepyxl` path nội bộ cho XLSX output
  - `pdf2docx` nếu muốn parse PDF kiểu direct-to-docx

### 12.2 Model files cần có

Tùy pipeline nhưng tối thiểu:

- OCR cơ bản:
  - text detection model
  - text recognition model
  - tùy chọn textline orientation model
  - tùy chọn document orientation model
  - tùy chọn doc unwarping model
- Structure pipeline:
  - layout detection model
  - overall OCR subpipeline model set
  - table structure model
  - table cells model nếu bật
  - formula recognition model nếu bật
  - seal OCR model nếu bật
- KIE:
  - SER model
  - RE model nếu bật relation extraction

Trong pipeline mới, các model này thường được map qua `model_name` và `model_dir` trong PaddleX config. Bằng chứng rõ ở `paddleocr/_pipelines/ocr.py`, `paddleocr/_pipelines/pp_structurev3.py`, `docs/version3.x/pipeline_usage/formula_recognition.md`.

### 12.3 Input pipeline

Một API tương tự nên chuẩn hóa các kiểu input sau:

- `str` local file path
- `str` URL
- `str` Base64
- `numpy.ndarray`
- list của các kiểu trên
- directory path
- PDF multi-page

Luồng xử lý khuyến nghị theo repo:

1. Nhận input.
2. Phân loại input type.
3. Nếu Base64 thì decode.
4. Nếu PDF thì rasterize từng trang.
5. Nếu directory thì expand ra danh sách file.
6. Chuẩn hóa về `numpy.ndarray` hoặc path tùy engine.
7. Chạy doc preprocess nếu bật.
8. Chạy OCR hoặc structure pipeline.

### 12.4 Output schema

Tối thiểu nên có:

- `text`
- `confidence`
- `bbox` hoặc polygon
- `page_index` nếu là PDF
- `input_path`

Nếu là structure parsing nên thêm:

- `layoutParsingResults`
- `table_res_list`
- `formula_res_list`
- `seal_res_list`
- `markdown`
- `outputImages`

Nếu là OCR service, repo cho thấy 2 kiểu output phổ biến:

- kiểu đơn giản: text ghép toàn trang
- kiểu chi tiết: từng dòng với `text`, `confidence`, `bbox`

### 12.5 Serving flow

Flow tương tự PaddleOCR nên là:

1. `load config`
2. `load model(s)`
3. `parse request`
4. `detect file type`
5. `decode / read / rasterize`
6. `run preprocess`
7. `run OCR or structure pipeline`
8. `postprocess result`
9. `return JSON`
10. tùy chọn `save_to_json`, `save_to_img`, `save_to_markdown`, `save_to_xlsx`, `save_to_docx`

Nếu làm production:

- Có health endpoint.
- Có readiness endpoint.
- Có timeout handling.
- Có standardized error body.
- Có semaphore/concurrency control.

Điểm này được thấy rõ trong `deploy/paddleocr_vl_docker/hps/gateway/app.py`.

## 13. Những điểm cần nói rõ để tránh hiểu sai

### 13.1 Không nên đồng nhất toàn bộ repo với `paddleocr/`

Nếu chỉ đọc `paddleocr/`, dễ tưởng repo chủ yếu là wrapper. Điều đó đúng với public SDK mới, nhưng chưa phản ánh hết engine training/inference cốt lõi nằm ở `ppocr/`, `ppstructure/`, `tools/`.

### 13.2 URL/Base64/PDF support không đồng đều giữa các interface

- Public wrapper mới + docs: support mạnh cho URL, PDF, directory, `numpy.ndarray`.
- Legacy infer script: chủ yếu local file/directory, PDF/GIF, không phải mọi script đều support URL.
- MCP local mode: không support Base64 PDF.
- MCP/service mode: support Base64 PDF.

### 13.3 Office input chưa có bằng chứng trực tiếp

Tôi chỉ thấy:

- output `.docx`
- output `.xlsx`
- PDF to Word

Tôi chưa thấy code public nào nhận trực tiếp `.docx/.xlsx/.pptx` làm input OCR.

## 14. Danh sách file quan trọng đã đọc

- `README.md`
- `pyproject.toml`
- `setup.py`
- `paddleocr/__init__.py`
- `paddleocr/__main__.py`
- `paddleocr/_cli.py`
- `paddleocr/_common_args.py`
- `paddleocr/_utils/cli.py`
- `paddleocr/_pipelines/base.py`
- `paddleocr/_pipelines/ocr.py`
- `paddleocr/_pipelines/pp_structurev3.py`
- `paddleocr/_pipelines/formula_recognition.py`
- `paddleocr/_pipelines/table_recognition_v2.py`
- `paddleocr/_pipelines/doc_preprocessor.py`
- `paddleocr/_models/base.py`
- `paddleocr/_models/text_detection.py`
- `paddleocr/_models/text_recognition.py`
- `paddleocr/_models/layout_detection.py`
- `paddleocr/_models/formula_recognition.py`
- `paddleocr/_models/table_structure_recognition.py`
- `tools/infer/utility.py`
- `tools/infer/predict_system.py`
- `tools/train.py`
- `tools/eval.py`
- `tools/export_model.py`
- `tools/program.py`
- `ppocr/utils/utility.py`
- `ppocr/data/__init__.py`
- `ppocr/data/simple_dataset.py`
- `ppocr/data/lmdb_dataset.py`
- `ppocr/data/pubtab_dataset.py`
- `ppocr/data/latexocr_dataset.py`
- `ppocr/data/imaug/__init__.py`
- `ppocr/data/imaug/operators.py`
- `ppocr/modeling/architectures/__init__.py`
- `ppocr/modeling/architectures/base_model.py`
- `ppocr/losses/__init__.py`
- `ppocr/metrics/__init__.py`
- `ppocr/postprocess/__init__.py`
- `ppstructure/utility.py`
- `ppstructure/predict_system.py`
- `ppstructure/layout/predict_layout.py`
- `ppstructure/table/predict_structure.py`
- `ppstructure/table/predict_table.py`
- `ppstructure/kie/predict_kie_token_ser_re.py`
- `ppstructure/recovery/recovery_to_doc.py`
- `ppstructure/recovery/recovery_to_markdown.py`
- `ppstructure/pdf2word/pdf2word.py`
- `deploy/hubserving/ocr_system/module.py`
- `deploy/paddleocr_vl_docker/hps/gateway/app.py`
- `deploy/cpp_infer/src/api/pipelines/ocr.h`
- `deploy/cpp_infer/src/api/pipelines/ocr.cc`
- `mcp_server/paddleocr_mcp/__main__.py`
- `mcp_server/paddleocr_mcp/pipelines.py`
- `configs/det/PP-OCRv5/PP-OCRv5_server_det.yml`
- `configs/rec/PP-OCRv5/PP-OCRv5_server_rec.yml`
- `configs/table/SLANet.yml`
- `configs/kie/layoutlm_series/ser_layoutxlm_xfund_zh.yml`
- `configs/rec/LaTeX_OCR_rec.yaml`
- `configs/e2e/e2e_r50_vd_pg.yml`
- `docs/version3.x/pipeline_usage/OCR.md`
- `docs/version3.x/pipeline_usage/PP-StructureV3.md`
- `docs/version3.x/pipeline_usage/formula_recognition.md`
- `docs/version3.x/deployment/serving.md`
- `docs/version3.x/deployment/mcp_server.md`

## 15. Tóm tắt ngắn

PaddleOCR public repo hiện là một codebase nhiều lớp:

- `paddleocr/` là public SDK/CLI đời mới, chủ yếu bọc PaddleX pipeline/model.
- `ppocr/` + `ppstructure/` + `tools/` mới là phần lõi thể hiện đầy đủ năng lực OCR, structure parsing, table, formula, KIE, train/eval/export.

Về input/output:

- Có bằng chứng rõ cho image, GIF, PDF, folder, URL, Base64 image, Base64 PDF ở service mode, `numpy.ndarray`.
- Có output JSON/Markdown/DOCX/XLSX.
- Chưa thấy bằng chứng chắc chắn cho input trực tiếp từ file Office.

Về AI/training:

- Repo có train/eval/export hoàn chỉnh cho detection, recognition, e2e, table, formula, KIE.
- Datasets, augmentation, model assembly, loss, metric, postprocess đều hiện diện trong source.
