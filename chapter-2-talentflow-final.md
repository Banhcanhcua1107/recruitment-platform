# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

## 2.1. Cơ sở lý thuyết về hệ thống tuyển dụng trực tuyến

### 2.1.1. Khái niệm nền tảng tuyển dụng trực tuyến

Nền tảng tuyển dụng trực tuyến là hệ thống thông tin được xây dựng trên môi trường web nhằm hỗ trợ các hoạt động công bố nhu cầu tuyển dụng, tìm kiếm việc làm, tiếp nhận hồ sơ ứng viên và phối hợp xử lý quy trình tuyển dụng. Khác với hình thức đăng tin tĩnh hoặc tiếp nhận hồ sơ rời rạc qua email, nền tảng tuyển dụng trực tuyến có xu hướng tổ chức dữ liệu và luồng nghiệp vụ theo hướng tập trung, cho phép nhiều chủ thể cùng tương tác trên một không gian số thống nhất.

Về bản chất, một nền tảng tuyển dụng trực tuyến thường phải giải quyết đồng thời ít nhất ba nhóm chức năng. Thứ nhất là lớp công khai, nơi khách truy cập có thể xem danh sách việc làm, tra cứu doanh nghiệp và tiếp cận thông tin tuyển dụng. Thứ hai là lớp tài khoản và hồ sơ người dùng, phục vụ đăng ký, đăng nhập, lưu trữ dữ liệu cá nhân và quản lý lịch sử tương tác. Thứ ba là lớp xử lý nghiệp vụ tuyển dụng, bao gồm nộp đơn, theo dõi trạng thái hồ sơ, quản lý pipeline và trao đổi thông tin giữa ứng viên với nhà tuyển dụng.

Trong bối cảnh nghiên cứu của đề tài này, khái niệm nền tảng tuyển dụng trực tuyến không chỉ dừng ở việc hiển thị tin tuyển dụng. Phân tích cấu trúc mã nguồn TalentFlow cho thấy hệ thống được tổ chức như một nền tảng tuyển dụng web tích hợp, trong đó cổng việc làm công khai, hồ sơ ứng viên, đơn ứng tuyển, workspace của nhà tuyển dụng, recommendation và xử lý CV được đặt trong cùng một hệ sinh thái dữ liệu. Điều này phù hợp với xu hướng hiện đại, khi tuyển dụng số không còn là tập hợp của các chức năng rời rạc mà là một quy trình liên thông từ tiếp cận tin tuyển dụng đến khai thác dữ liệu hồ sơ.

### 2.1.2. Khái niệm tin tuyển dụng, hồ sơ ứng viên và đơn ứng tuyển

Tin tuyển dụng là đơn vị thông tin thể hiện nhu cầu tuyển người của doanh nghiệp cho một vị trí cụ thể. Một tin tuyển dụng thường bao gồm tên vị trí, mô tả công việc, yêu cầu kỹ năng, kinh nghiệm, địa điểm làm việc, mức lương và thông tin doanh nghiệp. Trong hệ thống tuyển dụng trực tuyến, tin tuyển dụng không chỉ là nội dung hiển thị ra giao diện mà còn là thực thể dữ liệu trung tâm để liên kết với ứng viên, đơn ứng tuyển và các phân tích về mức độ phù hợp.

Hồ sơ ứng viên là tập hợp thông tin mô tả năng lực, kinh nghiệm, kỹ năng và định hướng nghề nghiệp của người tìm việc. Hồ sơ này có thể được biểu diễn dưới nhiều dạng khác nhau như profile có cấu trúc, CV được dựng từ mẫu, hoặc tài liệu CV tải lên từ bên ngoài. Trên phương diện lý thuyết, hồ sơ ứng viên càng được chuẩn hóa tốt thì hệ thống càng có khả năng tái sử dụng dữ liệu cho các tác vụ như recommendation, tìm kiếm ứng viên và so khớp với yêu cầu tuyển dụng.

Đơn ứng tuyển là bản ghi thể hiện việc một ứng viên nộp hồ sơ vào một tin tuyển dụng cụ thể. Đơn ứng tuyển tạo ra mối liên kết trực tiếp giữa phía cung lao động và phía cầu lao động, đồng thời mở đầu cho toàn bộ tiến trình xử lý hồ sơ về sau. Trong nhiều hệ thống hiện đại, đơn ứng tuyển không còn là một trạng thái tĩnh mà được gắn với lịch sử thay đổi, sự kiện và các tương tác tiếp theo trong pipeline tuyển dụng.

Trong TalentFlow, ba khái niệm này được phản ánh khá rõ qua các nhóm dữ liệu `jobs`, `candidate_profiles`, `resumes`, `applications` và `application_events`. Tin tuyển dụng tồn tại như đầu vào của cổng tuyển dụng công khai và recruiter workspace; hồ sơ ứng viên được tổ chức theo cả dạng profile có cấu trúc lẫn CV; còn đơn ứng tuyển là nơi liên kết giữa ứng viên, việc làm và tiến trình ATS. Điều đó cho thấy hệ thống được thiết kế theo hướng lấy quan hệ giữa các thực thể nghiệp vụ làm nền tảng, thay vì chỉ tập trung vào giao diện hiển thị.

### 2.1.3. Mô hình ATS trong quản lý tiến trình tuyển dụng

ATS, viết tắt của Applicant Tracking System, là mô hình hệ thống theo dõi và quản lý vòng đời hồ sơ ứng viên trong quá trình tuyển dụng. Về mặt lý thuyết, ATS giúp chuẩn hóa các trạng thái xử lý như tiếp nhận hồ sơ, sàng lọc, phỏng vấn, đề nghị nhận việc, tuyển dụng thành công hoặc từ chối. Thay vì xử lý hồ sơ theo cách thủ công và phân tán, ATS đưa toàn bộ tiến trình về một chuỗi trạng thái có thể theo dõi, truy vết và thống kê.

Ý nghĩa quan trọng của ATS là hỗ trợ nhà tuyển dụng quan sát được không chỉ trạng thái hiện tại của từng đơn ứng tuyển mà còn cả lịch sử các thay đổi liên quan. Điều này giúp giảm thất lạc thông tin, tăng tính minh bạch trong phối hợp nội bộ và tạo điều kiện để đánh giá hiệu quả tuyển dụng theo từng giai đoạn. Đối với ứng viên, ATS cũng góp phần làm rõ tiến độ xử lý hồ sơ thay vì để quá trình ứng tuyển diễn ra như một “hộp đen”.

Trong TalentFlow, mô hình ATS được phản ánh qua các bảng `applications` và `application_events`, cùng với dashboard phía recruiter và các hàm xử lý trạng thái đơn. Hệ thống lưu trạng thái hiện hành của đơn ứng tuyển, đồng thời ghi nhận các sự kiện phát sinh trong quá trình xử lý. Về lý thuyết, cách tổ chức này phù hợp với mô hình ATS ở chỗ vừa hỗ trợ thao tác vận hành, vừa tạo ra lịch sử dữ liệu phục vụ theo dõi pipeline. Các trạng thái được kiểm soát ở tầng cơ sở dữ liệu cũng cho thấy hệ thống không xem việc nộp hồ sơ là một hành động đơn lẻ, mà là điểm bắt đầu của một vòng đời nghiệp vụ hoàn chỉnh.

### 2.1.4. Vai trò của hồ sơ công khai trong tìm kiếm ứng viên chủ động

Trong tuyển dụng hiện đại, doanh nghiệp không chỉ chờ ứng viên chủ động nộp đơn mà còn thực hiện tìm kiếm nguồn ứng viên phù hợp từ trước. Cách tiếp cận này thường được gọi là tìm kiếm ứng viên chủ động, trong đó hồ sơ công khai đóng vai trò là lớp dữ liệu để nhà tuyển dụng tra cứu, sàng lọc và tiếp cận ứng viên ngay cả khi chưa phát sinh đơn ứng tuyển cho một tin tuyển dụng cụ thể.

Về mặt lý thuyết, hồ sơ công khai cần cân bằng giữa hai yêu cầu: khả năng tìm kiếm và quyền riêng tư. Nếu dữ liệu hồ sơ không được cấu trúc hoặc không có cơ chế kiểm soát truy cập, nhà tuyển dụng khó khai thác thông tin hữu ích, trong khi ứng viên có thể gặp rủi ro lộ dữ liệu ngoài mong muốn. Vì vậy, các hệ thống tuyển dụng thường triển khai cơ chế công khai có kiểm soát, chỉ cho phép tra cứu những hồ sơ đã được người dùng cho phép xuất hiện ở chế độ tìm kiếm.

