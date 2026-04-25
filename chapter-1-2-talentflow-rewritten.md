# CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI

## 1.1. Bối cảnh và tính cấp thiết của đề tài

### 1.1.1. Xu hướng số hóa hoạt động tuyển dụng và tìm việc trên nền tảng web

Hiện nay, phần lớn hoạt động tuyển dụng và tìm việc đã chuyển dần lên môi trường web. Ứng viên có xu hướng tìm việc, xem thông tin công ty và nộp hồ sơ trực tuyến thay vì làm thủ công như trước. Ở chiều ngược lại, doanh nghiệp cũng cần một hệ thống để đăng tin, nhận hồ sơ và theo dõi ứng viên thuận tiện hơn.

Thực tế này làm cho các nền tảng tuyển dụng không còn chỉ là nơi đăng tin tuyển dụng. Hệ thống còn phải hỗ trợ nhiều việc khác như quản lý tài khoản, lưu hồ sơ ứng viên, theo dõi đơn ứng tuyển, gửi thông báo và hỗ trợ xử lý dữ liệu CV. Từ cấu trúc hiện tại của TalentFlow có thể thấy hệ thống được xây dựng theo đúng hướng đó, gồm phần công khai cho việc làm và công ty, phần dành cho ứng viên và phần dành cho nhà tuyển dụng.

### 1.1.2. Nhu cầu chuẩn hóa hồ sơ ứng viên và tối ưu trải nghiệm ứng tuyển

Một khó khăn phổ biến là hồ sơ ứng viên thường không đồng nhất. Có người tạo hồ sơ trực tiếp trên hệ thống, có người dùng CV tự thiết kế từ trước, có người nộp file PDF, DOCX hoặc ảnh. Nếu hệ thống chỉ lưu file đính kèm thì dữ liệu rất khó chỉnh sửa, khó tìm kiếm và khó dùng lại cho các lần ứng tuyển sau.

Vì vậy, việc chuẩn hóa hồ sơ là cần thiết. Khi thông tin ứng viên được đưa về dạng có cấu trúc hơn, người dùng có thể tái sử dụng hồ sơ thuận tiện hơn, còn hệ thống cũng dễ hỗ trợ các chức năng như tìm kiếm, gợi ý việc làm hoặc so khớp hồ sơ với tin tuyển dụng. Đây cũng là lý do TalentFlow không chỉ có phần hồ sơ ứng viên mà còn có CV Builder, CV import và editable CV.

### 1.1.3. Nhu cầu hỗ trợ nhà tuyển dụng trong quản lý pipeline tuyển dụng

Với nhà tuyển dụng, vấn đề không chỉ là nhận được nhiều CV mà còn là quản lý được quá trình xử lý hồ sơ. Khi số lượng ứng viên tăng lên, nếu chỉ lưu danh sách hồ sơ đơn thuần thì rất khó theo dõi ai đang ở giai đoạn nào, đã được xem chưa, đã phỏng vấn chưa hay đã bị từ chối chưa.

Do đó, hệ thống cần có cơ chế quản lý pipeline tuyển dụng rõ ràng. TalentFlow thể hiện điều này qua phần applications, application events, dashboard phía recruiter và các trạng thái xử lý hồ sơ theo kiểu ATS. Cách làm này giúp nhà tuyển dụng theo dõi tiến trình tuyển dụng có hệ thống hơn, đồng thời hỗ trợ nhìn lại lịch sử xử lý của từng đơn ứng tuyển.

### 1.1.4. Nhu cầu ứng dụng AI trong xử lý và tái sử dụng dữ liệu CV

CV là loại dữ liệu có cùng mục đích sử dụng nhưng cách trình bày rất khác nhau. Cùng là thông tin cá nhân, kỹ năng, học vấn và kinh nghiệm, nhưng mỗi người lại trình bày theo một bố cục khác nhau. Vì vậy, nếu chỉ lưu CV như một file thì hệ thống khó khai thác sâu dữ liệu bên trong.

Trong bài toán này, AI và OCR có thể hỗ trợ đọc nội dung từ PDF, DOCX hoặc ảnh, sau đó chuyển dần sang dữ liệu có thể chỉnh sửa và dùng lại. Tuy nhiên, kết quả tự động không phải lúc nào cũng chính xác tuyệt đối. Vì vậy, cách tiếp cận hợp lý là để hệ thống hỗ trợ phân tích trước, sau đó cho phép người dùng review và chỉnh sửa lại. Đây cũng là hướng mà TalentFlow đang áp dụng trong khối CV import và editable CV.

## 1.2. Phát biểu bài toán

### 1.2.1. Bài toán kết nối ứng viên với việc làm và doanh nghiệp

Bài toán đầu tiên của đề tài là tạo ra một hệ thống giúp kết nối ứng viên với việc làm và doanh nghiệp trên cùng một nền tảng. Ứng viên cần một nơi để xem danh sách việc làm, tìm hiểu công ty, xem chi tiết tin tuyển dụng và nộp hồ sơ. Doanh nghiệp cũng cần một nơi để đăng tin và tiếp cận ứng viên phù hợp.

Trong TalentFlow, bài toán này được giải quyết thông qua cổng việc làm công khai, trang công ty, chi tiết việc làm và cơ chế nộp đơn trực tiếp. Như vậy, hệ thống đóng vai trò là cầu nối giữa nhu cầu tuyển người của doanh nghiệp và nhu cầu tìm việc của ứng viên.

