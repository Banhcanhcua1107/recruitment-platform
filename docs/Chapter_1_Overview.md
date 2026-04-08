# Chương 1: Tổng quan về đề tài TalentFlow

## 1.1 Tổng quan đề tài

### 1.1.1 Bối cảnh tuyển dụng số và bài toán dữ liệu hồ sơ

Trong môi trường tuyển dụng số hiện nay, dữ liệu ứng viên không còn tồn tại dưới một định dạng duy nhất. Ứng viên có thể duy trì hồ sơ cá nhân trực tuyến, xây dựng CV ngay trên nền tảng, hoặc nộp các tệp PDF, DOCX và ảnh CV đã soạn sẵn. Sự đa dạng này tạo thuận lợi cho người dùng đầu cuối, nhưng đồng thời làm gia tăng chi phí chuẩn hóa dữ liệu cho phía hệ thống tuyển dụng. Khi nội dung hồ sơ không được cấu trúc hóa, nhà tuyển dụng khó tìm kiếm, đối sánh và tái sử dụng dữ liệu trong các bước tiếp theo của quy trình tuyển dụng.

Phân tích mã nguồn hiện tại cho thấy TalentFlow được xây dựng chính từ nhu cầu giải quyết vấn đề này. Hệ thống không chỉ cung cấp cổng việc làm công khai và không gian thao tác cho ứng viên, mà còn triển khai một pipeline nhập CV có hỗ trợ OCR, cho phép tiếp nhận tài liệu đầu vào ở nhiều định dạng, trích xuất nội dung, phân tích bố cục, ánh xạ dữ liệu vào cấu trúc chỉnh sửa và đưa kết quả về không gian CV Builder. Điều đó phản ánh một bài toán nghiệp vụ rõ ràng: chuyển đổi dữ liệu hồ sơ phi cấu trúc thành tài sản dữ liệu có thể tìm kiếm, chỉnh sửa và sử dụng xuyên suốt toàn bộ vòng đời tuyển dụng.

Một khó khăn khác của các hệ thống tuyển dụng truyền thống là dữ liệu thường bị phân mảnh theo ngữ cảnh sử dụng. Hồ sơ công khai của ứng viên, CV dùng để ứng tuyển, nội dung chỉnh sửa trong builder, lịch sử nộp đơn và trạng thái tuyển dụng thường nằm ở các vùng dữ liệu tách rời, dẫn đến trùng lặp, sai khác phiên bản và tăng thao tác đồng bộ thủ công. Trong TalentFlow, các nhóm bảng như `candidate_profiles`, `resumes`, `applications`, `cv_documents` và `editable_cvs` cho thấy định hướng thiết kế tập trung vào việc liên thông các nguồn dữ liệu này dưới cùng một nền tảng.

Ngoài ra, khi dữ liệu ứng viên đã được số hóa, hệ thống còn phải giải quyết bài toán phân phối thông tin đúng ngữ cảnh. Ứng viên cần nhận gợi ý việc làm phù hợp với hồ sơ; nhà tuyển dụng cần tìm kiếm ứng viên công khai theo kỹ năng, kinh nghiệm và từ khóa; trạng thái ứng tuyển cần được phản ánh kịp thời trên dashboard và cơ chế thông báo. Đây là lý do TalentFlow không dừng lại ở mức “đăng tin tuyển dụng”, mà mở rộng thành một nền tảng tuyển dụng có năng lực xử lý dữ liệu hồ sơ, gợi ý và theo dõi quy trình.

| Vấn đề nghiệp vụ | Hiện trạng trong môi trường tuyển dụng số | Hệ quả nếu không có nền tảng tích hợp |
| --- | --- | --- |
| CV tồn tại ở dạng phi cấu trúc | Ứng viên nộp PDF, DOCX, ảnh hoặc CV được tạo từ nhiều công cụ khác nhau | Nhà tuyển dụng khó khai thác dữ liệu; ứng viên phải nhập lại thông tin nhiều lần |
| Dữ liệu ứng viên bị phân mảnh | Hồ sơ cá nhân, CV builder, tệp đính kèm khi ứng tuyển và lịch sử tuyển dụng thường tách rời | Tăng rủi ro sai khác phiên bản và giảm khả năng tái sử dụng dữ liệu |
| Tìm kiếm ứng viên và gợi ý việc làm thiếu cá nhân hóa | Nhiều hệ thống chỉ hỗ trợ lọc theo trường dữ liệu thô hoặc tìm kiếm thủ công | Kết quả gợi ý thiếu chính xác, nhà tuyển dụng mất thời gian sàng lọc |
| Theo dõi trạng thái ứng tuyển rời rạc | Cập nhật trạng thái, thông báo và hoạt động ứng tuyển không đồng bộ | Ứng viên khó theo dõi tiến trình; nhà tuyển dụng thiếu thông tin phản hồi nhanh |
| Chuyển đổi từ tài liệu CV sang dữ liệu có thể chỉnh sửa còn thủ công | Nhiều nền tảng chỉ lưu tệp đính kèm mà không chuyển thành cấu trúc dữ liệu | Giới hạn khả năng tái biên tập, chuẩn hóa và phân tích hồ sơ |