Trong TalentFlow, điều này được thể hiện qua `candidate_profiles` và cơ chế `profile_visibility` ở mức `public` hoặc `private`. Các hàm tìm kiếm hồ sơ công khai phía recruiter hỗ trợ lọc theo tên, kỹ năng, headline, kinh nghiệm và từ khóa. Cấu trúc hiện tại cho thấy hồ sơ công khai trong hệ thống không phải là bản sao đơn giản của CV, mà là một lớp dữ liệu có cấu trúc dùng để phục vụ tìm kiếm ứng viên chủ động. Cách tiếp cận này giúp kết nối bài toán quản lý hồ sơ ứng viên với bài toán tuyển dụng chủ động trên cùng nền tảng.

## 2.2. Cơ sở lý thuyết về quản lý và chuẩn hóa CV

### 2.2.1. Khái niệm CV Builder và các block thông tin CV

CV Builder là công cụ hỗ trợ tạo lập và chỉnh sửa CV trực tiếp trên hệ thống thay vì phải sử dụng một phần mềm bên ngoài. Trên phương diện lý thuyết, CV Builder hiện đại thường không lưu tài liệu theo dạng văn bản tự do hoàn toàn, mà tổ chức CV thành các khối thông tin có cấu trúc như thông tin cá nhân, giới thiệu bản thân, học vấn, kinh nghiệm, kỹ năng, dự án hoặc giải thưởng. Cách tiếp cận theo block giúp dữ liệu dễ tái sử dụng, dễ kiểm soát tính nhất quán và thuận lợi cho việc xuất ra nhiều định dạng khác nhau.

Mô hình block trong CV Builder có hai ưu điểm đáng chú ý. Thứ nhất, nó cho phép tách riêng phần định nghĩa cấu trúc của mẫu CV với phần dữ liệu cụ thể của từng người dùng. Thứ hai, nó làm cho việc hiển thị, kéo thả, ẩn hoặc sắp xếp lại các phần CV trở nên linh hoạt hơn mà không làm mất đi tính có cấu trúc của dữ liệu. Đây là nền tảng phù hợp cho các chức năng tiếp theo như xuất PDF, chỉnh sửa theo template hoặc trích xuất dữ liệu để recommendation.

Trong TalentFlow, khái niệm này được thể hiện rõ trong nhóm dữ liệu `templates` và `resumes`. `templates` lưu `structure_schema` của các block, còn `resumes` lưu `resume_data` theo từng block cụ thể. Phân tích mã nguồn `src/lib/resumes.ts` cho thấy các block được tổ chức bằng `block_id`, `block_type`, nhóm trường dữ liệu và các danh sách lặp như kinh nghiệm hoặc học vấn. Điều đó cho phép xem CV Builder của TalentFlow là một công cụ xây dựng CV theo hướng dữ liệu có cấu trúc, chứ không chỉ là trình soạn thảo văn bản thuần túy.

### 2.2.2. Chuyển đổi CV từ tài liệu gốc sang dữ liệu có cấu trúc

Một vấn đề phổ biến trong quản lý hồ sơ tuyển dụng là CV ban đầu thường đến dưới dạng tài liệu tĩnh như PDF, DOCX hoặc ảnh chụp. Nếu hệ thống chỉ lưu những tài liệu này như tệp đính kèm, phần lớn nội dung vẫn ở trạng thái khó chỉnh sửa và khó khai thác tự động. Vì vậy, về mặt lý thuyết, cần có quá trình chuyển đổi từ tài liệu nguồn sang dữ liệu có cấu trúc, trong đó thông tin được nhận diện, chuẩn hóa và ánh xạ sang một mô hình dữ liệu có thể xử lý tiếp.

Quá trình chuyển đổi này thường bao gồm nhiều bước: lưu tài liệu gốc, trích xuất nội dung văn bản, xác định các vùng bố cục hoặc block, gom nhóm thông tin theo ngữ nghĩa, sinh ra biểu diễn dữ liệu trung gian và cuối cùng chuyển thành dữ liệu chỉnh sửa được trong hệ thống. Một điểm quan trọng là kết quả chuyển đổi không nên được xem là hoàn toàn chính xác trong mọi trường hợp. Với dữ liệu CV thực tế, bố cục và cách diễn đạt rất đa dạng, do đó quy trình tốt thường phải cho phép review và hiệu chỉnh kết quả trước khi dùng làm dữ liệu chính thức.

Trong TalentFlow, hướng tiếp cận này được phản ánh qua chuỗi bảng `cv_documents`, `cv_document_artifacts`, `cv_document_pages`, `cv_ocr_blocks`, `cv_layout_blocks`, `editable_cvs`, `editable_cv_blocks`, `editable_cv_versions` và `editable_cv_exports`. Dữ liệu không dừng ở mức “đã upload CV”, mà được dẫn qua nhiều lớp xử lý để cuối cùng tạo ra một editable CV. Từ góc nhìn lý thuyết, đây là mô hình chuyển đổi từ tài liệu phi cấu trúc sang dữ liệu có cấu trúc, đồng thời bảo toàn quan hệ giữa tệp nguồn, kết quả trung gian và bản CV làm việc sau cùng.

### 2.2.3. OCR và trích xuất nội dung từ PDF / ảnh / DOCX

OCR, viết tắt của Optical Character Recognition, là kỹ thuật nhận dạng ký tự từ tài liệu hình ảnh hoặc các bề mặt hiển thị nội dung không ở dạng văn bản có thể truy cập trực tiếp. Trong bài toán CV, OCR thường được dùng để đọc nội dung từ file scan, ảnh chụp hoặc PDF không chứa lớp text thuận tiện cho việc phân tích. Về mặt lý thuyết, OCR chỉ là một khâu trong chuỗi xử lý tài liệu; sau OCR vẫn cần các bước làm sạch, gom nhóm và chuẩn hóa dữ liệu.

Tuy nhiên, không phải mọi định dạng tài liệu đều phải xử lý giống nhau. Với ảnh và nhiều tài liệu PDF, OCR là lựa chọn phù hợp để lấy ra văn bản và vị trí tương đối của các block nội dung. Với DOCX, trong nhiều trường hợp hệ thống có thể đọc nội dung trực tiếp từ cấu trúc văn bản của tệp thay vì thực hiện OCR theo nghĩa chặt. Vì vậy, khi nói đến “OCR và trích xuất nội dung từ PDF, ảnh, DOCX”, cần hiểu đây là nhóm kỹ thuật trích xuất nội dung từ tài liệu nguồn, trong đó OCR là trọng tâm đối với PDF/ảnh, còn DOCX có thể đi theo hướng đọc cấu trúc tài liệu.

Mã nguồn TalentFlow thể hiện khá rõ quan điểm đó. Dịch vụ AI dùng Google Vision OCR cho PDF và ảnh để lấy văn bản cùng bounding boxes hoặc block tọa độ, trong khi một số endpoint trong `ai-service` xử lý DOCX qua thư viện đọc nội dung tài liệu. Điều này cho phép hệ thống xây dựng các bảng `cv_ocr_blocks` và `cv_layout_blocks` phục vụ bước review và ánh xạ sang editor. Về mặt lý thuyết, việc giữ lại tọa độ block là rất quan trọng, vì nó tạo cầu nối giữa tài liệu gốc, giao diện review và bản CV đã được chuyển sang dạng chỉnh sửa.

### 2.2.4. Biên tập tài liệu nguồn và versioning tài liệu

Sau khi tài liệu CV được nhập vào hệ thống, nhu cầu thực tế không chỉ dừng ở việc xem kết quả OCR mà còn có thể phát sinh yêu cầu chỉnh sửa lại chính tài liệu nguồn. Trên phương diện lý thuyết, khi hệ thống cho phép biên tập tài liệu nguồn, cần có cơ chế versioning để ghi nhận các phiên bản khác nhau, truy ngược nguồn gốc thay đổi và xác định mối quan hệ giữa phiên bản đang được phân tích với phiên bản mới nhất hiện có.

Versioning tài liệu đặc biệt quan trọng với bài toán CV import. Nếu người dùng chỉnh sửa tệp Word hoặc PDF sau khi hệ thống đã parse xong, kết quả phân tích cũ có thể không còn phản ánh đúng nội dung mới. Do đó, hệ thống cần theo dõi phiên bản gốc, phiên bản chỉnh sửa, phiên bản đã parse lần cuối và các cờ cảnh báo về sự lệch pha giữa dữ liệu nguồn với dữ liệu đã chuẩn hóa. Đây là tiền đề để hỗ trợ reparse khi cần thiết và tránh việc người dùng thao tác trên dữ liệu đã lỗi thời.