### 1.2.2. Bài toán quản lý hồ sơ ứng viên và CV trên cùng một hệ thống

Một vấn đề thường gặp là hồ sơ ứng viên và CV tồn tại rời rạc. Có nơi chỉ lưu profile, có nơi chỉ nhận file CV, có nơi lại tách phần tạo CV ra riêng. Điều này làm dữ liệu bị phân tán và khó sử dụng lại.

Đề tài đặt ra bài toán gom các phần này về một hệ thống chung. Trong TalentFlow, ứng viên có hồ sơ cá nhân, có thể tạo CV từ builder, import CV từ file có sẵn và lưu lại bản editable để tiếp tục chỉnh sửa. Cách tổ chức này giúp dữ liệu hồ sơ được thống nhất hơn và thuận tiện hơn cho quá trình ứng tuyển.

### 1.2.3. Bài toán theo dõi vòng đời đơn ứng tuyển theo mô hình ATS

Sau khi ứng viên nộp hồ sơ, bài toán không dừng ở việc lưu đơn ứng tuyển. Hệ thống còn phải theo dõi được đơn đó đang ở bước nào trong quy trình tuyển dụng. Đây là phần quan trọng nếu muốn hỗ trợ phía tuyển dụng làm việc có tổ chức.

TalentFlow giải quyết bài toán này bằng cách lưu đơn ứng tuyển, trạng thái hiện tại và các sự kiện phát sinh trong quá trình xử lý. Nhờ đó, recruiter có thể theo dõi tiến trình hồ sơ theo dạng pipeline thay vì xử lý rời rạc từng hồ sơ.

### 1.2.4. Bài toán nhập CV từ tài liệu gốc và chuyển đổi sang dữ liệu có thể chỉnh sửa

Nhiều ứng viên đã có sẵn CV ở dạng PDF, DOCX hoặc ảnh. Nếu hệ thống chỉ cho phép tải file lên thì dữ liệu vẫn nằm ở dạng tĩnh và khó chỉnh sửa về sau. Vì vậy, đề tài đặt ra bài toán đọc dữ liệu từ tài liệu gốc, chuyển thành dữ liệu có cấu trúc hơn và đưa vào dạng có thể chỉnh sửa.

Trong TalentFlow, luồng này gồm các bước upload file, OCR hoặc trích xuất nội dung, phân tích bố cục, parse dữ liệu, review kết quả và tạo editable CV. Đây là một phần kỹ thuật quan trọng của hệ thống vì nó giúp kết nối giữa file CV gốc và dữ liệu CV có thể tiếp tục sử dụng trong hệ thống.

## 1.3. Giới thiệu đề tài và định hướng xây dựng hệ thống

### 1.3.1. Giới thiệu hệ thống TalentFlow

TalentFlow là hệ thống tuyển dụng trực tuyến được xây dựng theo hướng tích hợp nhiều chức năng trên cùng một nền tảng web. Hệ thống có cổng việc làm công khai, danh sách công ty, cơ chế đăng ký và phân vai, workspace cho ứng viên, workspace cho nhà tuyển dụng, hồ sơ ứng viên, CV Builder, CV import, theo dõi đơn ứng tuyển, pipeline ATS, notification và một số luồng gợi ý việc làm.

Điểm đáng chú ý của TalentFlow là dữ liệu hồ sơ ứng viên và CV được đặt ở vị trí trung tâm. Thay vì chỉ nhận CV như một file đính kèm, hệ thống cố gắng tổ chức thông tin hồ sơ theo nhiều lớp để có thể chỉnh sửa, dùng lại và liên kết với các luồng ứng tuyển.

### 1.3.2. Phạm vi bài toán mà hệ thống tập trung giải quyết

Trong phạm vi đồ án này, TalentFlow tập trung vào các bài toán chính của tuyển dụng trực tuyến. Cụ thể là công khai việc làm và công ty, quản lý hồ sơ ứng viên, quản lý CV, theo dõi đơn ứng tuyển, hỗ trợ pipeline ATS và xử lý CV import bằng AI/OCR.

Hệ thống không hướng đến việc giải quyết toàn bộ bài toán quản trị nhân sự sau tuyển dụng. Những phần như payroll, timesheet hay HRIS hoàn chỉnh không phải trọng tâm của repo hiện tại. Vì vậy, đề tài tập trung đúng vào lõi là tuyển dụng và dữ liệu CV.

### 1.3.3. Giá trị thực tiễn đối với ứng viên và nhà tuyển dụng

Với ứng viên, hệ thống giúp chuẩn bị và dùng lại hồ sơ thuận tiện hơn. Người dùng có thể duy trì profile, tạo CV từ mẫu, import CV có sẵn, chỉnh sửa lại dữ liệu sau khi import và dùng các bản CV đó để ứng tuyển.

Với nhà tuyển dụng, TalentFlow hỗ trợ đăng tin, quản lý ứng viên theo từng job, theo dõi trạng thái đơn ứng tuyển và tìm kiếm hồ sơ công khai. Nhờ đó, quá trình xử lý tuyển dụng được tập trung hơn thay vì phải dùng nhiều công cụ rời rạc.

## 1.4. Mục tiêu nghiên cứu

### 1.4.1. Mục tiêu tổng quát

