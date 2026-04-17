# CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI

## 1.1. Bối cảnh và tính cấp thiết của đề tài

### 1.1.1. Xu hướng số hóa hoạt động tuyển dụng và tìm việc trên nền tảng web

Trong bối cảnh chuyển đổi số, hoạt động tuyển dụng và tìm việc ngày càng dịch chuyển lên môi trường web với yêu cầu cao hơn về tốc độ tiếp cận thông tin, khả năng cập nhật theo thời gian thực và tính liên thông giữa các bước nghiệp vụ. Thay vì chỉ đăng tải thông tin tuyển dụng theo cách tĩnh, các nền tảng hiện đại thường phải hỗ trợ đồng thời nhiều lớp chức năng như hiển thị việc làm công khai, quản lý hồ sơ người dùng, tiếp nhận đơn ứng tuyển, theo dõi trạng thái xử lý và trao đổi thông tin giữa các bên liên quan. Phân tích cấu trúc mã nguồn của TalentFlow cho thấy hệ thống được xây dựng đúng theo xu hướng này khi tổ chức rõ khối công khai về việc làm và công ty, khối xác thực người dùng, khối workspace của ứng viên và khối workspace của nhà tuyển dụng trong cùng một ứng dụng web full-stack.

Mã nguồn hiện tại cũng cho thấy bài toán tuyển dụng không còn dừng ở việc “đăng tin và nhận CV”, mà đã mở rộng thành bài toán quản lý dữ liệu tuyển dụng trên toàn chuỗi giá trị. Các route công khai như danh sách việc làm, chi tiết việc làm, danh mục công ty và trang công ty cho thấy nhu cầu xây dựng một cổng tuyển dụng mở cho khách truy cập. Song song với đó, các route nghiệp vụ cho ứng viên và nhà tuyển dụng phản ánh nhu cầu tạo ra những không gian làm việc chuyên biệt theo vai trò. Điều này phù hợp với thực tế rằng một nền tảng tuyển dụng hiện đại cần phục vụ đồng thời ít nhất ba nhóm đối tượng: khách truy cập công khai, ứng viên và nhà tuyển dụng.

Sự phát triển của kiến trúc web full-stack cũng góp phần làm thay đổi cách xây dựng các hệ thống tuyển dụng. Thay vì tách rời hoàn toàn frontend và backend ngay từ đầu, nhiều hệ thống hiện nay tổ chức giao diện, API web và logic điều phối nghiệp vụ trong cùng một codebase để rút ngắn vòng phát triển và tăng tính nhất quán. TalentFlow là một ví dụ theo hướng này khi sử dụng Next.js App Router, Route Handlers và các thư viện server-side để xử lý cả hiển thị giao diện lẫn các nghiệp vụ như việc làm, ứng tuyển, hồ sơ ứng viên, CV Builder, import CV và gợi ý việc làm.

Từ góc nhìn nghiệp vụ, xu hướng số hóa tuyển dụng trên nền tảng web không chỉ là xu hướng công nghệ, mà còn là yêu cầu để giảm ma sát trong quá trình kết nối cung - cầu lao động. Ứng viên cần tiếp cận thông tin việc làm nhanh hơn, lưu giữ và tái sử dụng hồ sơ thuận tiện hơn; nhà tuyển dụng cần quản lý đầu việc, ứng viên và trạng thái tuyển dụng tập trung hơn. Chính bối cảnh đó đặt ra tính cấp thiết cho việc nghiên cứu và xây dựng một hệ thống như TalentFlow.

### 1.1.2. Nhu cầu chuẩn hóa hồ sơ ứng viên và tối ưu trải nghiệm ứng tuyển

Một trong những khó khăn lớn của tuyển dụng số là dữ liệu hồ sơ ứng viên thường tồn tại dưới nhiều dạng khác nhau. Ứng viên có thể tạo hồ sơ trực tiếp trên hệ thống, xây dựng CV theo mẫu, tải lên một CV đã có sẵn từ trước, hoặc nộp tài liệu ở các định dạng như PDF, DOCX và ảnh. Nếu hệ thống chỉ tiếp nhận các tệp đính kèm ở dạng tài liệu tĩnh, dữ liệu hồ sơ sẽ khó tìm kiếm, khó chỉnh sửa và khó tái sử dụng ở các bước tiếp theo. Phân tích mã nguồn cho thấy TalentFlow được xây dựng với nhận thức rõ về bài toán này thông qua các bảng và module như `candidate_profiles`, `templates`, `resumes`, `cv_documents`, `editable_cvs` và các route thuộc nhóm `cv-builder`, `cv-imports`, `editable-cvs`.

Nhu cầu chuẩn hóa hồ sơ không chỉ đến từ phía nhà tuyển dụng, mà còn đến từ chính trải nghiệm của ứng viên. Nếu mỗi lần ứng tuyển người dùng phải nhập lại thông tin, tải lại tệp và chỉnh sửa thủ công cho từng ngữ cảnh, quá trình tìm việc sẽ trở nên rời rạc và kém hiệu quả. Trong mã nguồn hiện tại, hệ thống đã cung cấp nhiều cách tái sử dụng dữ liệu hồ sơ: ứng viên có thể duy trì `candidate_profiles`, tạo CV từ template, lưu các bản resume trong builder, dùng CV có sẵn khi nộp đơn, hoặc chuyển tài liệu import sang dạng editable CV để tiếp tục biên tập. Điều đó cho thấy định hướng rõ ràng của hệ thống là giảm nhập liệu lặp lại và đưa dữ liệu ứng viên về dạng có cấu trúc hơn.