Trong TalentFlow, điều này được thể hiện qua bảng `document_file_versions` và các trường như `source_file_version_id`, `latest_file_version_id`, `last_parsed_version_id`, `file_updated_after_parse`, `reparse_recommended` trong `cv_documents`. Mã nguồn `src/lib/editor/metadata.ts` và các route editor cho thấy hệ thống nhận diện loại tệp `pdf`, `word` hoặc `image`, cung cấp metadata cho editor tương ứng và lưu lại phiên bản mới sau mỗi lần chỉnh sửa. Về lý thuyết, đây là một cách tổ chức hợp lý để kết nối khối import CV với khối biên tập tài liệu nguồn, đồng thời bảo đảm tính nhất quán giữa tệp gốc và dữ liệu editable CV.

## 2.3. Cơ sở lý thuyết về ghép nối ứng viên - việc làm

### 2.3.1. Gợi ý việc làm dựa trên hồ sơ ứng viên

Gợi ý việc làm là quá trình đề xuất một tập hợp vị trí tuyển dụng có khả năng phù hợp với một ứng viên dựa trên dữ liệu hồ sơ của họ. Về lý thuyết, bài toán này có thể được tiếp cận từ nhiều hướng như luật nghiệp vụ, truy hồi theo từ khóa, chấm điểm theo tiêu chí hoặc mô hình học máy. Dù áp dụng hướng nào, đầu vào cơ bản vẫn là thông tin về kỹ năng, vai trò mong muốn, kinh nghiệm, vị trí địa lý và các đặc điểm có ý nghĩa đối với mức độ phù hợp nghề nghiệp.

Trong bối cảnh nền tảng tuyển dụng, gợi ý việc làm giúp giảm chi phí tìm kiếm thông tin cho ứng viên và tăng xác suất tiếp cận đúng cơ hội phù hợp. Khi hồ sơ ứng viên đã được chuẩn hóa, hệ thống có thể tái sử dụng dữ liệu này để xếp hạng các công việc hiện có mà không buộc người dùng phải tìm kiếm thủ công toàn bộ danh sách. Tuy nhiên, kết quả gợi ý trong thực tế vẫn nên được xem là cơ chế hỗ trợ ra quyết định chứ không phải kết luận tuyệt đối về mức độ phù hợp.

Trong TalentFlow, hướng gợi ý việc làm được hiện thực qua API `recommend-jobs`, bảng `job_recommendations`, các hàm xây dựng văn bản hồ sơ ứng viên và pipeline chấm điểm theo luật kết hợp với AI. Kết quả recommendation được lưu cache theo người dùng để tái sử dụng, đồng thời có các nhánh fallback khi không có dữ liệu AI hoặc khi người dùng chưa đăng nhập. Điều này cho thấy hệ thống xem recommendation là một lớp hỗ trợ vận hành dựa trên dữ liệu hồ sơ có thực, thay vì chỉ là tiện ích phụ trên giao diện.

### 2.3.2. Tìm kiếm ứng viên theo kỹ năng, kinh nghiệm và mức độ phù hợp

Tìm kiếm ứng viên là quá trình nhà tuyển dụng chủ động tra cứu hồ sơ từ kho dữ liệu ứng viên để phục vụ nhu cầu tuyển dụng. Trên phương diện lý thuyết, việc tìm kiếm hiệu quả thường dựa trên các thuộc tính như kỹ năng cứng, kinh nghiệm làm việc, vai trò mục tiêu, địa điểm, từ khóa chuyên môn hoặc mức độ công khai của hồ sơ. Nếu dữ liệu hồ sơ được lưu ở dạng phi cấu trúc, chất lượng tìm kiếm thường thấp và khó lọc theo nhiều điều kiện.

Khái niệm mức độ phù hợp trong tìm kiếm ứng viên có thể được hiểu theo hai mức. Mức thứ nhất là phù hợp theo điều kiện truy vấn, tức hồ sơ có chứa các kỹ năng hoặc tiêu chí cần tìm. Mức thứ hai là phù hợp theo một cơ chế chấm điểm hoặc xếp hạng, nơi hệ thống ước lượng hồ sơ nào gần hơn với yêu cầu tuyển dụng. Trong nhiều hệ thống thực tế, hai mức này thường được kết hợp: trước tiên lọc theo tiêu chí cứng, sau đó xếp hạng các kết quả còn lại theo mức độ phù hợp.

Trong phạm vi source code hiện tại, TalentFlow đã hiện thực rõ phần tìm kiếm ứng viên công khai dựa trên hồ sơ có cấu trúc, đặc biệt qua các trường tên, kỹ năng, headline, kinh nghiệm và từ khóa. Cơ chế này gắn với `candidate_profiles` ở chế độ công khai và chỉ khả dụng cho vai trò tuyển dụng. Về mặt chấm điểm mức độ phù hợp, bằng chứng rõ ràng nhất trong repo hiện nằm ở chiều gợi ý việc làm cho ứng viên; phía tìm kiếm ứng viên công khai hiện thiên về lọc và truy hồi hồ sơ có liên quan hơn là một bộ máy ranking phức tạp. Cách mô tả này phù hợp với tình trạng hiện thực của hệ thống.

### 2.3.3. Kết hợp luật nghiệp vụ và mô hình AI trong recommendation

Trong bài toán recommendation, luật nghiệp vụ và mô hình AI không nhất thiết loại trừ lẫn nhau. Luật nghiệp vụ có ưu điểm là minh bạch, dễ giải thích và ổn định; AI có ưu điểm ở khả năng tổng hợp ngữ cảnh và xử lý các biểu diễn ngôn ngữ phong phú hơn. Trong nhiều hệ thống thực tế, hướng tiếp cận phù hợp là kết hợp cả hai: dùng luật nghiệp vụ để tạo bộ lọc, khung điểm hoặc phương án dự phòng, sau đó dùng AI ở những khâu cần tổng hợp ngữ nghĩa hoặc xếp hạng tinh hơn.

TalentFlow thể hiện khá rõ mô hình kết hợp này. Trong `src/lib/recommend/score.ts`, hệ thống áp dụng trọng số chấm điểm theo luật với 60% cho khớp kỹ năng, 25% cho độ tương đồng vai trò, 10% cho kinh nghiệm và 5% cho địa điểm. Song song với đó, API recommendation còn có lớp xếp hạng AI thông qua `rankJobsWithGemini`, dù phần hiện thực bên trong dùng Ollama để phân tích và sắp xếp công việc trên cơ sở văn bản hồ sơ ứng viên. Khi lớp AI không khả dụng hoặc không cho kết quả phù hợp, hệ thống tự động rơi về các nhánh `rule-fallback`, `recent-fallback` hoặc `guest-fallback`.

Về mặt lý thuyết, kiến trúc như vậy có hai lợi ích. Một là vẫn bảo đảm hệ thống hoạt động được trong điều kiện AI phụ trợ không sẵn sàng. Hai là giữ được tính giải thích tương đối của recommendation nhờ còn tồn tại lớp scoring theo luật. Do đó, recommendation trong TalentFlow nên được hiểu là cơ chế gợi ý kết hợp luật nghiệp vụ với AI phụ trợ, không phải một bộ máy học sâu phức tạp hay một mô hình recommendation “hộp đen” hoàn chỉnh.

## 2.4. Cơ sở lý thuyết về kiến trúc hệ thống web hiện đại

### 2.4.1. Kiến trúc client - server trong ứng dụng web full-stack

Kiến trúc client - server là mô hình cơ bản của phần lớn ứng dụng web hiện đại. Trong mô hình này, phía client chịu trách nhiệm hiển thị giao diện, tiếp nhận tương tác người dùng và gửi yêu cầu đến phía server; phía server xử lý logic nghiệp vụ, truy cập dữ liệu, xác thực người dùng và trả kết quả về client. Tuy nhiên, ở các framework web hiện đại, ranh giới giữa frontend và backend web thường được tổ chức linh hoạt hơn, cho phép một codebase thống nhất đảm nhiệm cả giao diện lẫn các lớp xử lý phía server.

Ứng dụng web full-stack theo hướng này có lợi thế ở việc giảm độ phân mảnh của hệ thống, giúp tái sử dụng kiểu dữ liệu, logic điều phối và hạ tầng xác thực giữa các phần của ứng dụng. Điều này đặc biệt phù hợp với các hệ thống có nhiều route công khai, route xác thực và route nghiệp vụ như nền tảng tuyển dụng. Khi cùng một codebase quản lý cả lớp giao diện lẫn lớp backend web, việc triển khai các luồng đăng nhập, phân vai, hiển thị dashboard hay gọi dịch vụ dữ liệu thường nhất quán hơn.