Mục tiêu tổng quát của đề tài là xây dựng hệ thống TalentFlow như một nền tảng tuyển dụng web có khả năng hỗ trợ cả hai phía ứng viên và nhà tuyển dụng, đồng thời tích hợp khối xử lý CV để chuẩn hóa và tái sử dụng dữ liệu hồ sơ. Hệ thống cần liên kết được giữa cổng việc làm công khai, không gian làm việc của người dùng và dịch vụ xử lý CV ở phía sau.

### 1.4.2. Mục tiêu cụ thể

#### 1.4.2.1. Xây dựng cổng tuyển dụng công khai

Mục tiêu đầu tiên là xây dựng phần công khai cho phép người dùng xem việc làm, tìm kiếm việc làm, xem chi tiết tin tuyển dụng và tra cứu thông tin công ty. Đây là lớp tiếp cận đầu tiên giữa hệ thống và người dùng chưa đăng nhập.

#### 1.4.2.2. Xây dựng workspace dành cho ứng viên

Mục tiêu tiếp theo là xây dựng không gian làm việc cho ứng viên. Tại đây, người dùng có thể quản lý hồ sơ cá nhân, CV, danh sách đơn ứng tuyển, thông báo và các dữ liệu liên quan đến quá trình tìm việc.

#### 1.4.2.3. Xây dựng workspace dành cho nhà tuyển dụng

Song song với ứng viên, đề tài cũng hướng đến một workspace riêng cho nhà tuyển dụng. Phần này phục vụ quản lý tin tuyển dụng, xem ứng viên theo từng job, theo dõi pipeline tuyển dụng và xử lý trạng thái hồ sơ.

#### 1.4.2.4. Tích hợp công cụ CV Builder và CV Import hỗ trợ AI

Một mục tiêu quan trọng là hỗ trợ cả hai cách làm CV. Một là tạo CV trực tiếp trên hệ thống bằng CV Builder. Hai là nhập CV từ file có sẵn, sau đó dùng OCR và các bước parse để chuyển về dạng có thể chỉnh sửa.

#### 1.4.2.5. Xây dựng cơ chế gợi ý việc làm và ghép nối hồ sơ

Mục tiêu cuối cùng là hỗ trợ ghép nối giữa hồ sơ ứng viên và việc làm. Trong hệ thống hiện tại, phần này được thể hiện qua gợi ý việc làm cho ứng viên và tìm kiếm hồ sơ công khai cho nhà tuyển dụng, dựa trên dữ liệu hồ sơ thực tế.

## 1.5. Đối tượng và phạm vi nghiên cứu

### 1.5.1. Đối tượng sử dụng hệ thống

#### 1.5.1.1. Khách truy cập công khai

Đây là nhóm người dùng chưa cần đăng nhập nhưng có nhu cầu xem việc làm và tìm hiểu doanh nghiệp. Họ chủ yếu sử dụng các trang công khai như danh sách việc làm, chi tiết việc làm, danh sách công ty và trang công ty.

#### 1.5.1.2. Ứng viên

Ứng viên là nhóm người dùng chính ở phía tìm việc. Họ sử dụng hệ thống để tạo hồ sơ, quản lý CV, nộp đơn ứng tuyển, theo dõi trạng thái đơn và nhận thông báo liên quan.

#### 1.5.1.3. Nhà tuyển dụng / HR

Nhà tuyển dụng hoặc HR là nhóm người dùng phía doanh nghiệp. Họ dùng hệ thống để đăng tin, theo dõi ứng viên, cập nhật trạng thái xử lý hồ sơ, xem dashboard tuyển dụng và tìm kiếm ứng viên công khai.

### 1.5.2. Phạm vi chức năng

#### 1.5.2.1. Đăng ký, đăng nhập và phân vai trò

Hệ thống có chức năng đăng ký, đăng nhập và phân vai theo nhóm người dùng. Sau khi xác thực, người dùng được điều hướng vào không gian làm việc phù hợp với vai trò ứng viên hoặc nhà tuyển dụng.

#### 1.5.2.2. Quản lý việc làm, công ty và đơn ứng tuyển

TalentFlow hỗ trợ hiển thị tin tuyển dụng công khai, tra cứu công ty và nộp đơn ứng tuyển. Sau khi ứng tuyển, hệ thống lưu đơn và hỗ trợ theo dõi trạng thái xử lý.

#### 1.5.2.3. Quản lý hồ sơ ứng viên và CV

Hệ thống hỗ trợ hồ sơ ứng viên có cấu trúc, hồ sơ công khai hoặc riêng tư, CV tạo từ builder và kho CV của người dùng. Đây là phần dữ liệu nền cho nhiều chức năng khác trong hệ thống.

#### 1.5.2.4. Xử lý import CV, OCR, editable CV và export

Hệ thống nhận CV từ PDF, DOCX hoặc ảnh, sau đó xử lý qua các bước OCR, parse, review và tạo editable CV. Sau khi chỉnh sửa, người dùng có thể tiếp tục lưu và export lại thành tài liệu đầu ra.

#### 1.5.2.5. Dashboard, thông báo và email hỗ trợ quy trình tuyển dụng

Ngoài các chức năng chính, hệ thống còn có dashboard theo vai trò, notification trong hệ thống và email hỗ trợ cho một số luồng nghiệp vụ. Những phần này giúp quá trình làm việc rõ ràng và thuận tiện hơn.

### 1.5.3. Phạm vi công nghệ

#### 1.5.3.1. Ứng dụng web full-stack