Việc chuẩn hóa hồ sơ còn có ý nghĩa quan trọng đối với các tác vụ về sau như tìm kiếm ứng viên, gợi ý việc làm và đánh giá mức độ phù hợp giữa hồ sơ với vị trí tuyển dụng. Chỉ khi thông tin về kỹ năng, học vấn, kinh nghiệm, giới thiệu bản thân và các thành phần CV được tổ chức có hệ thống, nền tảng mới có thể khai thác dữ liệu đó ở mức sâu hơn. TalentFlow phản ánh nhu cầu này qua việc duy trì song song hồ sơ ứng viên có cấu trúc, kho resume, dữ liệu CV import đã parse và cơ chế đồng bộ từ kết quả OCR sang editable CV.

Vì vậy, chuẩn hóa hồ sơ ứng viên không chỉ là yêu cầu về dữ liệu, mà còn là điều kiện để tối ưu trải nghiệm ứng tuyển. Đây là một động lực quan trọng dẫn đến việc hình thành đề tài.

### 1.1.3. Nhu cầu hỗ trợ nhà tuyển dụng trong quản lý pipeline tuyển dụng

Ở góc độ nhà tuyển dụng, khó khăn không chỉ nằm ở việc tiếp nhận nhiều hồ sơ, mà còn ở việc theo dõi vòng đời của từng đơn ứng tuyển một cách nhất quán. Khi số lượng ứng viên tăng, nếu hệ thống chỉ lưu danh sách hồ sơ mà không có cơ chế quản lý trạng thái, lịch sử thay đổi và bối cảnh tương tác, quy trình tuyển dụng sẽ nhanh chóng rơi vào tình trạng phân tán. Phân tích các migration và module nghiệp vụ của TalentFlow cho thấy hệ thống đã được mở rộng theo hướng ATS với các bảng `applications`, `application_events`, `jobs`, `employers`, `candidates`, `activity_logs` và các API phía recruiter.

Các trạng thái ứng tuyển trong cơ sở dữ liệu như `applied`, `reviewing`, `interview`, `offer`, `hired`, `rejected` cho thấy hệ thống hướng tới việc theo dõi tiến trình xử lý ứng viên theo từng giai đoạn. Bên cạnh đó, bảng `application_events` cho phép lưu dấu vết các sự kiện phát sinh trong quá trình xử lý đơn, thay vì chỉ cập nhật một trạng thái hiện thời. Điều này có ý nghĩa quan trọng trong quản lý pipeline tuyển dụng, vì nó hỗ trợ cả việc xem lịch sử xử lý lẫn việc tạo trải nghiệm minh bạch hơn cho ứng viên và nhà tuyển dụng.

Nhu cầu hỗ trợ nhà tuyển dụng còn thể hiện ở khả năng quản lý việc làm và khai thác nguồn ứng viên. Mã nguồn hiện tại có bằng chứng về recruiter dashboard, danh sách ứng viên theo job, cơ chế cập nhật trạng thái hồ sơ, tìm kiếm ứng viên công khai theo kỹ năng và kinh nghiệm, cũng như thông báo và email hỗ trợ một số luồng tuyển dụng. Như vậy, nhà tuyển dụng không chỉ cần một nơi để đăng tin, mà cần một workspace cho phép theo dõi, sàng lọc và xử lý hồ sơ một cách có tổ chức.

Chính nhu cầu quản lý pipeline theo mô hình ATS là một lý do quan trọng làm cho đề tài có tính cấp thiết, đặc biệt khi được đặt trong mối liên hệ với bài toán hồ sơ ứng viên và CV số hóa.

### 1.1.4. Nhu cầu ứng dụng AI trong xử lý và tái sử dụng dữ liệu CV

CV là một loại dữ liệu đặc thù: cùng chứa các nhóm thông tin tương đối giống nhau, nhưng cách trình bày lại rất đa dạng về bố cục, font chữ, ngôn ngữ và định dạng tệp. Vì vậy, chỉ lưu trữ CV như một tệp đính kèm là chưa đủ nếu mục tiêu là khai thác dữ liệu hồ sơ ở mức sâu hơn. Trong phạm vi mã nguồn hiện tại, TalentFlow đã triển khai một khối xử lý CV riêng với FastAPI, Celery, Redis, Google Vision OCR và Ollama, cho thấy nhu cầu ứng dụng AI trong xử lý dữ liệu CV là có thật và là một phần trọng tâm của hệ thống.

Các bảng như `cv_documents`, `cv_document_artifacts`, `cv_document_stage_runs`, `cv_document_pages`, `cv_ocr_blocks`, `cv_layout_blocks`, `editable_cvs`, `editable_cv_blocks`, `editable_cv_versions`, `editable_cv_exports` phản ánh việc hệ thống không chỉ lưu kết quả cuối cùng, mà còn lưu cả vòng đời xử lý của một tài liệu CV. Dịch vụ AI tiếp nhận yêu cầu phân tích CV, đẩy tác vụ vào hàng đợi `cv-documents`, thực hiện OCR, phân tích bố cục, chuẩn hóa nội dung và persist các artifact trung gian. Đặc biệt, Google Vision OCR được dùng để trích xuất văn bản kèm bounding boxes và tọa độ block, tạo cơ sở cho việc review và ánh xạ vào editor về sau.