TalentFlow được tổ chức đúng theo tinh thần đó. Lớp web app sử dụng Next.js để đồng thời dựng giao diện công khai, workspace theo vai trò và các API nội bộ thông qua Route Handlers. Các module `src/app`, `src/features`, `src/lib` và `src/types` cho thấy hệ thống không tách thành hai dự án frontend và backend web hoàn toàn độc lập, mà tập trung chúng trong một kiến trúc full-stack. Trên cơ sở lý thuyết, đây là lựa chọn phù hợp cho một hệ thống tuyển dụng cần phát triển đồng bộ nhiều lớp nghiệp vụ nhưng vẫn giữ khả năng mở rộng theo module.

### 2.4.2. App Router và Route Handler trong Next.js

App Router là cơ chế tổ chức route theo cây thư mục trong Next.js, nơi giao diện, layout, segment động và các endpoint web được sắp xếp cùng trong một mô hình định tuyến thống nhất. Route Handler là cách định nghĩa các API endpoint trực tiếp trong thư mục ứng dụng, cho phép xử lý các phương thức như `GET`, `POST`, `PATCH` hoặc `DELETE` bằng các hàm server-side. Về lý thuyết, cách tổ chức này rút ngắn khoảng cách giữa giao diện và nghiệp vụ, đặc biệt trong những hệ thống dùng chung kiểu dữ liệu và cần tận dụng khả năng render phía server.

Với nền tảng tuyển dụng, App Router giúp tổ chức rõ ràng các route công khai, route xác thực và route theo vai trò, trong khi Route Handler tạo ra lớp backend web gần với ngữ cảnh giao diện sử dụng nó. Điều này giúp giảm chi phí điều hướng trong mã nguồn và tạo thuận lợi cho việc xây dựng các luồng như xem việc làm, nộp đơn, cập nhật hồ sơ hoặc gọi pipeline xử lý CV.

Trong TalentFlow, cấu trúc `src/app` cho thấy các route được tách thành nhóm công khai, candidate workspace, HR workspace và hệ thống API trong `src/app/api`. Các Route Handlers hiện diện ở nhiều chức năng như việc làm, công ty, applications, notifications, recommendation, CV Builder, editable CV, editor metadata, editor save, ONLYOFFICE callback và PaddleOCR proxy. Điều này cho thấy App Router và Route Handler không chỉ là lựa chọn framework, mà là trục tổ chức chính của lớp web trong toàn bộ hệ thống.

### 2.4.3. Kiến trúc microservice cho xử lý AI và tài liệu

Khi hệ thống web cần tích hợp các tác vụ nặng như OCR, phân tích tài liệu, xử lý PDF hoặc gọi mô hình AI, việc đặt toàn bộ logic vào cùng tiến trình web có thể làm tăng độ phức tạp triển khai và ảnh hưởng đến hiệu năng của lớp phục vụ người dùng. Kiến trúc microservice giải quyết bài toán này bằng cách tách các tác vụ chuyên biệt sang một dịch vụ riêng, có giao diện giao tiếp rõ ràng, thư viện phụ thuộc phù hợp với ngữ cảnh xử lý và khả năng mở rộng độc lập với web app.

Trong lý thuyết thiết kế hệ thống, microservice đặc biệt hữu ích khi có sự khác biệt rõ giữa đặc tính tải của các nhóm chức năng. Web app cần phản hồi nhanh cho request ngắn và nhiều người dùng đồng thời; ngược lại, xử lý tài liệu có thể mất nhiều thời gian, yêu cầu hàng đợi, cần thư viện hệ thống riêng và thường có chu kỳ lỗi hoặc retry khác với request web thông thường. Việc tách hai khối này giúp giảm ràng buộc triển khai và làm cho kiến trúc rõ trách nhiệm hơn.

TalentFlow áp dụng chính cách tiếp cận đó. Web app Next.js giữ vai trò điều phối nghiệp vụ tuyển dụng và tương tác người dùng, còn `ai-service` được xây dựng bằng FastAPI để xử lý parse CV, OCR, preview, matching và một số tác vụ AI khác. Giao tiếp giữa hai khối diễn ra qua HTTP nội bộ và hàng đợi Celery. Về mặt lý thuyết, đây là mô hình phù hợp với bài toán của hệ thống, vì khối xử lý CV có đặc trưng kỹ thuật khác đáng kể so với lớp web phục vụ cổng tuyển dụng.

### 2.4.4. Xử lý bất đồng bộ bằng hàng đợi tác vụ

Xử lý bất đồng bộ là kỹ thuật đưa các công việc mất thời gian ra khỏi vòng đời trực tiếp của request/response web. Thay vì buộc người dùng chờ toàn bộ pipeline hoàn thành trong một request, hệ thống có thể ghi nhận yêu cầu, đẩy tác vụ vào hàng đợi, để worker xử lý ở nền và cập nhật kết quả sau khi hoàn tất. Về mặt lý thuyết, kỹ thuật này rất cần thiết với các nghiệp vụ như OCR, parse tài liệu, render preview hoặc xuất bản kết quả từ dữ liệu lớn.

Hàng đợi tác vụ còn giúp hệ thống kiểm soát retry, phân tách loại công việc, điều phối tài nguyên xử lý và ghi nhận tiến độ qua từng giai đoạn. Đây là yếu tố đặc biệt quan trọng trong pipeline CV, nơi cùng một tài liệu có thể đi qua nhiều bước như upload, OCR, layout analysis, parsing structured data, persist artifact và review. Nếu không có bất đồng bộ, trải nghiệm người dùng sẽ bị giảm mạnh và hệ thống khó mở rộng ổn định.

Trong TalentFlow, vai trò này do Redis và Celery đảm nhiệm trong `ai-service`. Web app tạo bản ghi `cv_documents`, lưu tệp gốc vào storage, sau đó enqueue tác vụ xử lý sang hàng đợi `cv-documents`. Worker Celery thực hiện các bước nền và persist kết quả về lại cơ sở dữ liệu. Các trạng thái như `queued`, `ocr_running`, `layout_running`, `parsing_structured`, `ready`, `partial_ready` hay `failed` trong kiểu dữ liệu `cv-import` cho thấy pipeline đã được mô hình hóa theo hướng bất đồng bộ nhiều giai đoạn.

## 2.5. Cơ sở lý thuyết về dữ liệu, xác thực và phân quyền

### 2.5.1. PostgreSQL và mô hình dữ liệu quan hệ

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ phổ biến, hỗ trợ mạnh cho giao dịch, ràng buộc toàn vẹn, kiểu dữ liệu phong phú và khả năng mở rộng cho các hệ thống nghiệp vụ. Mô hình dữ liệu quan hệ đặc biệt phù hợp với những bài toán có nhiều thực thể liên kết rõ ràng như người dùng, việc làm, doanh nghiệp, hồ sơ ứng viên, đơn ứng tuyển và các sự kiện trong pipeline tuyển dụng. Nhờ khóa chính, khóa ngoại và các ràng buộc kiểm tra, hệ thống có thể duy trì tính nhất quán của dữ liệu trong suốt quá trình vận hành.

Đối với nền tảng tuyển dụng, mô hình quan hệ giúp thể hiện rõ mối quan hệ giữa `jobs`, `applications`, `employers`, `candidates`, `candidate_profiles`, `resumes`, `notifications`, `job_recommendations` và các bảng xử lý CV. Bên cạnh dữ liệu nghiệp vụ cơ bản, cơ sở dữ liệu còn phải hỗ trợ các bảng theo dõi quá trình như `application_events`, `activity_logs`, `cv_document_stage_runs`, `editable_cv_versions` hoặc `document_file_versions`. Đây là những dữ liệu có cấu trúc, nhiều liên kết và cần kiểm soát truy cập chặt chẽ, nên phù hợp với một cơ sở dữ liệu quan hệ hơn là mô hình lưu trữ phi cấu trúc thuần túy.

Trong TalentFlow, lớp dữ liệu quan hệ hiện diện rõ qua các migration Supabase PostgreSQL. Các nhóm bảng nêu trên cho thấy hệ thống không chỉ lưu dữ liệu hiển thị đơn giản mà còn tổ chức được toàn bộ tiến trình tuyển dụng và xử lý CV trên một nền dữ liệu có quan hệ. Về lý thuyết, đây là nền tảng phù hợp để đảm bảo tính nhất quán giữa cổng tuyển dụng công khai, hồ sơ người dùng và pipeline xử lý tài liệu.

### 2.5.2. Supabase Auth và quản lý phiên