### 1.1.2 Giới thiệu đề tài

Từ các vấn đề nêu trên, đề tài lựa chọn xây dựng **TalentFlow** như một nền tảng tuyển dụng web có hỗ trợ AI, tập trung vào ba trục chức năng chính: quản lý việc làm công khai, quản lý hồ sơ/CV ứng viên và hỗ trợ tuyển dụng cho nhà tuyển dụng. Hệ thống được triển khai theo kiến trúc web nhiều lớp, trong đó lớp ứng dụng Next.js phụ trách giao diện và API web, còn lớp dịch vụ AI FastAPI xử lý các tác vụ OCR và phân tích CV có chi phí tính toán cao.

Về mặt chức năng, TalentFlow hiện thực các phân hệ chính sau:

- Cổng việc làm công khai, cho phép hiển thị danh sách việc làm, chi tiết việc làm và thông tin công ty.
- Không gian ứng viên, bao gồm hồ sơ cá nhân, dashboard, CV Builder và quản lý danh sách CV.
- Cơ chế nhập CV từ tệp PDF, DOCX và ảnh, kết hợp OCR, phân tích bố cục, chuẩn hóa nội dung và review kết quả trước khi đưa vào editor.
- Hệ thống ATS cơ bản cho phép ứng viên nộp đơn, đính kèm hoặc chọn CV có sẵn, lưu trạng thái tuyển dụng và lịch sử sự kiện ứng tuyển.
- Chức năng dành cho nhà tuyển dụng/HR, bao gồm quản lý tin tuyển dụng, tìm kiếm ứng viên công khai và xem chi tiết đơn ứng tuyển.
- Cơ chế thông báo và bảng điều khiển cập nhật theo dữ liệu nghiệp vụ.
- Chức năng gợi ý việc làm dựa trên hồ sơ ứng viên, kết hợp pipeline luật, chấm điểm có trọng số và xếp hạng bằng mô hình ngôn ngữ cục bộ.

Nói cách khác, TalentFlow không chỉ là một website đăng tin tuyển dụng, mà là một nền tảng xử lý vòng đời dữ liệu hồ sơ ứng viên từ khâu tiếp nhận, chuẩn hóa, biên tập, ứng tuyển cho đến hỗ trợ đối sánh cơ hội nghề nghiệp.

### 1.1.3 Ý nghĩa thực tiễn của đề tài

Ý nghĩa thực tiễn của TalentFlow nằm ở khả năng kết nối hai nhu cầu vốn thường bị tách rời trong các hệ thống tuyển dụng: nhu cầu “trình bày hồ sơ” của ứng viên và nhu cầu “khai thác dữ liệu hồ sơ” của nhà tuyển dụng. Nếu chỉ có CV Builder, dữ liệu ứng viên được cấu trúc hóa nhưng khó tiếp nhận hồ sơ bên ngoài. Nếu chỉ có chức năng upload CV, hệ thống lưu được tệp nhưng không biến chúng thành dữ liệu có thể chỉnh sửa và tìm kiếm. TalentFlow kết hợp cả hai hướng tiếp cận, nhờ đó giảm ma sát nhập liệu cho ứng viên đồng thời tăng năng lực xử lý hồ sơ cho phía tuyển dụng.

## 1.2 Ưu điểm và hạn chế của các giải pháp hiện nay

### 1.2.1 Các hướng tiếp cận phổ biến

Trong thực tế, có thể quan sát ba hướng tiếp cận phổ biến đối với bài toán tuyển dụng số:

| Hướng tiếp cận | Ưu điểm chính | Hạn chế khi áp dụng độc lập |
| --- | --- | --- |
| Sàn việc làm công khai | Tiếp cận nhanh nguồn tin tuyển dụng, tối ưu khâu phân phối công việc | Dữ liệu hồ sơ thường chỉ phục vụ nộp đơn, ít khả năng chỉnh sửa sâu và tái sử dụng |
| Công cụ tạo CV độc lập | Hỗ trợ trình bày hồ sơ đẹp, cấu trúc rõ và dễ xuất bản | Thường không gắn trực tiếp với luồng ứng tuyển, tìm việc và trạng thái ATS |
| Hệ thống ATS hoặc quy trình nội bộ | Quản lý trạng thái ứng tuyển và theo dõi pipeline tuyển dụng | Nhiều trường hợp phụ thuộc nhập liệu thủ công, khó tiếp nhận CV phi cấu trúc từ bên ngoài |

### 1.2.2 Hạn chế và khoảng trống của các giải pháp rời rạc

Các hướng tiếp cận trên đều có giá trị riêng, nhưng khi vận hành tách rời, chúng làm nảy sinh nhiều điểm đứt gãy:

- Ứng viên phải lặp lại thao tác nhập thông tin giữa hồ sơ cá nhân, CV và đơn ứng tuyển.
- Nhà tuyển dụng nhận được CV dưới dạng tài liệu nhưng khó chuyển hóa ngay thành dữ liệu tìm kiếm được.
- Kết quả gợi ý công việc hoặc tìm kiếm ứng viên thiếu ngữ cảnh nếu hồ sơ không được chuẩn hóa.
- Trạng thái ứng tuyển, lịch sử tương tác và thông báo khó đồng bộ khi dữ liệu nằm trên nhiều công cụ khác nhau.

Khoảng trống này chính là cơ sở để TalentFlow được đề xuất như một hệ thống tích hợp, trong đó dữ liệu hồ sơ được xem là trung tâm. Hệ thống không tách rời “CV để trình bày” với “CV để ứng tuyển”, mà tìm cách gom hai lớp này về một không gian dữ liệu có cấu trúc, có lịch sử chỉnh sửa và có khả năng phục vụ cả ứng viên lẫn nhà tuyển dụng.

## 1.3 Mục tiêu của đề tài

### 1.3.1 Mục tiêu tổng quát

Mục tiêu tổng quát của đề tài là xây dựng một nền tảng tuyển dụng web mang tên **TalentFlow**, cho phép kết nối cổng việc làm công khai, hồ sơ ứng viên, CV Builder, nhập CV bằng OCR, ATS cơ bản và cơ chế gợi ý việc làm trong một kiến trúc thống nhất. Nền tảng phải giúp giảm chi phí nhập liệu lặp lại, chuẩn hóa dữ liệu hồ sơ, tăng khả năng khai thác dữ liệu tuyển dụng và nâng cao trải nghiệm tương tác giữa ứng viên với nhà tuyển dụng.

### 1.3.2 Mục tiêu cụ thể

Từ mục tiêu tổng quát, hệ thống hướng tới các mục tiêu cụ thể sau:

- Xây dựng cổng việc làm công khai cho phép duyệt, lọc và xem chi tiết các tin tuyển dụng.
- Cung cấp không gian hồ sơ ứng viên với dữ liệu có cấu trúc, hỗ trợ cập nhật thông tin cá nhân, kinh nghiệm, học vấn, kỹ năng và CV.
- Phát triển CV Builder để tạo và chỉnh sửa CV trực tiếp trên nền web.
- Xây dựng pipeline nhập CV từ tệp bên ngoài, hỗ trợ PDF, DOCX và ảnh; cho phép OCR, chuẩn hóa, ánh xạ dữ liệu và review trước khi lưu.
- Tổ chức quy trình ứng tuyển cho phép ứng viên nộp đơn bằng CV có sẵn, CV builder hoặc tệp tải lên; đồng thời lưu và theo dõi trạng thái tuyển dụng.
- Hỗ trợ nhà tuyển dụng tìm kiếm ứng viên công khai, quản lý danh sách ứng viên và xem chi tiết đơn ứng tuyển.
- Triển khai cơ chế gợi ý việc làm theo hồ sơ ứng viên và cơ chế thông báo cho các thay đổi nghiệp vụ quan trọng.