Nhu cầu ứng dụng AI ở đây không nên hiểu theo nghĩa thay thế hoàn toàn người dùng, mà là hỗ trợ tự động hóa các công đoạn tốn nhiều thời gian. Mã nguồn cho thấy hệ thống vẫn dành chỗ cho bước review kết quả, lưu editable CV và hỗ trợ reparse khi tài liệu nguồn thay đổi. Cách tổ chức này phù hợp hơn với bài toán CV thực tế, nơi dữ liệu tự động trích xuất cần được kiểm tra và tinh chỉnh trước khi trở thành dữ liệu làm việc chính thức.

Ngoài pipeline lõi cho import CV, repo còn có bằng chứng về các luồng AI phụ trợ như tối ưu nội dung CV bằng Gemini hoặc Groq, và gợi ý hoặc xếp hạng việc làm bằng Ollama trong một số tình huống. Điều đó cho thấy AI trong TalentFlow không chỉ phục vụ OCR, mà còn phục vụ chuẩn hóa nội dung và tái sử dụng dữ liệu hồ sơ ở các bước tiếp theo của quy trình tuyển dụng.

## 1.2. Phát biểu bài toán

### 1.2.1. Bài toán kết nối ứng viên với việc làm và doanh nghiệp

Bài toán đầu tiên mà đề tài đặt ra là xây dựng một nền tảng có khả năng kết nối ứng viên với thông tin việc làm và doanh nghiệp theo cách nhất quán, thay vì để các thành phần này tồn tại rời rạc. Trong thực tế, người tìm việc cần một nơi để duyệt danh sách việc làm, xem chi tiết tin tuyển dụng, tìm hiểu doanh nghiệp và thực hiện ứng tuyển. Đồng thời, doanh nghiệp cần một nơi để công khai thông tin tuyển dụng và tiếp cận ứng viên phù hợp. Phân tích mã nguồn cho thấy TalentFlow giải quyết bài toán này thông qua các route công khai cho jobs và companies, các API hỗ trợ lọc tìm kiếm, cùng với cơ chế ứng tuyển gắn trực tiếp với từng tin tuyển dụng.

Tuy nhiên, bài toán kết nối ở đây không chỉ mang nghĩa “đưa tin tuyển dụng đến ứng viên”. Hệ thống còn phải làm sao để dữ liệu giữa hai phía có thể gặp nhau ở đúng ngữ cảnh. Ví dụ, một tin tuyển dụng cần liên kết được với danh sách đơn ứng tuyển; hồ sơ ứng viên cần có khả năng được sử dụng khi nộp đơn; nhà tuyển dụng cần có thể xem ứng viên theo từng công việc hoặc tìm kiếm ứng viên công khai bên ngoài pipeline trực tiếp. Do đó, kết nối ứng viên với việc làm và doanh nghiệp trong TalentFlow là một bài toán dữ liệu và nghiệp vụ tổng hợp, chứ không chỉ là bài toán hiển thị giao diện.

### 1.2.2. Bài toán quản lý hồ sơ ứng viên và CV trên cùng một hệ thống

Trong nhiều hệ thống tuyển dụng, hồ sơ cá nhân của ứng viên, CV dùng để ứng tuyển và dữ liệu resume phục vụ chỉnh sửa thường tồn tại ở những vùng tách rời. Điều này gây ra sự trùng lặp và khó duy trì tính nhất quán. TalentFlow đặt ra bài toán quản lý các lớp dữ liệu này trên cùng một hệ thống: hồ sơ cá nhân có cấu trúc, CV được tạo từ builder, CV tải lên từ bên ngoài, dữ liệu import sau OCR và editable CV sau khi review.

Phân tích mã nguồn cho thấy repo hiện tại đã có những thành phần phản ánh trực tiếp bài toán này. `candidate_profiles` được dùng để lưu hồ sơ ứng viên có thể công khai hoặc riêng tư; `templates` và `resumes` hỗ trợ tạo và lưu CV theo mẫu; `cv_documents` lưu các lần import tài liệu nguồn; `editable_cvs` và các bảng liên quan hỗ trợ chỉnh sửa sau khi import. Ngoài ra, route nộp đơn cho phép ứng viên dùng một trong nhiều nguồn CV khác nhau: tải tệp mới, chọn CV có sẵn hoặc chọn resume từ builder. Điều đó cho thấy hệ thống đang giải quyết vấn đề hợp nhất các biểu diễn khác nhau của hồ sơ ứng viên trong một không gian vận hành chung.

### 1.2.3. Bài toán theo dõi vòng đời đơn ứng tuyển theo mô hình ATS

Sau khi ứng viên nộp đơn, bài toán không còn là lưu lại một bản ghi tĩnh, mà là theo dõi vòng đời của đơn ứng tuyển qua nhiều trạng thái xử lý. Mỗi lần thay đổi trạng thái có thể kéo theo nhu cầu cập nhật dashboard, ghi lịch sử sự kiện, gửi thông báo hoặc email, và hiển thị lại dữ liệu cho các bên liên quan. TalentFlow đặt ra bài toán này theo hướng ATS, thể hiện qua hệ thống bảng `applications`, `application_events`, các API recruiter, dashboard tuyển dụng và cơ chế thông báo.

Việc tồn tại đồng thời bảng trạng thái hiện hành và bảng sự kiện là một điểm đáng chú ý về mặt bài toán. Nó cho thấy hệ thống không chỉ cần biết “đơn đang ở đâu”, mà còn cần biết “đơn đã đi qua những bước nào”. Điều này rất quan trọng cho cả hai phía: nhà tuyển dụng cần theo dõi pipeline và lịch sử xử lý; ứng viên cần biết hồ sơ của mình đã được xem xét đến đâu. Do đó, bài toán theo dõi vòng đời đơn ứng tuyển trong đề tài không chỉ là một bài toán giao diện kéo thả, mà là bài toán tổ chức dữ liệu và luồng cập nhật theo mô hình ATS.