Xác thực và quản lý phiên là thành phần không thể thiếu trong hệ thống có phân vai và dữ liệu cá nhân như nền tảng tuyển dụng. Trên phương diện lý thuyết, lớp xác thực phải giải quyết các yêu cầu cơ bản như nhận diện người dùng, tạo phiên làm việc, duy trì trạng thái đăng nhập qua các request và cung cấp thông tin người dùng cho tầng nghiệp vụ. Nếu không có cơ chế xác thực nhất quán, hệ thống khó triển khai các luồng như hồ sơ cá nhân, workspace theo vai trò hoặc quyền truy cập tới tài liệu riêng.

Supabase Auth cung cấp một lớp xác thực tích hợp với cơ sở dữ liệu và client library, giúp ứng dụng web quản lý đăng ký, đăng nhập, phiên và metadata người dùng. Khi kết hợp với server-side utilities, ứng dụng có thể truy xuất thông tin phiên ở cả phía client lẫn phía server, từ đó đồng bộ tốt hơn giữa trải nghiệm giao diện và kiểm soát nghiệp vụ.

Trong TalentFlow, Supabase Auth được sử dụng qua SSR client và browser client, đồng thời gắn với luồng chọn vai trò sau xác thực. Dữ liệu vai trò người dùng được đồng bộ vào hồ sơ ứng dụng và được dùng để điều hướng sang candidate workspace hoặc recruiter workspace. Về lý thuyết, cách tổ chức này tạo ra một lớp xác thực thống nhất cho cả các route giao diện lẫn Route Handlers, qua đó hỗ trợ chặt chẽ cho các chính sách phân quyền ở tầng dữ liệu.

### 2.5.3. Row Level Security trong kiểm soát truy cập dữ liệu

Row Level Security, thường viết tắt là RLS, là cơ chế cho phép kiểm soát quyền truy cập ở mức bản ghi dữ liệu. Thay vì chỉ phân quyền theo bảng hoặc theo ứng dụng, RLS cho phép định nghĩa ai được xem, thêm, sửa hoặc xóa từng dòng dữ liệu dựa trên ngữ cảnh như `auth.uid()`, vai trò người dùng hoặc thuộc tính của bản ghi. Đây là một cơ chế rất phù hợp với các hệ thống nhiều người dùng, nơi cùng một bảng dữ liệu có thể chứa thông tin riêng tư của nhiều chủ thể khác nhau.

Đối với nền tảng tuyển dụng, RLS có ý nghĩa đặc biệt quan trọng vì dữ liệu bao gồm hồ sơ cá nhân, tài liệu CV, đơn ứng tuyển, notification và các bản ghi xử lý tài liệu. Nếu chỉ kiểm soát ở tầng giao diện hoặc tầng API mà không có bảo vệ ở tầng dữ liệu, nguy cơ truy cập sai phạm vi sẽ tăng đáng kể. Về mặt lý thuyết, RLS giúp bổ sung một lớp bảo vệ sát với dữ liệu, từ đó giảm phụ thuộc vào logic ứng dụng đơn thuần.

Trong TalentFlow, nhiều migration đã bật RLS cho các bảng như `candidate_profiles`, `resumes`, `job_recommendations`, `applications`, `notifications` và cả một số bucket storage. Các policy thể hiện khá rõ nguyên tắc chủ sở hữu được quyền quản lý dữ liệu của mình, trong khi các bản ghi công khai hoặc các trường hợp nhà tuyển dụng cần xem hồ sơ được kiểm soát theo điều kiện riêng. Điều này cho thấy hệ thống không chỉ nói đến phân quyền ở mức khái niệm, mà đã cụ thể hóa thành luật kiểm soát dữ liệu ngay tại PostgreSQL/Supabase.

### 2.5.4. Signed URL và lưu trữ tệp trên cloud storage

Trong hệ thống tuyển dụng có xử lý CV, dữ liệu không chỉ nằm ở các bảng quan hệ mà còn ở nhiều tệp nhị phân như CV gốc, preview, tài liệu export, hình ảnh và artifact trung gian. Về lý thuyết, nếu cho phép client truy cập trực tiếp vào mọi đường dẫn lưu trữ, hệ thống sẽ khó bảo vệ được dữ liệu riêng tư. Vì vậy, một kỹ thuật phổ biến là dùng signed URL với thời hạn ngắn để cấp quyền truy cập tạm thời cho đúng tài nguyên và đúng thời điểm cần thiết.

Signed URL tạo ra một liên kết truy cập có giới hạn về thời gian và thường gắn với một đối tượng tệp cụ thể. Cơ chế này đặc biệt hữu ích với các trường hợp như xem trước CV, tải tệp gốc phục vụ OCR, truy cập asset export hoặc mở tài liệu cho editor. Thay vì biến storage thành vùng công khai, signed URL cho phép lưu trữ tệp trên cloud storage nhưng vẫn duy trì kiểm soát truy cập chặt chẽ.

Trong TalentFlow, Supabase Storage được dùng cho nhiều bucket như `cv-originals`, `cv-previews`, `cv-assets`, `cv-exports`, `cv_uploads`, và mã nguồn web thường tạo signed URL từ admin client khi cần truy cập tệp. Điều này xuất hiện rõ trong các module `cv-imports`, `editable-cvs` và `editor/metadata`. Về mặt lý thuyết, đây là lựa chọn phù hợp cho hệ thống có dữ liệu CV và tài liệu nhạy cảm, vì nó tách biệt bài toán lưu trữ tệp với bài toán cấp quyền truy cập ngắn hạn.

### 2.5.5. Phân quyền theo vai trò ứng viên và nhà tuyển dụng

Phân quyền theo vai trò là phương pháp tổ chức quyền truy cập dựa trên chức năng nghiệp vụ của người dùng trong hệ thống. Trong nền tảng tuyển dụng, ít nhất cần phân biệt giữa ứng viên và nhà tuyển dụng vì hai nhóm này thao tác trên các tập dữ liệu khác nhau, có nhu cầu khác nhau và chịu các ràng buộc bảo mật khác nhau. Ứng viên chủ yếu quản lý hồ sơ, CV và đơn ứng tuyển của bản thân; nhà tuyển dụng quản lý tin tuyển dụng, pipeline hồ sơ và tìm kiếm nguồn ứng viên.

Về lý thuyết, phân quyền theo vai trò giúp hệ thống giảm nhầm lẫn trong điều hướng, thu hẹp phạm vi truy cập và tạo ra các không gian làm việc phù hợp với từng chủ thể. Khi kết hợp với RLS và xác thực, vai trò còn là đầu vào cho các chính sách kiểm soát ở tầng dữ liệu, bảo đảm rằng người dùng không chỉ được đưa đến đúng giao diện mà còn chỉ nhìn thấy đúng dữ liệu thuộc phạm vi của mình.

Trong TalentFlow, vai trò được chuẩn hóa quanh `candidate` và `hr`, dù một số luồng giao diện sử dụng nhãn `employer` để biểu diễn vai trò tuyển dụng ở bước chọn ban đầu. Điều này liên hệ trực tiếp với việc điều hướng vào candidate workspace hoặc recruiter workspace, và với các API chỉ dành cho phía tuyển dụng như tìm kiếm hồ sơ công khai hoặc quản lý pipeline. Về mặt lý thuyết, đây là kiến trúc phân quyền đúng với bài toán của hệ thống, vì nó bám sát hai chủ thể trung tâm của quy trình tuyển dụng.

## 2.6. Công nghệ sử dụng trong hệ thống

### 2.6.1. Nhóm công nghệ frontend

#### 2.6.1.1. Next.js 16, React 19, TypeScript

Next.js 16 là framework web được dùng làm nền tảng cho toàn bộ ứng dụng TalentFlow, trong khi React 19 là thư viện giao diện cốt lõi và TypeScript là ngôn ngữ được sử dụng cho phần lớn mã nguồn phía web. Bộ ba này tạo thành hạ tầng chính cho việc xây dựng cổng tuyển dụng công khai, candidate workspace, recruiter workspace và các component tương tác với các Route Handlers.

Trong hệ thống, Next.js không chỉ đóng vai trò frontend rendering mà còn cung cấp App Router, khả năng server-side rendering và lớp Route Handlers cho backend web. React 19 đảm nhiệm mô hình component, trạng thái giao diện và các tương tác động của người dùng. TypeScript giúp đồng bộ kiểu dữ liệu giữa giao diện, API và các module xử lý nghiệp vụ như việc làm, hồ sơ ứng viên, recommendation hoặc CV import. Với tính chất nhiều luồng nghiệp vụ và nhiều loại dữ liệu như TalentFlow, việc dùng TypeScript có ý nghĩa rõ ràng trong giảm sai lệch kiểu dữ liệu giữa các lớp của ứng dụng.

#### 2.6.1.2. Tailwind CSS, Framer Motion, Lucide React