TalentFlow được xây dựng dưới dạng ứng dụng web full-stack. Phần web dùng Next.js, React và TypeScript, trong đó giao diện và backend web cùng nằm trong một codebase.

#### 1.5.3.2. Cơ sở dữ liệu đám mây và lưu trữ tệp

Hệ thống sử dụng Supabase cho dữ liệu quan hệ, xác thực và lưu trữ file. Các file như CV gốc, file preview, asset và file export đều được quản lý trong lớp storage của hệ thống.

#### 1.5.3.3. Microservice AI cho xử lý CV

Khối xử lý CV được tách thành dịch vụ riêng. Dịch vụ này phụ trách các bước OCR, phân tích tài liệu, parse dữ liệu và hỗ trợ một số luồng matching hoặc gợi ý liên quan đến hồ sơ.

## 1.6. Phương pháp nghiên cứu và hướng tiếp cận

### 1.6.1. Phân tích yêu cầu từ nghiệp vụ tuyển dụng và dữ liệu hồ sơ

Đề tài được xây dựng từ nhu cầu thực tế của nghiệp vụ tuyển dụng. Cụ thể là nhu cầu đăng tin, ứng tuyển, quản lý hồ sơ ứng viên, theo dõi quy trình tuyển dụng và tái sử dụng dữ liệu CV. Vì vậy, việc phân tích yêu cầu không chỉ dừng ở giao diện mà còn đi vào cách tổ chức dữ liệu hồ sơ và đơn ứng tuyển.

### 1.6.2. Thiết kế hệ thống theo hướng web full-stack kết hợp microservice AI

Hướng tiếp cận của đề tài là tách phần hệ thống thành hai lớp chính. Lớp web app xử lý giao diện, xác thực và nghiệp vụ tuyển dụng. Lớp AI service xử lý các tác vụ nặng như OCR, parse CV và các job chạy nền.

### 1.6.3. Xây dựng kiến trúc phân vai candidate - recruiter

Hệ thống được tổ chức theo hai vai trò chính là ứng viên và nhà tuyển dụng. Mỗi vai trò có không gian làm việc riêng và phạm vi dữ liệu riêng. Cách làm này giúp hệ thống rõ ràng hơn cả về giao diện lẫn phân quyền.

### 1.6.4. Kiểm thử theo luồng nghiệp vụ và module chức năng

Việc kiểm thử được thực hiện theo các nhóm chức năng chính như việc làm, workspace ứng viên, workspace recruiter, CV Builder, import CV, editor và email. Cách kiểm thử này phù hợp với đặc điểm của hệ thống vì mỗi nhóm chức năng có luồng sử dụng khá riêng.

## 1.7. Đóng góp chính của đề tài

### 1.7.1. Tích hợp quy trình tuyển dụng và quản lý CV trên cùng một nền tảng

Đóng góp đầu tiên của đề tài là đưa các phần thường bị tách rời về chung một hệ thống. Người dùng có thể xem việc làm, quản lý hồ sơ, tạo hoặc import CV, ứng tuyển và theo dõi trạng thái xử lý trong cùng một nền tảng.

### 1.7.2. Bổ sung khối chuẩn hóa CV từ tài liệu nguồn bằng OCR/AI

Đóng góp thứ hai là xây dựng được luồng nhập CV từ file gốc và chuyển dần sang dữ liệu có thể chỉnh sửa. Phần này giúp CV không còn chỉ là file lưu trữ, mà trở thành dữ liệu có thể dùng lại trong hệ thống.

### 1.7.3. Bổ sung ATS pipeline cho phía nhà tuyển dụng

Hệ thống có thêm phần theo dõi đơn ứng tuyển theo kiểu ATS. Điều này giúp phía nhà tuyển dụng quản lý hồ sơ ứng viên rõ ràng hơn, thay vì chỉ xem danh sách hồ sơ đã nộp.

### 1.7.4. Đề xuất hướng ghép nối việc làm và ứng viên dựa trên hồ sơ thực tế

Đề tài cũng bước đầu xây dựng hướng gợi ý việc làm và tìm kiếm hồ sơ dựa trên dữ liệu thật của ứng viên. Phần này chưa phải là một hệ recommendation phức tạp, nhưng đã cho thấy cách dùng dữ liệu hồ sơ để hỗ trợ ghép nối trong tuyển dụng.

## 1.8. Cấu trúc của đồ án

### 1.8.1. Mô tả ngắn gọn nội dung từng chương

| Chương | Nội dung chính |
| --- | --- |
| Chương 1 | Trình bày bối cảnh đề tài, bài toán, mục tiêu, phạm vi, đối tượng sử dụng và đóng góp chính của hệ thống TalentFlow. |
| Chương 2 | Nêu cơ sở lý thuyết liên quan trực tiếp đến đề tài và các công nghệ chính được dùng trong hệ thống. |
| Chương 3 | Phân tích yêu cầu và thiết kế hệ thống, gồm các thành phần chính, luồng xử lý và tổ chức dữ liệu. |
| Chương 4 | Trình bày quá trình xây dựng hệ thống, các module chính và kết quả đạt được sau khi cài đặt. |
| Chương 5 | Trình bày nội dung kiểm thử và đánh giá hệ thống theo các luồng chức năng chính. |
| Chương 6 | Tổng kết kết quả của đề tài, nêu hạn chế hiện tại và hướng phát triển tiếp theo. |

# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