### 1.2.4. Bài toán nhập CV từ tài liệu gốc và chuyển đổi sang dữ liệu có thể chỉnh sửa

Bài toán đặc thù nhất của đề tài nằm ở khâu tiếp nhận CV từ tài liệu gốc. Trong thực tế, nhiều ứng viên đã có sẵn CV ở dạng PDF, DOCX hoặc ảnh. Nếu hệ thống chỉ lưu những tài liệu này dưới dạng file, người dùng vẫn phải chỉnh sửa bên ngoài và dữ liệu khó được tái sử dụng. Vì vậy, đề tài đặt ra yêu cầu chuyển tài liệu gốc thành dữ liệu có cấu trúc, có thể review, chỉnh sửa và xuất lại.

Mã nguồn hiện tại cho thấy bài toán này được chia thành nhiều bước: lưu tệp gốc, tạo bản ghi `cv_documents`, enqueue tác vụ xử lý sang AI service, thực hiện OCR và phân tích bố cục, lưu các khối OCR và layout, sinh parsed JSON, cho phép review kết quả, sau đó tạo `editable_cvs` để người dùng tiếp tục chỉnh sửa. Ngoài ra, hệ thống còn có cơ chế `document_file_versions`, cờ `file_updated_after_parse` và `reparse_recommended`, cho thấy bài toán không dừng lại ở một lần import duy nhất mà còn tính đến khả năng chỉnh sửa tài liệu nguồn và phân tích lại khi cần.

Như vậy, đây là bài toán chuyển đổi dữ liệu từ tài liệu phi cấu trúc sang mô hình dữ liệu có thể chỉnh sửa, đồng thời bảo toàn mối liên hệ giữa tệp nguồn, kết quả OCR, kết quả parse và bản CV làm việc về sau. Đây cũng là điểm tạo nên sự khác biệt rõ nhất của TalentFlow so với các hệ thống tuyển dụng chỉ tiếp nhận CV như tệp đính kèm.

## 1.3. Giới thiệu đề tài và định hướng xây dựng hệ thống

### 1.3.1. Giới thiệu hệ thống TalentFlow

TalentFlow là một hệ thống tuyển dụng trực tuyến được xây dựng theo hướng tích hợp nhiều lớp nghiệp vụ trong cùng một nền tảng web. Phân tích mã nguồn cho thấy hệ thống bao gồm cổng việc làm công khai, danh mục và trang công ty, cơ chế xác thực và phân vai, candidate workspace, recruiter workspace, hồ sơ ứng viên, CV Builder, import CV hỗ trợ AI, ATS pipeline, tìm kiếm ứng viên công khai, thông báo và gợi ý việc làm. Về mặt kỹ thuật, hệ thống kết hợp ứng dụng web full-stack trên Next.js với một microservice AI riêng cho xử lý CV.

Điểm nổi bật của TalentFlow là cách đặt dữ liệu hồ sơ ứng viên vào vị trí trung tâm. Thay vì tách riêng việc làm, ứng tuyển và CV thành những module độc lập, hệ thống tổ chức chúng xoay quanh khả năng tạo, lưu, nhập, chỉnh sửa và tái sử dụng hồ sơ. Điều này giúp liên kết các luồng như xây dựng CV, ứng tuyển, tìm kiếm ứng viên và recommendation trên cùng một nền tảng dữ liệu.

### 1.3.2. Phạm vi bài toán mà hệ thống tập trung giải quyết

Trong phạm vi hiện thực của repo, TalentFlow tập trung vào các nhóm bài toán chính sau: công khai việc làm và công ty; quản lý hồ sơ ứng viên và nhiều dạng CV; tổ chức quy trình ứng tuyển theo mô hình ATS; hỗ trợ nhà tuyển dụng tìm kiếm và theo dõi ứng viên; áp dụng AI vào nhập CV, chuẩn hóa dữ liệu và hỗ trợ một số tác vụ gợi ý. Đây là các bài toán nằm ở giao điểm giữa nền tảng tuyển dụng trực tuyến và hệ thống quản lý dữ liệu hồ sơ ứng viên.

Ngược lại, hệ thống hiện không được định vị là một nền tảng quản trị nhân sự tổng quát sau tuyển dụng. Phân tích source code hiện tại không cho thấy bằng chứng để xem các nghiệp vụ như payroll, timesheet, HRIS hoàn chỉnh, e-learning hay admin panel tổng quát là trọng tâm của hệ thống. Vì vậy, định hướng của đề tài là giải quyết sâu bài toán tuyển dụng và CV, thay vì mở rộng sang các nghiệp vụ nhân sự không thuộc lõi bài toán.

### 1.3.3. Giá trị thực tiễn đối với ứng viên và nhà tuyển dụng

Đối với ứng viên, giá trị thực tiễn của hệ thống nằm ở việc giảm ma sát trong quá trình chuẩn bị và sử dụng hồ sơ. Người dùng có thể duy trì hồ sơ cá nhân, tạo CV từ template, nhập CV từ tài liệu sẵn có, chỉnh sửa kết quả import và tái sử dụng các phiên bản CV trong khi ứng tuyển. Nhờ đó, quá trình chuẩn bị hồ sơ trở nên liên tục hơn thay vì bị chia cắt giữa nhiều công cụ riêng lẻ.