| Mục tiêu cụ thể | Phân hệ hiện thực trong hệ thống | Kết quả mong đợi |
| --- | --- | --- |
| Chuẩn hóa dữ liệu hồ sơ | `candidate_profiles`, `resumes`, CV Builder | Hồ sơ có cấu trúc, dễ cập nhật và tái sử dụng |
| Chuyển CV phi cấu trúc thành dữ liệu chỉnh sửa được | `cv_documents`, OCR pipeline, `editable_cvs` | Giảm nhập liệu thủ công, tăng khả năng tái biên tập |
| Quản lý ứng tuyển theo trạng thái | `applications`, `application_events`, dashboard ứng viên/HR | Theo dõi pipeline rõ ràng, giảm thất lạc thông tin |
| Tăng năng lực tìm kiếm và đối sánh | tìm kiếm ứng viên công khai, gợi ý việc làm | Cải thiện chất lượng kết nối giữa ứng viên và vị trí tuyển dụng |
| Cập nhật thông tin đúng thời điểm | `notifications`, Supabase Realtime | Người dùng nhận phản hồi nhanh theo ngữ cảnh nghiệp vụ |

## 1.4 Phạm vi đề tài

### 1.4.1 Phạm vi chức năng

Trong phạm vi hiện thực của mã nguồn hiện tại, TalentFlow bao gồm các nhóm chức năng chính sau:

- Quản lý người dùng theo vai trò ứng viên và nhà tuyển dụng/HR.
- Quản lý hồ sơ ứng viên và CV.
- Hiển thị việc làm công khai và thông tin công ty.
- Nộp đơn ứng tuyển và theo dõi trạng thái ứng tuyển.
- Tìm kiếm ứng viên công khai cho HR.
- Thông báo nội hệ thống.
- Gợi ý việc làm dựa trên dữ liệu hồ sơ.
- Nhập CV bằng OCR và review dữ liệu đã phân tích.

Hệ thống chưa được định vị là một giải pháp quản trị nguồn nhân lực toàn diện. Các nghiệp vụ như chấm công, tính lương, onboarding nhân sự hay quản trị nội bộ sau tuyển dụng không phải là trọng tâm của phạm vi đề tài này.

### 1.4.2 Phạm vi công nghệ

Về công nghệ, đề tài được giới hạn trong các thành phần đang được hiện thực hóa trực tiếp trong hệ thống:

- Frontend web sử dụng Next.js 16, React 19 và TypeScript.
- Lớp API web sử dụng Route Handlers và server-side utilities trong cùng codebase Next.js.
- Lớp xử lý AI/OCR sử dụng FastAPI, Celery và Redis.
- Lưu trữ dữ liệu nghiệp vụ sử dụng Supabase PostgreSQL, Supabase Auth, Storage, Realtime và RLS.
- OCR tài liệu sử dụng Google Vision OCR.
- Các mô hình cục bộ qua Ollama phục vụ chuẩn hóa, ánh xạ JSON, gợi ý cải thiện CV và xếp hạng/gợi ý việc làm.

MongoDB và Mailpit có xuất hiện trong kiến trúc chạy cục bộ của dự án, nhưng vai trò của chúng chỉ phục vụ email testing và môi trường kiểm thử. Đây không phải các thành phần lõi của bài toán tuyển dụng trong phạm vi học thuật của luận văn.

### 1.4.3 Đối tượng sử dụng

Đối tượng sử dụng trực tiếp của TalentFlow gồm:

- **Ứng viên**: tạo hồ sơ, quản lý CV, tải CV, nhập CV bằng OCR, nhận gợi ý việc làm và nộp đơn ứng tuyển.
- **Nhà tuyển dụng/HR**: quản lý tin tuyển dụng, tìm kiếm ứng viên công khai, xem chi tiết đơn ứng tuyển và tương tác với ứng viên.

Bên cạnh đó, hệ thống còn có các thành phần phục vụ vận hành kỹ thuật như email testing và môi trường xử lý AI, nhưng đây là đối tượng vận hành nội bộ chứ không phải người dùng nghiệp vụ chính.

### 1.4.4 Kết luận chương

Chương 1 đã xác lập bài toán trung tâm của đề tài: dữ liệu hồ sơ ứng viên trong môi trường tuyển dụng số vừa phân mảnh, vừa phi cấu trúc, khiến quá trình tìm việc và tuyển dụng thiếu tính liên thông. Từ đó, TalentFlow được định nghĩa như một nền tảng tích hợp, trong đó dữ liệu hồ sơ được chuẩn hóa và tái sử dụng xuyên suốt từ khâu xây dựng CV, nhập CV, ứng tuyển, theo dõi trạng thái đến gợi ý việc làm. Trên cơ sở đó, Chương 2 sẽ đi sâu vào mô hình kiến trúc, thực thể dữ liệu và quy trình xử lý kỹ thuật của hệ thống.