## 2.1. Cơ sở lý thuyết về hệ thống tuyển dụng trực tuyến

### 2.1.1. Khái niệm nền tảng tuyển dụng trực tuyến

Có thể hiểu nền tảng tuyển dụng trực tuyến là hệ thống cho phép doanh nghiệp đăng tin tuyển dụng, còn ứng viên tìm việc và nộp hồ sơ trên môi trường web. Hệ thống kiểu này giúp quá trình tuyển dụng diễn ra tập trung hơn, thay vì xử lý rời rạc qua nhiều kênh khác nhau.

Trong đề tài này, TalentFlow được xây dựng theo hướng đó. Hệ thống không chỉ hiển thị việc làm mà còn gắn với hồ sơ ứng viên, đơn ứng tuyển và phần quản lý tuyển dụng.

### 2.1.2. Khái niệm tin tuyển dụng, hồ sơ ứng viên và đơn ứng tuyển

Tin tuyển dụng là thông tin về một vị trí mà doanh nghiệp đang cần tuyển. Nội dung thường gồm tên vị trí, mô tả công việc, yêu cầu, địa điểm, mức lương và thông tin công ty.

Hồ sơ ứng viên là tập thông tin mô tả người tìm việc, gồm kỹ năng, kinh nghiệm, học vấn và định hướng nghề nghiệp. Đơn ứng tuyển là bản ghi cho biết một ứng viên đã nộp hồ sơ vào một công việc cụ thể. Ba thành phần này là dữ liệu cơ bản của một hệ thống tuyển dụng và cũng là các nhóm dữ liệu chính trong TalentFlow.

### 2.1.3. Mô hình ATS trong quản lý tiến trình tuyển dụng

ATS là cách tổ chức việc theo dõi hồ sơ ứng viên theo từng giai đoạn xử lý. Thay vì chỉ biết ứng viên đã nộp hồ sơ, hệ thống còn biết hồ sơ đó đang ở bước nào như đã tiếp nhận, đang xem xét, phỏng vấn, đề nghị nhận việc hay từ chối.

Với TalentFlow, mô hình này phù hợp vì hệ thống có phần applications và application events để lưu trạng thái hiện tại và lịch sử thay đổi. Nhờ đó, phía tuyển dụng có thể quản lý pipeline rõ ràng hơn.

### 2.1.4. Vai trò của hồ sơ công khai trong tìm kiếm ứng viên chủ động

Trong tuyển dụng thực tế, nhà tuyển dụng không chỉ chờ ứng viên tự nộp đơn mà còn chủ động tìm người phù hợp. Muốn làm được vậy, hệ thống cần có hồ sơ công khai để recruiter tra cứu theo kỹ năng, kinh nghiệm hoặc từ khóa.

TalentFlow có hướng đi này thông qua candidate profile công khai. Điều này giúp mở rộng cách tiếp cận ứng viên, không chỉ giới hạn ở những người đã nộp đơn cho một vị trí cụ thể.

## 2.2. Cơ sở lý thuyết về quản lý và chuẩn hóa CV

### 2.2.1. Khái niệm CV Builder và các block thông tin CV

CV Builder là công cụ tạo và chỉnh sửa CV trực tiếp trên hệ thống. Thay vì nhập toàn bộ CV như một đoạn văn bản dài, nội dung được chia thành các phần như thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng và dự án.

Cách tổ chức theo block giúp dữ liệu CV rõ ràng hơn, dễ sửa và dễ dùng lại. Trong TalentFlow, cách làm này được thể hiện qua phần template và resume, nơi cấu trúc CV được lưu thành các block dữ liệu.

### 2.2.2. Chuyển đổi CV từ tài liệu gốc sang dữ liệu có cấu trúc

Nhiều ứng viên đã có CV từ trước dưới dạng file PDF, DOCX hoặc ảnh. Nếu hệ thống chỉ lưu file thì rất khó sửa nội dung hoặc khai thác dữ liệu bên trong. Vì vậy, cần có bước chuyển đổi tài liệu gốc sang dữ liệu có cấu trúc hơn.

Trong TalentFlow, luồng này đi từ upload file, phân tích nội dung, review kết quả rồi tạo editable CV. Đây là cách giúp tài liệu CV gốc dần được chuyển sang dạng dữ liệu có thể chỉnh sửa và tái sử dụng.

### 2.2.3. OCR và trích xuất nội dung từ PDF / ảnh / DOCX

OCR là kỹ thuật dùng để đọc chữ từ ảnh hoặc tài liệu dạng hình ảnh. Với bài toán CV, OCR đặc biệt cần thiết cho ảnh và nhiều file PDF. Riêng với DOCX, hệ thống có thể đọc nội dung trực tiếp từ cấu trúc tài liệu mà không phải lúc nào cũng cần OCR theo nghĩa chặt.

Trong TalentFlow, Google Vision OCR được dùng để lấy văn bản và vị trí các block trên tài liệu. Việc giữ lại thông tin vị trí này có ích cho bước review và đồng bộ sang phần editable CV về sau.

### 2.2.4. Biên tập tài liệu nguồn và versioning tài liệu

Sau khi import CV, người dùng có thể vẫn muốn chỉnh sửa lại chính file gốc. Lúc này, hệ thống cần biết tài liệu nào là bản gốc, bản nào là bản đã sửa và bản nào là bản đã dùng để parse gần nhất.