Đối với nhà tuyển dụng, giá trị thực tiễn thể hiện ở khả năng quản lý pipeline tuyển dụng có cấu trúc hơn. Hệ thống hỗ trợ đăng tin, theo dõi ứng viên theo từng job, cập nhật trạng thái đơn, lưu lịch sử sự kiện, tìm kiếm ứng viên công khai và nhận thông báo hoặc email hỗ trợ một số luồng nghiệp vụ. Khi hồ sơ ứng viên được chuẩn hóa tốt hơn, nhà tuyển dụng cũng có thêm điều kiện để đánh giá nhanh và tái khai thác dữ liệu tuyển dụng.

Từ góc nhìn tổng thể, giá trị thực tiễn của TalentFlow nằm ở việc tích hợp quá trình tạo lập, tiếp nhận, chuẩn hóa và khai thác hồ sơ ứng viên vào cùng một nền tảng tuyển dụng web, thay vì để các bước này tồn tại rời rạc.

## 1.4. Mục tiêu nghiên cứu

### 1.4.1. Mục tiêu tổng quát

Mục tiêu tổng quát của đề tài là nghiên cứu và xây dựng hệ thống TalentFlow như một nền tảng tuyển dụng trực tuyến tích hợp quản lý việc làm, quản lý hồ sơ ứng viên, quản lý đơn ứng tuyển theo mô hình ATS và khối xử lý CV hỗ trợ AI. Hệ thống cần tạo được sự liên thông giữa cổng tuyển dụng công khai, workspace của ứng viên, workspace của nhà tuyển dụng và microservice xử lý tài liệu CV, qua đó giảm thao tác thủ công, chuẩn hóa dữ liệu hồ sơ và nâng cao khả năng tái sử dụng dữ liệu trong quy trình tuyển dụng.

### 1.4.2. Mục tiêu cụ thể

Từ mục tiêu tổng quát nêu trên, các mục tiêu cụ thể của đề tài được xác định như sau.

#### 1.4.2.1. Xây dựng cổng tuyển dụng công khai

Mục tiêu đầu tiên là xây dựng một cổng tuyển dụng công khai cho phép khách truy cập xem danh sách việc làm, tìm kiếm và lọc việc làm theo nhiều tiêu chí, xem chi tiết tin tuyển dụng và tra cứu thông tin công ty. Phân tích source code hiện tại cho thấy hệ thống đã có các API và trang công khai cho jobs và companies, vì vậy đây là một mục tiêu đã được phản ánh rõ trong kiến trúc hệ thống. Cổng công khai đóng vai trò lớp tiếp cận đầu tiên giữa thị trường tuyển dụng và người dùng cuối.

#### 1.4.2.2. Xây dựng workspace dành cho ứng viên

Mục tiêu thứ hai là xây dựng một workspace chuyên biệt cho ứng viên, trong đó người dùng có thể quản lý hồ sơ cá nhân, CV, đơn ứng tuyển, thông báo và các dữ liệu liên quan đến quá trình tìm việc. Từ cấu trúc route và các module nghiệp vụ hiện tại có thể thấy hệ thống hướng đến một không gian thao tác tập trung cho ứng viên, nơi hồ sơ, CV Builder, CV import, việc làm gợi ý và danh sách ứng tuyển được liên kết với nhau thay vì tồn tại rời rạc.

#### 1.4.2.3. Xây dựng workspace dành cho nhà tuyển dụng

Mục tiêu thứ ba là xây dựng một workspace dành cho nhà tuyển dụng hoặc HR, cho phép quản lý tin tuyển dụng, theo dõi dashboard tuyển dụng, xử lý ứng viên theo pipeline ATS và tìm kiếm ứng viên công khai. Mã nguồn hiện tại cho thấy có bằng chứng rõ về recruiter dashboard, danh sách ứng viên theo job, ATS pipeline và public candidate search. Điều này phản ánh mục tiêu tạo ra một không gian làm việc số hóa cho phía tuyển dụng, thay vì chỉ cung cấp chức năng đăng tin cơ bản.

#### 1.4.2.4. Tích hợp công cụ CV Builder và CV Import hỗ trợ AI

Mục tiêu thứ tư là tích hợp đồng thời hai hướng tiếp cận đối với CV: tạo CV trực tiếp trên nền tảng và nhập CV từ tài liệu có sẵn bằng AI/OCR. Trong repo hiện tại, mục tiêu này được phản ánh qua các bảng `templates`, `resumes`, các route `cv-builder`, hệ thống `cv_documents`, AI service xử lý OCR và parsed JSON, cơ chế review, tạo editable CV, export PDF và xử lý tài liệu nguồn PDF/Word/Image với versioning. Đây là một mục tiêu quan trọng vì nó giúp kết nối giữa dữ liệu CV được tạo mới và dữ liệu CV được tái sử dụng từ bên ngoài.

#### 1.4.2.5. Xây dựng cơ chế gợi ý việc làm và ghép nối hồ sơ

Mục tiêu thứ năm là xây dựng cơ chế hỗ trợ ghép nối giữa hồ sơ ứng viên và việc làm. Mã nguồn hiện tại cho thấy hệ thống đã có API `recommend-jobs`, bảng `job_recommendations`, các hàm chấm điểm theo luật nghiệp vụ và bước xếp hạng bằng Ollama trong một số trường hợp. Đồng thời, phía nhà tuyển dụng có route tìm kiếm ứng viên công khai dựa trên tên, kỹ năng, headline, kinh nghiệm và từ khóa. Vì vậy, mục tiêu ghép nối ở đây được hiểu theo hai chiều: gợi ý việc làm cho ứng viên và hỗ trợ tìm ứng viên cho nhà tuyển dụng trên cơ sở dữ liệu hồ sơ thực tế.