Tailwind CSS là công cụ tiện ích để xây dựng giao diện theo hướng utility-first. Trong TalentFlow, Tailwind CSS được dùng để tổ chức kiểu dáng cho các trang công khai, dashboard, form, card dữ liệu và các thành phần tương tác khác. Việc sử dụng Tailwind trong codebase giúp chuẩn hóa cách viết style và giữ cho phần giao diện bám sát cấu trúc component của React.

Framer Motion là thư viện hỗ trợ animation và chuyển động trong giao diện. Dấu vết trong `package.json` cho thấy hệ thống có chuẩn bị lớp công nghệ này cho những tương tác động như chuyển trạng thái màn hình, hiển thị các card hoặc điều hướng trong workspace. Ở đây cần hiểu Framer Motion là công nghệ hỗ trợ trải nghiệm giao diện, không phải thành phần cốt lõi của bài toán tuyển dụng.

Lucide React là thư viện icon được dùng cho giao diện. Vai trò của thư viện này nằm ở việc cung cấp tập biểu tượng nhất quán cho điều hướng, thao tác dashboard, bảng dữ liệu, notification và các nút hành động khác. Trong bối cảnh TalentFlow, Lucide React phục vụ chủ yếu cho tính trực quan và tính nhất quán của lớp frontend.

### 2.6.2. Nhóm công nghệ backend web

#### 2.6.2.1. Next.js Route Handlers

Next.js Route Handlers là cơ chế để xây dựng các API endpoint trực tiếp trong cấu trúc `src/app/api`. Trong TalentFlow, chúng được dùng rộng rãi cho các tác vụ như lấy danh sách việc làm, quản lý công ty, nộp đơn ứng tuyển, recommendation, notification, CV Builder, editable CV, metadata của document editor, callback từ ONLYOFFICE và proxy OCR. Nhờ đó, lớp backend web của hệ thống có thể nằm cùng codebase với frontend mà vẫn giữ được sự tách biệt hợp lý về module.

Vai trò của Route Handlers trong TalentFlow là cầu nối giữa giao diện React và các lớp dữ liệu hoặc dịch vụ bên ngoài. Chúng đảm nhiệm xác thực, kiểm tra input, gọi thư viện nghiệp vụ ở `src/lib`, thao tác với Supabase và giao tiếp với AI service khi cần. Đây là công nghệ phù hợp với mô hình full-stack của hệ thống, vì nó giúp giảm độ phân mảnh khi triển khai nhiều API nhỏ gắn chặt với ngữ cảnh nghiệp vụ tuyển dụng.

#### 2.6.2.2. Supabase SSR Client và Supabase Admin Client

Supabase SSR Client là client được dùng trong web app để làm việc với Supabase trong ngữ cảnh server-side rendering hoặc Route Handlers có gắn phiên người dùng. Trong TalentFlow, client này xuất hiện trong các utility `server.ts`, `client.ts` và nhiều route cần truy xuất session, lấy `auth.getUser()` hoặc thực hiện truy vấn mang ngữ cảnh xác thực của người dùng hiện tại.

Bên cạnh đó, hệ thống còn sử dụng Supabase Admin Client với service role key cho các tác vụ phía server cần quyền cao hơn, chẳng hạn tạo signed URL cho tệp riêng tư, thao tác trên storage hoặc thực hiện một số xử lý hệ thống không thể dựa hoàn toàn vào quyền của người dùng hiện tại. Trong TalentFlow, admin client xuất hiện ở các module như `src/utils/supabase/admin.ts`, `cv-imports`, `editable-cvs` và `editor`. Mã nguồn phía notification và dashboard cũng cho thấy Supabase được dùng ở một số luồng cập nhật realtime, đặc biệt với thông báo và dữ liệu workspace. Về mặt sử dụng, đây là sự kết hợp hợp lý giữa client mang ngữ cảnh người dùng, client mang ngữ cảnh hệ thống và các khả năng realtime của nền tảng.

### 2.6.3. Nhóm công nghệ dữ liệu và lưu trữ

#### 2.6.3.1. Supabase PostgreSQL

Supabase PostgreSQL là lớp dữ liệu quan hệ chính của TalentFlow. Toàn bộ các migration nghiệp vụ trong thư mục `supabase/migrations` đều cho thấy hệ thống dựa vào PostgreSQL để lưu các thực thể như việc làm, doanh nghiệp, hồ sơ ứng viên, đơn ứng tuyển, sự kiện ATS, recommendation, notifications và các bảng phục vụ pipeline CV. Đây là kho dữ liệu trung tâm để duy trì quan hệ giữa các thành phần nghiệp vụ của hệ thống.

Vai trò của Supabase PostgreSQL không chỉ là nơi lưu dữ liệu cuối cùng mà còn là nơi thực thi các ràng buộc, enum, check constraint, policy và dấu vết versioning. Nhờ đó, TalentFlow có thể quản lý được cả dữ liệu vận hành tuyển dụng lẫn dữ liệu trạng thái của pipeline AI/OCR trong cùng một nền dữ liệu nhất quán.

#### 2.6.3.2. Supabase Storage

Supabase Storage là lớp lưu trữ tệp chính của TalentFlow. Hệ thống dùng storage để quản lý các loại tệp như CV tải lên, tài liệu gốc phục vụ import, preview, asset phục vụ editor, file export và một số artifact liên quan. Các bucket xuất hiện trong source và migration cho thấy storage được dùng xuyên suốt nhiều module, đặc biệt ở khối CV import và editable CV.

Trong hệ thống, Supabase Storage thường đi kèm với signed URL để cho phép truy cập có thời hạn tới tài nguyên cụ thể. Cách dùng này phù hợp với bản chất dữ liệu của TalentFlow, vì phần lớn tài liệu tuyển dụng là dữ liệu nhạy cảm và không nên được mở công khai theo đường dẫn tĩnh.

#### 2.6.3.3. Cloudinary

Cloudinary xuất hiện trong TalentFlow như một công nghệ hỗ trợ upload ảnh thông qua `src/lib/cloudinary.ts` và các route như upload ảnh chung hoặc avatar hồ sơ ứng viên. Từ bằng chứng hiện có, Cloudinary không phải lớp lưu trữ lõi cho toàn bộ tài liệu CV và quy trình import, mà thiên về phục vụ các luồng upload ảnh độc lập trên web app.

Vì vậy, trong hệ thống này, Cloudinary nên được hiểu là công cụ bổ trợ cho media hình ảnh, còn phần lưu trữ tài liệu tuyển dụng, CV và artifact xử lý vẫn chủ yếu dựa vào Supabase Storage. Cách kết hợp này cho phép tận dụng sự thuận tiện của Cloudinary ở các trường hợp ảnh, đồng thời vẫn duy trì một storage chính nhất quán cho khối dữ liệu tài liệu của hệ thống.

### 2.6.4. Nhóm công nghệ AI và xử lý tài liệu

#### 2.6.4.1. FastAPI

FastAPI là framework backend Python được dùng để xây dựng `ai-service` của TalentFlow. Dịch vụ này cung cấp các endpoint cho kiểm tra trạng thái, parse CV, upload và preview tài liệu, OCR, matching và xử lý các job nội bộ. Việc dùng FastAPI cho phép khối AI/service tài liệu hoạt động độc lập với web app Next.js nhưng vẫn giao tiếp qua HTTP tương đối đơn giản.

Trong TalentFlow, FastAPI phù hợp vì khối xử lý tài liệu cần làm việc với các thư viện Python như OCR, xử lý PDF, đọc DOCX và Celery. Đây là lựa chọn thực dụng, giúp tách các phụ thuộc nặng và đặc thù của bài toán tài liệu ra khỏi môi trường JavaScript/TypeScript của web app.

#### 2.6.4.2. Redis và Celery worker

Redis và Celery được dùng cho xử lý nền trong `ai-service`. Redis đóng vai trò broker và backend kết quả, còn Celery worker thực thi các tác vụ bất đồng bộ của hàng đợi `cv-documents`. Sự hiện diện của hai thành phần này được xác nhận rõ trong `docker-compose.yml`, `celery_app.py` và các task xử lý tài liệu.

Trong TalentFlow, vai trò chính của Redis và Celery là tiếp nhận các tác vụ import CV vốn mất thời gian, tránh để request web phải chờ cho đến khi toàn bộ pipeline OCR và parsing hoàn tất. Cách tổ chức này cũng tạo điều kiện để theo dõi nhiều giai đoạn xử lý của một tài liệu và hỗ trợ retry khi cần.

#### 2.6.4.3. Google Vision OCR