Vì vậy, versioning tài liệu là phần cần thiết. Trong TalentFlow, mỗi tài liệu có thể có nhiều phiên bản và hệ thống cũng có cờ gợi ý reparse khi file nguồn đã thay đổi sau lần phân tích trước đó.

## 2.3. Cơ sở lý thuyết về ghép nối ứng viên - việc làm

### 2.3.1. Gợi ý việc làm dựa trên hồ sơ ứng viên

Gợi ý việc làm là việc đề xuất các công việc phù hợp dựa trên dữ liệu hồ sơ của ứng viên. Thông tin thường được dùng là kỹ năng, vai trò mong muốn, kinh nghiệm và đôi khi là địa điểm làm việc.

Trong TalentFlow, phần này được thể hiện qua API recommendation và bảng lưu kết quả gợi ý. Mục đích là giúp ứng viên tiếp cận công việc phù hợp nhanh hơn mà không phải tự tìm lại từ đầu mỗi lần.

### 2.3.2. Tìm kiếm ứng viên theo kỹ năng, kinh nghiệm và mức độ phù hợp

Ở chiều ngược lại, nhà tuyển dụng cũng cần tìm ứng viên phù hợp từ kho hồ sơ có sẵn. Muốn làm được điều đó, hồ sơ cần có dữ liệu tương đối rõ như kỹ năng, kinh nghiệm, headline hoặc trạng thái công khai.

TalentFlow hỗ trợ hướng này qua public candidate search. Hiện tại, phần tìm kiếm chủ yếu dựa trên lọc và truy vấn dữ liệu hồ sơ công khai, thay vì một mô hình xếp hạng phức tạp.

### 2.3.3. Kết hợp luật nghiệp vụ và mô hình AI trong recommendation

Trong bài toán gợi ý, chỉ dùng AI hoặc chỉ dùng luật cố định đều có hạn chế riêng. Cách hợp lý hơn là kết hợp hai hướng: dùng luật để chấm điểm cơ bản, rồi dùng AI hỗ trợ ở bước tổng hợp hoặc xếp hạng.

Trong TalentFlow, phần recommendation đang đi theo hướng này. Hệ thống có lớp tính điểm theo kỹ năng, vai trò, kinh nghiệm và địa điểm, đồng thời có lớp AI hỗ trợ ở một số luồng. Khi AI không khả dụng, hệ thống vẫn có thể fallback về luật nghiệp vụ.

## 2.4. Cơ sở lý thuyết về kiến trúc hệ thống web hiện đại

### 2.4.1. Kiến trúc client - server trong ứng dụng web full-stack

Kiến trúc client - server là cách tổ chức phổ biến của ứng dụng web. Phía client hiển thị giao diện và nhận thao tác người dùng, còn phía server xử lý nghiệp vụ, dữ liệu và xác thực.

Với TalentFlow, mô hình này được triển khai theo hướng full-stack. Nghĩa là phần giao diện và backend web cùng nằm trong một dự án, giúp việc xây dựng các luồng tuyển dụng đồng bộ hơn.

### 2.4.2. App Router và Route Handler trong Next.js

App Router là cách tổ chức route theo cấu trúc thư mục trong Next.js. Route Handler là cách viết các API ngay trong cùng hệ thống route đó. Nhờ vậy, frontend và backend web có thể đi cùng nhau trong một codebase.

TalentFlow dùng cách tổ chức này để xây dựng cả phần công khai, workspace theo vai trò và các API như jobs, applications, notifications, recommendation hay CV import.

### 2.4.3. Kiến trúc microservice cho xử lý AI và tài liệu

Các tác vụ như OCR, parse CV hay xử lý tài liệu thường nặng hơn nhiều so với request web thông thường. Nếu để chung hoàn toàn trong web app thì hệ thống khó quản lý hơn và khó mở rộng phần xử lý nền.

Vì vậy, TalentFlow tách phần này thành AI service riêng dùng FastAPI. Cách làm này giúp tách rõ phần web tuyển dụng và phần xử lý CV ở phía sau.

### 2.4.4. Xử lý bất đồng bộ bằng hàng đợi tác vụ

Với các thao tác mất thời gian như OCR hoặc parse tài liệu, hệ thống không nên bắt người dùng chờ ngay trong một request. Cách làm hợp lý là đưa tác vụ vào hàng đợi, để worker xử lý ở nền và cập nhật kết quả sau.

TalentFlow áp dụng cách này trong luồng CV import. Các trạng thái như queued, OCR running, parsing structured hay ready cho thấy tài liệu được xử lý theo nhiều bước bất đồng bộ.

## 2.5. Cơ sở lý thuyết về dữ liệu, xác thực và phân quyền

### 2.5.1. PostgreSQL và mô hình dữ liệu quan hệ

PostgreSQL phù hợp với hệ thống tuyển dụng vì dữ liệu có nhiều quan hệ rõ ràng. Ví dụ như công việc gắn với công ty, ứng viên gắn với hồ sơ, đơn ứng tuyển gắn với cả ứng viên và việc làm, còn các sự kiện xử lý lại gắn với đơn ứng tuyển.

TalentFlow dùng mô hình quan hệ để quản lý các nhóm dữ liệu như jobs, applications, employers, candidates, candidate profiles, notifications và các bảng phục vụ CV import. Cách tổ chức này giúp dữ liệu có liên kết rõ và dễ kiểm soát hơn.

### 2.5.2. Supabase Auth và quản lý phiên