## 1.5. Đối tượng và phạm vi nghiên cứu

### 1.5.1. Đối tượng sử dụng hệ thống

#### 1.5.1.1. Khách truy cập công khai

Khách truy cập công khai là nhóm người dùng chưa cần đăng nhập nhưng có nhu cầu tra cứu thông tin trên hệ thống. Trong phạm vi hiện tại, nhóm này có thể truy cập các trang công khai như danh sách việc làm, chi tiết việc làm, danh mục công ty và hồ sơ công ty. Đây là lớp người dùng quan trọng vì họ là nguồn đầu vào tự nhiên cho các luồng đăng ký tài khoản, tìm việc và tương tác với doanh nghiệp.

#### 1.5.1.2. Ứng viên

Ứng viên là đối tượng trung tâm của hệ thống ở phía cầu lao động. Phân tích mã nguồn cho thấy người dùng ở vai trò này có thể quản lý hồ sơ cá nhân, thiết lập mức độ công khai của profile, tạo và lưu CV, import CV từ tài liệu nguồn, nộp đơn ứng tuyển, theo dõi trạng thái đơn, nhận thông báo và nhận gợi ý việc làm. Trong tầng dữ liệu, vai trò này được chuẩn hóa thành `candidate`, đồng thời được gắn với nhiều nhóm bảng như `candidate_profiles`, `resumes`, `applications`, `cv_documents` và `editable_cvs`.

#### 1.5.1.3. Nhà tuyển dụng / HR

Nhà tuyển dụng hoặc HR là đối tượng sử dụng hệ thống ở phía cung việc làm. Mã nguồn cho thấy vai trò này được chuẩn hóa ở tầng dữ liệu thành `hr`, còn trên giao diện được biểu diễn như nhà tuyển dụng hoặc employer. Nhóm người dùng này có thể quản lý tin tuyển dụng, xem danh sách ứng viên theo job, cập nhật trạng thái đơn, theo dõi dashboard tuyển dụng, tìm kiếm ứng viên công khai và nhận thông tin hỗ trợ từ hệ thống. Đây là đối tượng gắn trực tiếp với các module `jobs`, `applications`, `application_events`, `employers`, `activity_logs` và public candidate search.

### 1.5.2. Phạm vi chức năng

#### 1.5.2.1. Đăng ký, đăng nhập và phân vai trò

Phạm vi chức năng thứ nhất của hệ thống là quản lý tài khoản, xác thực và phân vai trò người dùng. Phân tích source code cho thấy TalentFlow sử dụng Supabase Auth cho đăng ký, đăng nhập, xác thực OTP ở một số luồng và bước chọn vai trò sau khi tham gia hệ thống. Người dùng có thể được định tuyến vào các không gian làm việc khác nhau tùy theo vai trò `candidate` hoặc `hr`. Đây là lớp chức năng nền tảng để phân tách nghiệp vụ giữa ứng viên và nhà tuyển dụng.

#### 1.5.2.2. Quản lý việc làm, công ty và đơn ứng tuyển

Phạm vi chức năng thứ hai bao gồm hiển thị việc làm công khai, tra cứu công ty, nộp đơn ứng tuyển và quản lý trạng thái đơn. Hệ thống hiện có các API cho jobs và companies, bộ lọc tìm kiếm việc làm, route nộp đơn, bảng `applications` và `application_events`, cũng như các màn hình phía recruiter để xử lý ứng viên theo pipeline. Điều này cho thấy phạm vi của đề tài bao trùm cả cổng công khai lẫn các tác vụ tuyển dụng diễn ra sau khi người dùng gửi hồ sơ.

#### 1.5.2.3. Quản lý hồ sơ ứng viên và CV

Phạm vi chức năng thứ ba tập trung vào hồ sơ ứng viên và CV theo nhiều hình thức. Trong phạm vi hiện thực của repo, hệ thống hỗ trợ hồ sơ ứng viên có cấu trúc, khả năng đặt profile ở chế độ công khai hoặc riêng tư, thư viện CV theo template, kho resume của người dùng và tái sử dụng CV khi ứng tuyển. Đây là phần chức năng tạo nền cho các luồng recommendation, tìm kiếm ứng viên và xử lý CV bằng AI.

#### 1.5.2.4. Xử lý import CV, OCR, editable CV và export

Phạm vi chức năng thứ tư là khối xử lý tài liệu CV. Hệ thống tiếp nhận tài liệu gốc ở các định dạng PDF, DOCX và ảnh, lưu vào storage, enqueue tác vụ phân tích, thực hiện OCR, phân tích bố cục, sinh parsed JSON, cho phép review kết quả, tạo editable CV, lưu phiên bản chỉnh sửa và export lại sang PDF. Bên cạnh đó, source code còn có bằng chứng về xử lý tài liệu nguồn theo loại PDF, Word và Image, kèm versioning và cờ gợi ý reparse khi tệp nguồn thay đổi. Đây là một phạm vi chức năng nổi bật và mang tính phân biệt của TalentFlow.

#### 1.5.2.5. Dashboard, thông báo và email hỗ trợ quy trình tuyển dụng

Phạm vi chức năng thứ năm bao gồm dashboard theo vai trò, hệ thống thông báo nội bộ và email hỗ trợ một số luồng nghiệp vụ. Mã nguồn cho thấy hệ thống có bảng `notifications`, API đọc và đánh dấu đã đọc, cơ chế subscribe realtime ở một số thành phần giao diện, cùng với route gửi email và module email testing. Ở đây cần nhấn mạnh rằng email là thành phần hỗ trợ quy trình tuyển dụng, còn Mailpit và MongoDB chủ yếu phục vụ môi trường kiểm thử hoặc phát triển.