Google Vision OCR là công nghệ OCR được dùng trong pipeline lõi của TalentFlow cho PDF và ảnh. Mã nguồn `ai-service/services/google_vision_ocr.py` cho thấy hệ thống sử dụng `DOCUMENT_TEXT_DETECTION` để lấy nội dung văn bản, block, bounding box và tọa độ chuẩn hóa. Đây là yếu tố kỹ thuật quan trọng, vì khối review và ánh xạ sang editable CV phụ thuộc mạnh vào khả năng giữ lại thông tin bố cục.

Trong hệ thống này, Google Vision OCR không được dùng để “hiểu toàn bộ CV” một cách hoàn toàn tự động, mà chủ yếu đảm nhiệm lớp nhận dạng văn bản và vị trí. Kết quả từ OCR sau đó còn đi qua các bước layout, parsing và review. Cách dùng như vậy phù hợp với tinh thần human-in-the-loop mà pipeline của TalentFlow đang thể hiện.

#### 2.6.4.4. Ollama

Ollama là nền tảng chạy mô hình ngôn ngữ cục bộ và là công nghệ AI xuất hiện rõ trong các luồng parsing hoặc recommendation của TalentFlow. `ai-service/main.py`, `services/job_matcher.py` và `src/lib/gemini.ts` cho thấy hệ thống dùng Ollama để phân tích hoặc xếp hạng trên cơ sở dữ liệu hồ sơ và mô tả công việc. Trong recommendation, dù tên hàm còn giữ dấu vết “Gemini”, lớp hiện thực đang gọi Ollama để sinh kết quả JSON và xếp hạng job.

Vai trò của Ollama trong TalentFlow chủ yếu là chuẩn hóa, mapping ngữ nghĩa và hỗ trợ chấm mức độ phù hợp ở một số luồng. Đây là cách dùng phù hợp với bài toán của hệ thống, vì Ollama có thể hoạt động như lớp AI phụ trợ tại chỗ mà không biến toàn bộ recommendation hay CV pipeline thành mô hình phụ thuộc hoàn toàn vào dịch vụ bên ngoài.

#### 2.6.4.5. Gemini / Groq

Gemini và Groq có dấu vết rõ trong route `src/app/api/ai/optimize-content/route.ts`, nơi hệ thống gọi các provider này để tối ưu nội dung văn bản ở một số luồng hỗ trợ. Từ mã nguồn hiện tại, chúng được dùng theo cơ chế chọn provider, timeout, retry và fallback để sinh gợi ý văn bản. Đây là lớp AI bổ trợ phía web app, không phải pipeline lõi của import CV.

Vì vậy, trong TalentFlow, Gemini và Groq nên được mô tả là các dịch vụ AI phụ trợ phục vụ tối ưu nội dung hoặc đề xuất văn bản ở một số tình huống cụ thể. Chúng không thay thế vai trò của Google Vision OCR trong OCR và cũng không phải công nghệ trung tâm duy nhất cho recommendation, nơi lớp chấm điểm theo luật và Ollama vẫn giữ vị trí quan trọng hơn trong source code hiện tại.

#### 2.6.4.6. PaddleOCR proxy endpoint

TalentFlow có nhóm route `src/app/api/paddle-ocr` hoạt động như proxy endpoint tới một dịch vụ OCR bên ngoài. Các route này có cơ chế kiểm tra xác thực người dùng, quản lý timeout, truyền token máy chủ và hỗ trợ cả chế độ đồng bộ lẫn bất đồng bộ. Điều đó cho thấy hệ thống có chuẩn bị một lớp tích hợp OCR theo kiểu proxy thay vì chỉ phụ thuộc vào đúng một nguồn OCR duy nhất.

Tuy nhiên, dựa trên mã nguồn hiện tại, PaddleOCR proxy nên được xem là lớp tích hợp mở rộng hoặc thử nghiệm có kiểm soát, không phải trục lõi của pipeline CV/OCR đã được mô hình hóa rõ bằng `cv_documents`, Google Vision OCR và các bảng artifact liên quan. Cách mô tả này phản ánh đúng vai trò kỹ thuật của thành phần trong repo.

### 2.6.5. Nhóm công nghệ tài liệu và xuất bản CV

#### 2.6.5.1. ONLYOFFICE

ONLYOFFICE là công nghệ được TalentFlow dùng cho biên tập tài liệu Word trong khối source document editor. Bằng chứng thể hiện ở `WordEditor.tsx`, `editor/metadata.ts` và route callback `src/app/api/onlyoffice/callback/route.ts`. Hệ thống tạo metadata cho loại tài liệu `word`, cung cấp cấu hình editor và nhận file chỉnh sửa quay về để lưu thành phiên bản mới.

Vai trò của ONLYOFFICE trong TalentFlow là cho phép thao tác trực tiếp trên tài liệu Word nguồn thay vì chỉ xem hoặc tải về. Điều này đặc biệt quan trọng với bài toán CV import, vì tài liệu DOCX có thể cần chỉnh sửa trước hoặc sau khi parse để đồng bộ với editable CV và quyết định có nên reparse lại hay không.

#### 2.6.5.2. Apryse WebViewer

Apryse WebViewer xuất hiện trong TalentFlow qua gói `@pdftron/webviewer` và component `PdfEditor.tsx`. Trong metadata editor, hệ thống xác định `pdf` là loại tài liệu được gắn với vendor `apryse`, đồng thời cung cấp license key và đường dẫn webviewer tương ứng. Điều đó cho thấy Apryse được dùng như lớp hiển thị và thao tác với tài liệu PDF trong source document editor.

Đối với TalentFlow, PDF là định dạng rất quan trọng vì phần lớn CV từ bên ngoài thường ở dạng này. Việc sử dụng Apryse WebViewer giúp hệ thống có khả năng làm việc với PDF ở mức editor/viewer chuyên biệt hơn so với preview đơn giản. Điều này hỗ trợ trực tiếp cho mục tiêu biên tập tài liệu nguồn và quản lý versioning tài liệu.

#### 2.6.5.3. React PDF

React PDF, cụ thể là `@react-pdf/renderer` và thư viện `react-pdf`, được dùng trong TalentFlow cho các nhu cầu hiển thị hoặc xuất bản CV ở dạng PDF. Mã nguồn `src/lib/resume-pdf.tsx` và các module export liên quan cho thấy hệ thống dựng nội dung CV từ dữ liệu block có cấu trúc để sinh file PDF. Đây là mảnh ghép quan trọng của khối CV Builder và editable CV.

Vai trò của React PDF trong hệ thống là chuyển dữ liệu resume hoặc editable CV sang sản phẩm tài liệu đầu ra có thể sử dụng ngay. Cách dùng này cho thấy TalentFlow không chỉ nhập và chuẩn hóa CV, mà còn hỗ trợ chu trình ngược lại là xuất bản hoặc tái tạo CV từ dữ liệu đã được cấu trúc hóa.

### 2.6.6. Nhóm công nghệ triển khai và kiểm thử

Ngoài các dịch vụ hạ tầng chạy cục bộ, repo hiện tại còn có nhiều dấu vết kiểm thử bằng TypeScript và Python, các script xác minh luồng giao diện, quyền sở hữu CV, đồng bộ editor và cả các script đo hiệu năng. Điều này cho thấy nhóm công nghệ triển khai và kiểm thử trong TalentFlow không chỉ dừng ở mức chạy ứng dụng, mà còn bao gồm các công cụ hỗ trợ kiểm tra hành vi của những module quan trọng.

#### 2.6.6.1. Docker Compose

Docker Compose được dùng để định nghĩa môi trường chạy cục bộ cho nhiều dịch vụ liên quan của TalentFlow. Tệp `docker-compose.yml` cho thấy hệ thống được tổ chức với các service như `frontend`, `ai-service`, `celery-worker`, `redis`, `mongodb` và `mailpit`. Điều này giúp mô phỏng tương đối đầy đủ môi trường tích hợp giữa web app, AI service, hàng đợi và các công cụ hỗ trợ kiểm thử.

Vai trò của Docker Compose trong TalentFlow chủ yếu nằm ở việc đồng bộ môi trường phát triển và thử nghiệm. Với một hệ thống có nhiều thành phần dị thể như web JavaScript/TypeScript, AI service Python, Redis và công cụ email testing, Compose là công cụ phù hợp để giảm chi phí khởi tạo môi trường và giới hạn sai lệch cấu hình giữa các dịch vụ.

#### 2.6.6.2. Mailpit

Mailpit là công cụ bắt và hiển thị email trong môi trường phát triển hoặc kiểm thử. Trong `docker-compose.yml`, Mailpit được cấu hình với SMTP port và giao diện web, đồng thời các biến môi trường của `frontend` trỏ tới service này khi ở chế độ email testing. Điều đó cho thấy hệ thống có cơ chế thử nghiệm các luồng email mà không phải gửi ra ngoài thực tế.