Xác thực là phần bắt buộc vì hệ thống có dữ liệu cá nhân và có phân vai. Người dùng cần đăng ký, đăng nhập và duy trì phiên làm việc để truy cập đúng phần dữ liệu của mình.

TalentFlow dùng Supabase Auth cho phần này. Nhờ đó, hệ thống có thể xử lý đăng nhập, lấy thông tin user hiện tại và điều hướng vào workspace phù hợp với vai trò.

### 2.5.3. Row Level Security trong kiểm soát truy cập dữ liệu

RLS là cơ chế kiểm soát truy cập ở mức từng dòng dữ liệu. Cách này rất phù hợp với hệ thống có nhiều người dùng, vì mỗi người chỉ nên thấy những dữ liệu thuộc phạm vi của mình hoặc những dữ liệu được phép công khai.

Trong TalentFlow, nhiều bảng dữ liệu đã bật RLS. Điều này giúp bảo vệ tốt hơn các dữ liệu như profile, CV, application, recommendation và notification ngay từ tầng dữ liệu.

### 2.5.4. Signed URL và lưu trữ tệp trên cloud storage

CV và các tài liệu liên quan là dữ liệu nhạy cảm. Nếu mở trực tiếp toàn bộ đường dẫn file thì sẽ không an toàn. Vì vậy, hệ thống thường dùng signed URL để cấp quyền truy cập tạm thời đến đúng file cần dùng.

TalentFlow dùng cách này cho nhiều luồng như xem CV gốc, mở tài liệu trong editor, lấy asset export hoặc tải file preview. Đây là cách phù hợp để vừa lưu file trên cloud storage vừa giữ được kiểm soát truy cập.

### 2.5.5. Phân quyền theo vai trò ứng viên và nhà tuyển dụng

Hai vai trò chính của hệ thống là ứng viên và nhà tuyển dụng. Mỗi nhóm có nhu cầu và phạm vi dữ liệu khác nhau nên cần được tách rõ về cả giao diện lẫn quyền truy cập.

Trong TalentFlow, người dùng được điều hướng theo vai trò candidate hoặc hr. Cách phân vai này là nền tảng cho việc tổ chức workspace, API và chính sách truy cập dữ liệu trong hệ thống.

## 2.6. Công nghệ sử dụng trong hệ thống

Các công nghệ dưới đây là những công nghệ chính xuất hiện rõ trong repo hiện tại và gắn trực tiếp với bài toán của TalentFlow.

### 2.6.1. Nhóm công nghệ frontend

#### 2.6.1.1. Next.js 16, React 19, TypeScript

Đây là bộ công nghệ chính của phần web app. Next.js dùng để tổ chức route, render giao diện và xây dựng backend web. React dùng để xây dựng component giao diện. TypeScript giúp quản lý kiểu dữ liệu giữa các phần của hệ thống.

#### 2.6.1.2. Tailwind CSS, Framer Motion, Lucide React

Tailwind CSS được dùng để xây dựng giao diện theo kiểu utility-first. Framer Motion hỗ trợ hiệu ứng chuyển động ở một số thành phần giao diện. Lucide React cung cấp bộ icon dùng trong hệ thống.

### 2.6.2. Nhóm công nghệ backend web

#### 2.6.2.1. Next.js Route Handlers

Route Handlers được dùng để xây dựng các API trong web app. Trong TalentFlow, cách này được dùng cho nhiều luồng như jobs, applications, notifications, recommendation, CV Builder và document editor.

#### 2.6.2.2. Supabase SSR Client và Supabase Admin Client

Supabase SSR Client dùng trong các luồng có gắn phiên người dùng hiện tại. Supabase Admin Client dùng cho các tác vụ hệ thống như tạo signed URL hoặc thao tác storage ở phía server. Hai loại client này giúp hệ thống vừa bám theo session người dùng, vừa xử lý được các việc cần quyền cao hơn ở phía server.

### 2.6.3. Nhóm công nghệ dữ liệu và lưu trữ

#### 2.6.3.1. Supabase PostgreSQL

Supabase PostgreSQL là nơi lưu dữ liệu quan hệ chính của hệ thống. Các bảng về việc làm, ứng tuyển, hồ sơ ứng viên, notification và CV import đều được tổ chức trên nền này.

#### 2.6.3.2. Supabase Storage

Supabase Storage dùng để lưu các file như CV gốc, preview, asset, export và một số file liên quan đến quá trình xử lý tài liệu. Đây là lớp lưu trữ file chính của TalentFlow.

#### 2.6.3.3. Cloudinary

Cloudinary có mặt trong hệ thống để hỗ trợ upload ảnh, ví dụ như avatar hoặc một số ảnh dùng trong giao diện. Thành phần này không phải storage chính của toàn bộ tài liệu CV, mà chủ yếu hỗ trợ cho các luồng liên quan đến hình ảnh.

### 2.6.4. Nhóm công nghệ AI và xử lý tài liệu

#### 2.6.4.1. FastAPI

FastAPI được dùng để xây dựng AI service riêng của hệ thống. Service này xử lý các luồng như parse CV, preview tài liệu, OCR và một số job liên quan đến hồ sơ.

#### 2.6.4.2. Redis và Celery worker

Redis và Celery được dùng cho xử lý nền. Chúng giúp hệ thống đưa các job import CV vào hàng đợi thay vì xử lý đồng bộ ngay trong request web.

#### 2.6.4.3. Google Vision OCR