### 1.5.3. Phạm vi công nghệ

#### 1.5.3.1. Ứng dụng web full-stack

Trong phạm vi công nghệ hiện tại, TalentFlow được xây dựng như một ứng dụng web full-stack sử dụng Next.js 16, React 19 và TypeScript. Ứng dụng sử dụng App Router để tổ chức route, kết hợp Route Handlers cho các API web và các thư viện server-side để điều phối nghiệp vụ. Cách tổ chức này cho phép frontend, backend web và các logic xử lý dữ liệu mức ứng dụng cùng tồn tại trong một codebase, phù hợp với yêu cầu phát triển nhanh nhưng vẫn kiểm soát được cấu trúc hệ thống.

#### 1.5.3.2. Cơ sở dữ liệu đám mây và lưu trữ tệp

TalentFlow sử dụng Supabase như lớp dữ liệu chính, bao gồm PostgreSQL cho dữ liệu quan hệ, Auth cho xác thực, Storage cho tệp, Realtime cho một số luồng cập nhật giao diện và Row Level Security để kiểm soát truy cập dữ liệu. Các bucket như `cv_uploads`, `cv-originals`, `cv-previews`, `cv-assets`, `cv-exports` phản ánh rõ nhu cầu lưu trữ nhiều loại tài liệu phục vụ tuyển dụng và xử lý CV. Bên cạnh đó, trong môi trường phát triển của repo còn có MongoDB và Mailpit để hỗ trợ email testing, nhưng đây không phải thành phần lõi của bài toán nghiệp vụ chính.

#### 1.5.3.3. Microservice AI cho xử lý CV

Khối AI của hệ thống được tách thành microservice riêng dựa trên FastAPI. Các tác vụ nền được điều phối bằng Celery và Redis, cho phép xử lý bất đồng bộ các tài liệu CV mà không chặn request web. Trong pipeline lõi, Google Vision OCR được dùng để trích xuất văn bản và block có tọa độ; Ollama được dùng cho các bước chuẩn hóa, ánh xạ JSON, gợi ý hoặc xếp hạng ở một số luồng. Gemini và Groq có bằng chứng xuất hiện trong route tối ưu nội dung CV như các công cụ AI phụ trợ, không phải lõi của pipeline import CV. Ngoài ra, lớp xử lý tài liệu của hệ thống còn có bằng chứng tích hợp Apryse cho PDF, ONLYOFFICE cho Word và React PDF cho preview hoặc export tài liệu.

## 1.6. Phương pháp nghiên cứu và hướng tiếp cận

### 1.6.1. Phân tích yêu cầu từ nghiệp vụ tuyển dụng và dữ liệu hồ sơ

Hướng tiếp cận đầu tiên của đề tài là xuất phát từ nghiệp vụ tuyển dụng thực tế và từ đặc điểm của dữ liệu hồ sơ ứng viên. Thay vì xem việc làm, hồ sơ và CV là các bài toán tách biệt, đề tài xem chúng là các thành phần liên quan chặt chẽ trong cùng một quy trình. Việc phân tích mã nguồn, migrations, route handlers và các tài liệu hiện có cho thấy tác giả hệ thống lựa chọn cách tiếp cận bám sát luồng nghiệp vụ: từ công khai việc làm, đăng ký và chọn vai trò, quản lý hồ sơ, ứng tuyển, xử lý ATS đến import CV bằng AI.

### 1.6.2. Thiết kế hệ thống theo hướng web full-stack kết hợp microservice AI

Phương pháp thứ hai là thiết kế hệ thống theo hướng kết hợp giữa ứng dụng web full-stack và microservice AI. Các tác vụ tương tác trực tiếp với người dùng, kiểm soát truy cập và điều phối dữ liệu được đặt trong ứng dụng Next.js; các tác vụ nặng về OCR, parsing và xử lý tài liệu được tách sang FastAPI, Celery và Redis. Cách tiếp cận này giúp giảm độ phức tạp ở tầng request/response web, đồng thời tạo điều kiện mở rộng riêng cho khối xử lý tài liệu CV.

### 1.6.3. Xây dựng kiến trúc phân vai candidate - recruiter

Phương pháp thứ ba là xây dựng hệ thống theo kiến trúc phân vai rõ ràng giữa ứng viên và nhà tuyển dụng. Trong tầng dữ liệu, các vai trò được chuẩn hóa quanh `candidate` và `hr`; trong tầng giao diện và điều hướng, hệ thống tổ chức các workspace riêng cho từng vai trò, đi kèm các policy RLS để bảo vệ dữ liệu tương ứng. Hướng tiếp cận này giúp mỗi nhóm người dùng làm việc trên cùng một nền tảng nhưng với phạm vi quyền hạn và tập chức năng khác nhau, giảm nhầm lẫn và tăng tính bảo mật cho dữ liệu hồ sơ.

### 1.6.4. Kiểm thử theo luồng nghiệp vụ và module chức năng

Phương pháp thứ tư là kiểm thử theo các luồng nghiệp vụ trọng tâm và các module chức năng then chốt. Từ cấu trúc repo có thể thấy hệ thống đã có nhiều file kiểm thử TypeScript cho các nhóm như jobs, candidate workspace, recruiter workspace, CV Builder, OCR viewer, editor runtime, import review, routing và email templates; đồng thời có các test Python cho AI service. Ngoài ra còn có các script hỗ trợ kiểm tra UI và hiệu năng như `verify_ui_flows`, `autocannon`, `lighthouse`. Điều này cho thấy định hướng kiểm thử được tổ chức theo module và luồng sử dụng thực tế, dù chưa có đủ bằng chứng để kết luận rằng mọi chức năng đều đã có bộ E2E thống nhất.