Trong TalentFlow, Mailpit phù hợp với các nghiệp vụ như xác nhận, thông báo hoặc email hỗ trợ quy trình tuyển dụng. Nó giúp kiểm tra template, định tuyến và hành vi gửi thư trong giai đoạn phát triển, đồng thời tách biệt với các cấu hình SMTP thực tế.

#### 2.6.6.3. MongoDB trong module email testing

MongoDB xuất hiện trong `docker-compose.yml` và `package.json`, đồng thời liên quan tới module email testing trong source code. Từ bằng chứng hiện có, MongoDB không giữ vai trò kho dữ liệu nghiệp vụ chính của TalentFlow, vì dữ liệu tuyển dụng và CV vẫn đặt trên Supabase PostgreSQL. Thay vào đó, MongoDB chủ yếu phục vụ các thành phần hỗ trợ email testing hoặc môi trường thử nghiệm.

Việc dùng MongoDB ở phạm vi này cho thấy hệ thống tách biệt khá rõ giữa dữ liệu nghiệp vụ lõi và dữ liệu phụ trợ cho thử nghiệm email. Đây là một cách tổ chức hợp lý, vì nó tránh kéo các yêu cầu test mail vào cùng mô hình dữ liệu quan hệ của phần nghiệp vụ chính.

## 2.7. Lý do lựa chọn công nghệ

### 2.7.1. Lý do chọn Next.js cho hệ thống web full-stack

Next.js phù hợp với TalentFlow vì hệ thống cần đồng thời hỗ trợ cổng việc làm công khai, các workspace theo vai trò và nhiều API web gắn trực tiếp với giao diện. Việc dùng App Router và Route Handlers giúp nhóm phát triển tổ chức giao diện, điều hướng, xác thực và backend web trong cùng một codebase, qua đó giảm độ phân tán khi hiện thực các luồng như xem việc làm, nộp đơn, quản lý hồ sơ hoặc gọi pipeline xử lý CV.

Đối với một nền tảng tuyển dụng, nhiều trang cần tận dụng server-side rendering hoặc render lai giữa server và client để vừa hỗ trợ SEO ở lớp công khai, vừa xử lý tốt các tương tác có trạng thái ở dashboard. Next.js đáp ứng được yêu cầu đó mà không buộc hệ thống phải chia tách sớm thành nhiều dự án nhỏ. Vì vậy, lựa chọn này phù hợp với mục tiêu xây dựng ứng dụng web full-stack có nhiều route nghiệp vụ nhưng vẫn giữ tính thống nhất về kỹ thuật.

### 2.7.2. Lý do chọn Supabase cho Auth, Database và Storage

Supabase phù hợp với TalentFlow vì bài toán của hệ thống đòi hỏi ba yếu tố đi cùng nhau: xác thực người dùng, cơ sở dữ liệu quan hệ và lưu trữ tệp nhạy cảm. Thay vì ghép nhiều dịch vụ rời rạc ngay từ đầu, Supabase cung cấp một cụm công nghệ tích hợp gồm PostgreSQL, Auth, Storage, Realtime và RLS. Điều này giúp hệ thống dễ triển khai các luồng có ràng buộc bảo mật cao như hồ sơ ứng viên, CV riêng tư, signed URL, notifications và chia sẻ dữ liệu theo vai trò.

Ngoài ra, RLS của Supabase rất phù hợp với việc kiểm soát truy cập theo từng bản ghi dữ liệu, vốn là yêu cầu trọng tâm của nền tảng tuyển dụng. Khả năng dùng cùng một nhà cung cấp cho session, data và storage cũng làm giảm chi phí kết nối giữa các phần. Với TalentFlow, đây là lựa chọn thực dụng và tương xứng với mức độ phức tạp của bài toán hiện tại.

### 2.7.3. Lý do tách AI service khỏi web app

Khối xử lý CV của TalentFlow bao gồm OCR, đọc tài liệu, phân tích bố cục, mapping dữ liệu có cấu trúc, xử lý preview và một số tác vụ matching. Đây là các công việc có phụ thuộc kỹ thuật và đặc tính vận hành khác đáng kể so với web app phục vụ người dùng cuối. Nếu đặt toàn bộ chúng trong cùng tiến trình Next.js, hệ thống sẽ khó tối ưu triển khai, tăng độ nặng của môi trường runtime web và làm mờ ranh giới trách nhiệm giữa các lớp.

Việc tách `ai-service` thành một microservice FastAPI giúp cô lập các thư viện Python, tách logic xử lý nặng ra khỏi request web và cho phép khối AI/tài liệu mở rộng độc lập hơn. Với TalentFlow, lý do chọn hướng này gắn trực tiếp với bài toán import CV từ PDF, DOCX và ảnh, cũng như nhu cầu quản lý pipeline nhiều giai đoạn. Do đó, đây không chỉ là lựa chọn kiến trúc mang tính kỹ thuật thuần túy, mà là giải pháp phù hợp với đặc thù nghiệp vụ của hệ thống.

### 2.7.4. Lý do dùng Redis/Celery cho import CV bất đồng bộ

Import CV là một luồng có thể kéo dài qua nhiều bước như lưu tệp, OCR, phân tích bố cục, chuẩn hóa dữ liệu, lưu artifact và tạo editable CV. Nếu các bước này được chạy đồng bộ trong request web, người dùng sẽ phải chờ lâu và hệ thống khó xử lý ổn định khi số lượng tài liệu tăng. Redis và Celery được chọn vì đây là tổ hợp quen thuộc cho hàng đợi tác vụ nền trong môi trường Python, phù hợp với microservice xử lý tài liệu của TalentFlow.

Với Redis/Celery, hệ thống có thể enqueue tài liệu, theo dõi trạng thái theo từng giai đoạn và tách việc xử lý nặng khỏi vòng đời request/response của web app. Đây là lựa chọn đặc biệt phù hợp cho TalentFlow vì pipeline CV có nhiều trạng thái trung gian và không nên được xem là một thao tác tức thời. Nói cách khác, công nghệ này được chọn để phục vụ đúng bản chất bất đồng bộ của bài toán import CV.

### 2.7.5. Lý do dùng ONLYOFFICE / Apryse cho chỉnh sửa tài liệu nguồn

TalentFlow không chỉ dừng ở việc nhận CV và chuyển sang editable CV, mà còn có nhu cầu làm việc với chính tài liệu nguồn sau khi upload. PDF và DOCX là hai định dạng xuất hiện phổ biến trong hồ sơ ứng viên, nhưng mỗi loại lại cần công cụ thao tác chuyên biệt. ONLYOFFICE phù hợp với tài liệu Word vì hỗ trợ môi trường editor cho DOCX, còn Apryse WebViewer phù hợp với PDF vì cung cấp năng lực làm việc với tài liệu PDF ở mức chuyên sâu hơn preview thông thường.

Lý do lựa chọn các công nghệ này gắn trực tiếp với bài toán versioning tài liệu trong TalentFlow. Khi người dùng chỉnh sửa tài liệu nguồn, hệ thống cần lưu phiên bản mới, phát hiện khả năng lệch với kết quả parse cũ và hỗ trợ reparse khi cần. ONLYOFFICE và Apryse vì vậy không chỉ là công cụ hiển thị tài liệu, mà là nền tảng kỹ thuật để hiện thực mô hình biên tập tài liệu nguồn có kiểm soát phiên bản trong hệ thống.

## 2.8. Kết luận chương

Chương này đã trình bày các cơ sở lý thuyết liên quan trực tiếp đến bài toán của TalentFlow, bao gồm nền tảng tuyển dụng trực tuyến, quản lý và chuẩn hóa CV, cơ chế ghép nối ứng viên với việc làm, kiến trúc web hiện đại, cùng các nguyên lý về dữ liệu, xác thực và phân quyền. Trên cơ sở đó, chương cũng đã mô tả các công nghệ đang được sử dụng trong repo hiện tại như Next.js, React, TypeScript, Supabase, FastAPI, Redis, Celery, Google Vision OCR, Ollama, ONLYOFFICE, Apryse WebViewer và React PDF, đồng thời phân tích lý do lựa chọn chúng trong ngữ cảnh bài toán tuyển dụng và xử lý CV.

Những nội dung này tạo nền tảng để chuyển sang Chương 3, nơi hệ thống TalentFlow sẽ được phân tích và thiết kế ở mức cấu trúc tổng thể, chức năng và dữ liệu. Nói cách khác, Chương 2 đóng vai trò nối kết giữa cơ sở lý thuyết của bài toán và các quyết định kỹ thuật cụ thể đã được áp dụng trong quá trình xây dựng hệ thống.