Google Vision OCR là công nghệ OCR chính được dùng trong pipeline CV hiện tại. Nó hỗ trợ đọc văn bản và vị trí các block từ tài liệu PDF hoặc ảnh.

#### 2.6.4.4. Ollama

Ollama được dùng trong một số bước liên quan đến chuẩn hóa dữ liệu, mapping nội dung và hỗ trợ recommendation. Đây là lớp AI phụ trợ khá rõ trong repo hiện tại.

#### 2.6.4.5. Gemini / Groq

Gemini và Groq xuất hiện ở các route tối ưu nội dung. Từ source hiện tại, chúng nên được hiểu là công cụ AI phụ trợ cho một số luồng văn bản, không phải phần lõi của pipeline CV import.

#### 2.6.4.6. PaddleOCR proxy endpoint

Hệ thống có nhóm route làm proxy tới dịch vụ PaddleOCR bên ngoài. Thành phần này cho thấy TalentFlow có chuẩn bị thêm hướng tích hợp OCR, nhưng đây không phải phần lõi chính của pipeline CV hiện tại.

### 2.6.5. Nhóm công nghệ tài liệu và xuất bản CV

#### 2.6.5.1. ONLYOFFICE

ONLYOFFICE được dùng trong phần chỉnh sửa tài liệu Word. Điều này phù hợp với nhu cầu xử lý file DOCX trong source document editor.

#### 2.6.5.2. Apryse WebViewer

Apryse WebViewer được dùng cho phần làm việc với tài liệu PDF. Đây là công nghệ hỗ trợ hiển thị và thao tác với file PDF trong hệ thống.

#### 2.6.5.3. React PDF

React PDF được dùng để tạo hoặc xuất CV ra định dạng PDF từ dữ liệu đã có cấu trúc. Phần này gắn trực tiếp với CV Builder và editable CV.

### 2.6.6. Nhóm công nghệ triển khai và kiểm thử

#### 2.6.6.1. Docker Compose

Docker Compose được dùng để chạy các service cần thiết trong môi trường phát triển như frontend, AI service, Redis, MongoDB, Mailpit và worker. Nhờ đó, môi trường chạy được tổ chức thống nhất hơn.

#### 2.6.6.2. Mailpit

Mailpit được dùng để test email trong môi trường phát triển. Hệ thống có thể gửi email thử nghiệm mà không cần gửi ra ngoài thực tế.

#### 2.6.6.3. MongoDB trong module email testing

MongoDB có mặt chủ yếu trong phần email testing hoặc môi trường thử nghiệm. Nó không phải cơ sở dữ liệu nghiệp vụ chính của TalentFlow.

## 2.7. Lý do lựa chọn công nghệ

### 2.7.1. Lý do chọn Next.js cho hệ thống web full-stack

Next.js phù hợp vì hệ thống cần vừa có giao diện công khai, vừa có workspace theo vai trò, lại vừa có nhiều API gắn chặt với phần giao diện. Dùng chung một framework giúp việc phát triển đồng bộ hơn và dễ tổ chức luồng nghiệp vụ hơn.

### 2.7.2. Lý do chọn Supabase cho Auth, Database và Storage

Supabase phù hợp với TalentFlow vì hệ thống cần xác thực, cơ sở dữ liệu quan hệ, storage file và cơ chế phân quyền dữ liệu. Dùng một nền tảng tích hợp giúp giảm bớt công sức ghép nối nhiều dịch vụ rời rạc.

### 2.7.3. Lý do tách AI service khỏi web app

Khối xử lý CV có nhiều tác vụ nặng và phụ thuộc vào thư viện Python. Nếu để chung toàn bộ trong web app thì việc triển khai và vận hành sẽ phức tạp hơn. Vì vậy, việc tách AI service ra riêng là hợp lý với bài toán của hệ thống.

### 2.7.4. Lý do dùng Redis/Celery cho import CV bất đồng bộ

Import CV là luồng không thể xem là tức thời vì phải đi qua nhiều bước xử lý. Redis và Celery phù hợp cho việc đưa job vào hàng đợi, xử lý nền và theo dõi trạng thái qua từng bước.

### 2.7.5. Lý do dùng ONLYOFFICE / Apryse cho chỉnh sửa tài liệu nguồn

TalentFlow không chỉ đọc CV mà còn cho phép làm việc với file nguồn sau khi upload. Vì PDF và DOCX là hai định dạng phổ biến nhất, việc dùng ONLYOFFICE cho Word và Apryse cho PDF là phù hợp với nhu cầu thực tế của hệ thống.

## 2.8. Kết luận chương

Chương 2 đã trình bày những cơ sở lý thuyết thật sự cần cho đề tài, gồm hệ thống tuyển dụng trực tuyến, hồ sơ ứng viên, ATS, quản lý CV, OCR, recommendation, kiến trúc web, dữ liệu và phân quyền. Đây là những phần gắn trực tiếp với bài toán mà TalentFlow đang giải quyết.

Bên cạnh đó, chương cũng đã nêu các công nghệ chính đang được dùng trong hệ thống như Next.js, React, TypeScript, Supabase, FastAPI, Redis, Celery, Google Vision OCR, Ollama, ONLYOFFICE, Apryse WebViewer và React PDF. Những nội dung này là cơ sở để chuyển sang chương sau, nơi hệ thống sẽ được phân tích và thiết kế cụ thể hơn.