## 1.7. Đóng góp chính của đề tài

### 1.7.1. Tích hợp quy trình tuyển dụng và quản lý CV trên cùng một nền tảng

Đóng góp đầu tiên của đề tài là tích hợp các bước vốn thường bị tách rời trong nhiều hệ thống: công khai việc làm, quản lý hồ sơ ứng viên, tạo hoặc lưu CV, nộp đơn ứng tuyển và theo dõi trạng thái xử lý. Trong phạm vi hiện thực của repo, TalentFlow cho thấy một hướng tổ chức thống nhất khi các luồng công khai, candidate workspace và recruiter workspace được đặt trên cùng nền tảng dữ liệu và cùng ứng dụng web.

### 1.7.2. Bổ sung khối chuẩn hóa CV từ tài liệu nguồn bằng OCR/AI

Đóng góp thứ hai là bổ sung một khối xử lý CV có khả năng tiếp nhận tài liệu nguồn, chạy OCR, phân tích bố cục, chuẩn hóa nội dung và chuyển sang dạng có thể chỉnh sửa. So với các hệ thống chỉ lưu CV ở dạng tệp, hướng tiếp cận này nâng cao khả năng tái sử dụng dữ liệu hồ sơ trong các tác vụ về sau. Việc lưu cả artifact trung gian, block OCR, block layout, editable CV và phiên bản export cho thấy đề tài đã đi xa hơn mức upload CV thông thường.

### 1.7.3. Bổ sung ATS pipeline cho phía nhà tuyển dụng

Đóng góp thứ ba là bổ sung mô hình ATS cho phía nhà tuyển dụng thông qua quản lý trạng thái đơn ứng tuyển, lưu lịch sử sự kiện và tổ chức dashboard tuyển dụng. Với các bảng `applications`, `application_events`, `activity_logs` và các route recruiter, hệ thống thể hiện được hướng quản lý pipeline tuyển dụng có cấu trúc thay vì chỉ lưu danh sách hồ sơ thụ động.

### 1.7.4. Đề xuất hướng ghép nối việc làm và ứng viên dựa trên hồ sơ thực tế

Đóng góp thứ tư là đề xuất hướng ghép nối dựa trên dữ liệu hồ sơ thực tế của ứng viên và dữ liệu việc làm hiện có. Mã nguồn cho thấy hệ thống đã hiện thực bước đầu cơ chế recommendation theo hai lớp: chấm điểm theo luật nghiệp vụ và xếp hạng bằng mô hình ngôn ngữ cục bộ trong một số trường hợp. Đồng thời, phía nhà tuyển dụng có thể tìm kiếm ứng viên công khai theo kỹ năng, kinh nghiệm và từ khóa. Dù chưa nên xem đây là một hệ gợi ý hoàn chỉnh ở mức học thuật chuyên sâu, đây vẫn là đóng góp đáng chú ý về mặt tích hợp dữ liệu hồ sơ vào bài toán ghép nối tuyển dụng.

## 1.8. Cấu trúc của đồ án

### 1.8.1. Mô tả ngắn gọn nội dung từng chương

Đồ án được tổ chức thành sáu chương chính với nội dung khái quát như sau.

| Chương | Nội dung chính |
| --- | --- |
| Chương 1. Tổng quan đề tài | Trình bày bối cảnh, tính cấp thiết, phát biểu bài toán, giới thiệu hệ thống TalentFlow, mục tiêu, phạm vi, phương pháp tiếp cận, đóng góp và cấu trúc chung của đồ án. |
| Chương 2. Cơ sở lý thuyết và công nghệ sử dụng | Trình bày các cơ sở lý thuyết liên quan đến nền tảng tuyển dụng trực tuyến, quản lý CV, ATS, OCR, recommendation, kiến trúc web full-stack, dữ liệu, xác thực và các công nghệ được dùng trong hệ thống. |
| Chương 3. Phân tích và thiết kế hệ thống | Phân tích tác nhân, nghiệp vụ, yêu cầu chức năng và phi chức năng; thiết kế kiến trúc tổng thể, cơ sở dữ liệu, API, luồng xử lý và điều hướng của hệ thống TalentFlow. |
| Chương 4. Xây dựng, cài đặt và kết quả đạt được | Mô tả môi trường phát triển, cấu trúc source code, quá trình xây dựng các phân hệ công khai, candidate workspace, recruiter workspace, khối CV, AI service, source document editor và các kết quả đạt được. |
| Chương 5. Kiểm thử và đánh giá hệ thống | Trình bày mục tiêu kiểm thử, môi trường kiểm thử, các nhóm ca kiểm thử theo chức năng, kết quả đánh giá và những hạn chế quan sát được từ hệ thống hiện tại. |
| Chương 6. Kết luận và hướng phát triển | Tổng kết các kết quả chính của đề tài, ý nghĩa thực tiễn của hệ thống TalentFlow và đề xuất các hướng phát triển tiếp theo cho nền tảng. |

Từ cấu trúc này có thể thấy Chương 1 đóng vai trò mở đề và xác lập vấn đề nghiên cứu, làm nền cho các chương sau về cơ sở lý thuyết, phân tích thiết kế, xây dựng hệ thống, kiểm thử và kết luận.
