# Website nhà thuốc Tiến An Toàn — QLBANTHUOC

## Chạy website

Máy chủ SQL Server: `(local)`, xác thực Windows, cơ sở dữ liệu `QLBANTHUOC`.
Chạy `node server.js` trong thư mục dự án, rồi mở http://localhost:3000.
Nếu báo cổng đang dùng, dừng phiên máy chủ cũ trước khi chạy lại.

## Các bảng website sử dụng

| Chức năng | Bảng và cột |
|---|---|
| Sản phẩm | THUOC: MATHUOC, TENTHUOC, DONGIA, MALOAI |
| Danh mục | LOAITHUOC: MALOAI, TENLOAI |
| Tồn kho | Tổng CHITIETPHIEUNHAP.SOLUONGNHAP trừ tổng CHITIETHOADON.SOLUONG |
| Khách đặt hàng | KHACHHANG: MAKH, TENKH, DIACHI, SDT |
| Đơn hàng | HOADON: SOHD, MAKH, NGAY |
| Các thuốc trong đơn | CHITIETHOADON: SOHD, MATHUOC, SOLUONG, DONGIA |

Đơn vị giá thống nhất trong SQL Server và API là nghìn đồng; khi hiển thị, web nhân 1.000 để đổi sang đồng (VND).
Ví dụ DONGIA=30 hiển thị 30.000 đ; GIANHAP=12.50 hiển thị 12.500 đ. Giỏ hàng, tổng đơn, lịch sử phiếu và thông báo lưu đều cùng quy đổi.
Nếu tồn kho tính ra âm, website hiển thị hết hàng; không sửa dữ liệu nguồn.
Mã thuốc dạng chuỗi (A01, B01...), không chuyển thành số.
Ảnh bao bì thực tế được lưu trong images, đối chiếu theo mã thuốc ở script.js. Nguồn tải ghi trong images/nguon-anh.json. Ảnh dùng minh họa vì dữ liệu bài học chưa có hãng và quy cách; tên, giá, tồn kho vẫn lấy từ SQL Server.
Đây là website bài tập dùng dữ liệu học tập.

## Bổ sung để giữ chức năng đặt hàng

Script `ketnoi-qlbanthuoc.sql` đã chạy trên máy này, bổ sung:
- KHACHHANG.SDT VARCHAR(11), cho phép NULL với bản ghi cũ.
- CHITIETHOADON.DONGIA MONEY, lưu giá tại thời điểm đặt; bản ghi cũ giữ NULL
  vì không có bằng chứng về giá đã bán trong quá khứ.
- Mã khách hàng tiếp tục dãy số 001, 002… dựa trên mã số lớn nhất trong KHACHHANG, có khóa trong giao dịch để tránh trùng mã. Hóa đơn mới dùng HD + số kế tiếp (ít nhất 2 chữ số). Hai sequence cũ được giữ lại nhưng không còn dùng.

Giữ nguyên tên bảng, quan hệ và các bản ghi học tập trước đó.
Tên khách và địa chỉ tối đa 30 ký tự theo cấu trúc hiện có, điện thoại 9–11 chữ số.
Mỗi đơn web tạo một bản ghi khách riêng, không ghi đè khách trong bài học.
Đặt hàng được lưu trong một giao dịch: lỗi ở bước nào thì hủy toàn bộ đơn.
Tồn kho giảm do thêm chi tiết bán, không có cột tồn kho riêng để cập nhật.

Trong SSMS, mở QLBANTHUOC → Tables và Refresh để thấy các cột mới.
Ví dụ xem đơn web và thành tiền:

```sql
SELECT hd.SOHD, hd.NGAY, kh.TENKH, kh.DIACHI, kh.SDT,
       ct.MATHUOC, t.TENTHUOC, ct.SOLUONG, ct.DONGIA,
       ct.SOLUONG * ct.DONGIA AS THANHTIEN
FROM dbo.HOADON hd
JOIN dbo.KHACHHANG kh ON hd.MAKH = kh.MAKH
JOIN dbo.CHITIETHOADON ct ON hd.SOHD = ct.SOHD
JOIN dbo.THUOC t ON ct.MATHUOC = t.MATHUOC
WHERE hd.SOHD LIKE 'W%';
```

## File mã nguồn

- ketnoi.js: cấu hình SQL Server.
- dulieu.js: các truy vấn lấy thuốc, tính tồn kho và lưu đơn.
- server.js: phục vụ website và các đường dẫn API.
- script.js: tìm kiếm, lọc, giỏ hàng, gửi đơn với mã thuốc dạng chuỗi.
- index.html, style.css: giao diện.

`database.sql`, `quaythuoc.db` và cơ sở dữ liệu `QuayThuocAnTam` là phiên bản cũ,
không còn được website sử dụng; vẫn giữ lại để tham khảo. Không chạy database.sql
để thiết lập bản QLBANTHUOC này.

Trên máy khác cần có sẵn cơ sở dữ liệu QLBANTHUOC của bài học, sau đó chạy
ketnoi-qlbanthuoc.sql một lần, `npm.cmd ci`, sửa cấu hình nếu tên máy chủ khác,
rồi chạy `node server.js`. Cần Node.js và ODBC Driver 17 for SQL Server.

## Nhập kho qua website

Mở http://localhost:3000/nhapkho.html hoặc bấm **Nhập kho** trên menu.

1. Nhập số phiếu mới, tối đa 10 ký tự (ví dụ PNWEB01).
2. Chọn ngày nhập và một nhà cung cấp từ NHACUNGCAP.
3. Chọn thuốc đã có trong THUOC, nhập số lượng và giá nhập.
4. Bấm **Thêm thuốc** nếu phiếu có nhiều loại; mỗi thuốc chỉ xuất hiện một lần.
5. Kiểm tra tổng tiền rồi bấm **Lưu phiếu nhập**.

Số phiếu được đổi sang chữ hoa trước khi lưu. Số phiếu trùng sẽ bị từ chối.
Số lượng là số nguyên dương; ô giá nhập dùng đồng, không âm, bước giá 10 đồng. Trước khi gửi API, web chia 1.000 để lưu giá theo nghìn đồng.
Ô giá nhập dùng ĐỒNG: nhập 18000 để web gửi giaNhap=18 và lưu GIANHAP=18 (nghìn đồng). Giới hạn nhập là 999.999.999.990 đồng; bước giá 10 đồng theo độ chính xác DECIMAL(18,2) của đơn vị nghìn đồng. Dữ liệu bán hàng và API vẫn dùng nghìn đồng.
Phiếu và chi tiết được lưu cùng giao dịch; nếu có lỗi sẽ không lưu phiếu dở dang.

Dữ liệu lưu trực tiếp vào các bảng bài học:
- PHIEUNHAP: SOPN, NGAYNHAP, MANCC.
- CHITIETPHIEUNHAP: SOPN, MATHUOC, SOLUONGNHAP, GIANHAP (DECIMAL(18,2)).

Trang hiển thị toàn bộ lịch sử phiếu nhập, có cả các phiếu nhập trực tiếp trong SSMS; có thể lọc bằng mã và khoảng ngày.
Bấm một phiếu để xem các dòng thuốc, số lượng, giá nhập và thành tiền.
**Giá nhập không làm thay đổi THUOC.DONGIA (giá bán).** Không tạo thêm cột tồn kho;
tồn kho trên trang bán hàng vẫn tính bằng tổng nhập trừ tổng bán.
Nếu trang bán hàng đang mở sẵn, tải lại trang để thấy tồn kho mới.

Trang này dùng nhà cung cấp và thuốc có sẵn, chưa có biểu mẫu tạo thuốc hay nhà
cung cấp mới. Trang quản lý yêu cầu đăng nhập tài khoản nhân viên.

Đối chiếu phiếu trong SSMS:

```sql
SELECT p.SOPN, p.NGAYNHAP, n.TENNCC, ct.MATHUOC, t.TENTHUOC,
       ct.SOLUONGNHAP, ct.GIANHAP,
       ct.SOLUONGNHAP * ct.GIANHAP AS THANHTIEN
FROM dbo.PHIEUNHAP p
JOIN dbo.NHACUNGCAP n ON p.MANCC = n.MANCC
JOIN dbo.CHITIETPHIEUNHAP ct ON p.SOPN = ct.SOPN
JOIN dbo.THUOC t ON ct.MATHUOC = t.MATHUOC
WHERE p.SOPN = N'PNWEB01';
```

File thêm: kho.js (truy vấn), nhapkho.html, nhapkho.css, nhapkho.js.
Kiểm tra tích hợp: `node kiemtra-kho.cjs` (tạo phiếu thử rồi tự xóa phiếu thử).

## Trợ lý AI trò chuyện — Google Gemini

Nút **Hỏi trợ lý AI** dùng Gemini GenerateContent API. Model mặc định:
`gemini-3.5-flash-lite`, cấu hình bằng GEMINI_MODEL. Model này có mức miễn phí
trong bảng giá Google tại thời điểm tích hợp; hạn mức thực tế tùy tài khoản/dự án.
Không tự bật billing, không tự nâng gói và không tự chuyển sang model khác khi lỗi.

### Kích hoạt

1. Vào https://aistudio.google.com/apikey, đăng nhập Google và tạo Gemini API key.
2. Điền key vào dòng GEMINI_API_KEY trong file .env:

```dotenv
GEMINI_API_KEY=key_gemini_cua_ban
GEMINI_MODEL=gemini-3.5-flash-lite
```

3. Lưu file, khởi động lại `node server.js`, rồi tải lại website bằng Ctrl + F5.
4. Bấm Hỏi trợ lý AI và thử hỏi giá/tồn kho một thuốc.

Key OpenAI không dùng được cho Gemini. Các dòng OPENAI cũ trong .env không còn
được chatbot đọc; được giữ nguyên để người dùng tự quản lý. Không gửi ảnh chứa key.
.env được bỏ qua trong .gitignore và không được phục vụ bằng HTTP.

### Dữ liệu gửi tới Google

Mỗi lượt hỏi, chatbot đọc lại danh mục thuốc từ SQL Server và gửi tên, mã, loại,
giá bằng VND, tồn kho kèm câu hỏi và tối đa 4 lượt hỏi/đáp gần nhất tới Google Gemini.
Không truy vấn hay gửi bảng khách hàng, hóa đơn, thông tin giao hàng hoặc phiếu nhập
cho AI. Tuy nhiên, nội dung khách tự gõ được gửi tới Google; không nên gửi thông tin
cá nhân hoặc thông tin sức khỏe nhạy cảm. Theo tài liệu Google, dữ liệu trên Free Tier
có thể được dùng để cải thiện sản phẩm. Lịch sử chỉ giữ trong bộ nhớ trang đang mở;
website không ghi hội thoại vào SQL Server. Không gửi tham số store của OpenAI cho Gemini.

Giá trong SQL Server là nghìn đồng, được nhân 1.000 trước khi gửi cho AI.
AI chỉ hỗ trợ thông tin sản phẩm và mua hàng, không chẩn đoán, kê đơn hay đưa liều.
AI không có quyền ghi dữ liệu, không thể tự đặt hàng hoặc nhập kho.
Quy tắc prompt không bảo đảm mọi câu trả lời chính xác; cần kiểm tra các tình huống
thực tế trước khi dùng công khai.

Giới hạn website: 1.000 ký tự/tin, tối đa 10 tin mỗi yêu cầu, 20 yêu cầu/phút và
3 yêu cầu đồng thời cho toàn máy chủ; timeout 25 giây. Khóa gửi trong header
x-goog-api-key, không đặt trong URL, không đưa vào JavaScript của trình duyệt.
Khi Google chặn nội dung, hết hạn mức hoặc mất kết nối, widget có thông báo phù hợp.

File liên quan: chatbot.js, chat.js, chat.css, index.html, .env và .env.example.

Tài liệu Google:
- https://aistudio.google.com/api-reference/generate-content
- https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite
## Xem đơn hàng
Mở /donhang.html hoặc bấm Đơn hàng trên menu. Tìm theo mã đơn, tên khách, số điện thoại. Bấm từng đơn để xem chi tiết. Dữ liệu đọc trực tiếp từ SQL Server; tiền hiển thị đồng, lưu nghìn đồng. Đơn cũ thiếu giá bán sẽ ghi Chưa có dữ liệu. Bấm Tải lại danh sách sau khi dữ liệu thay đổi. Kiểm tra chỉ đọc: node kiemtra-donhang.cjs.

## Phân khu khách hàng và nhân viên
- Khách mở http://localhost:3000: xem sản phẩm, giỏ hàng, đặt hàng và hỏi AI như trước. Không cần tài khoản để mua hàng.
- Nhân viên bấm Nhân viên hoặc mở http://localhost:3000/dangnhap.html. Đăng nhập xong được xem toàn bộ đơn hàng và nhập kho. Có nút Đăng xuất trên menu.
- Tài khoản lưu trong bảng mới dbo.TAIKHOANWEB của QLBANTHUOC; không thay đổi các bảng thuốc, hóa đơn hay phiếu nhập. Mật khẩu lưu dạng băm scrypt và muối riêng, không lưu mật khẩu rõ.
- Tạo tài khoản từ terminal: node tao-nhanvien.cjs ten_tai_khoan. Chỉ người quản lý máy chủ thực hiện; không có chức năng tự đăng ký nhân viên công khai. Mật khẩu được tạo ngẫu nhiên và hiện một lần trong terminal. Chạy lại cùng tên không ghi đè mật khẩu.
- Đặt HOATDONG=0 trong TAIKHOANWEB để khóa tài khoản. Máy chủ kiểm tra trạng thái tài khoản mỗi lần dùng chức năng quản lý.
- Phiên đăng nhập hết hạn sau 8 giờ hoặc khi khởi động lại máy chủ. Cookie HttpOnly, SameSite=Strict; cấu hình hiện dành cho localhost HTTP. Khi triển khai công khai cần HTTPS và cookie Secure.
- Máy chủ chặn cả trang quản lý lẫn API: khách gõ đường dẫn trực tiếp sẽ chuyển đến đăng nhập; API trả 401. Ẩn menu chỉ là phần giao diện.
- Chưa có tài khoản khách hàng và chức năng xem lịch sử đơn riêng của từng khách.
- Kiểm tra: node kiemtra-phanquyen.cjs; node kiemtra-kho.cjs; node kiemtra-donhang.cjs. Hai kiểm tra đầu tạo tài khoản thử riêng rồi xóa; kiểm tra kho khôi phục tồn kho sau khi chạy.
## Quản lý thuốc, tồn kho, loại thuốc và nhà cung cấp
1. Đăng nhập nhân viên rồi bấm **Thuốc & tồn kho**, hoặc mở http://localhost:3000/quanly.html.
2. Tab **Thuốc & tồn kho**: tìm bằng mã/tên (có thể gõ không dấu), lọc loại và tình trạng kho. Số đã nhập lấy từ CHITIETPHIEUNHAP; Đã bán/giữ cộng số lượng trong CHITIETHOADON của các đơn chưa hủy. Tồn = nhập - số lượng ở đơn chưa hủy. Tồn âm được báo **Lệch tồn kho** để kiểm tra dữ liệu gốc, không tự sửa số liệu.
3. Ngưỡng **Sắp hết** mặc định 20, có thể đổi để lọc thuốc còn từ 1 đến ngưỡng đó. Ngưỡng chỉ là bộ lọc trên màn hình, không phải cột lưu trong SQL.
4. Bấm **Thêm thuốc**, nhập mã (tối đa 10 chữ không dấu/số/dấu _ hoặc -), tên (tối đa 50 ký tự), loại và giá bán bằng đồng. Ví dụ nhập 30000, API và SQL lưu 30 (nghìn đồng). Giá theo bước 10 đồng để thống nhất độ chính xác với giá nhập.
5. Thuốc mới có tồn 0. Muốn bán, vào **Nhập kho** để lập phiếu nhập. Không nhập số tồn trực tiếp trong form thuốc.
6. Bấm **Sửa** để đổi tên, loại, giá bán. Mã thuốc được giữ nguyên. Đổi giá không sửa đơn giá đã lưu trong hóa đơn cũ. Thuốc mới có thể tải ảnh ngay trên form; nếu chưa có ảnh thì hiển thị mã thuốc. Các ảnh minh họa cũ vẫn được dùng khi chưa tải ảnh thay thế.
7. Tab **Loại thuốc**: thêm/sửa tên loại, mã loại giữ nguyên khi sửa. Loại mới xuất hiện trong form thuốc và bộ lọc trang bán hàng sau khi tải lại dữ liệu.
8. Tab **Nhà cung cấp**: thêm/sửa tên, địa chỉ và điện thoại. Địa chỉ và điện thoại có thể để trống. Nhà cung cấp mới xuất hiện trong danh sách chọn khi tải lại trang nhập kho.
9. Bấm **Tải lại dữ liệu** để xem thay đổi sau khi có giao dịch bán hàng/nhập kho. Trang bán hàng cũng cần tải lại để nhận giá và danh mục mới.
10. Mã trùng được báo lỗi, không tự ghi đè. Các chức năng này chưa có xóa thuốc/loại/nhà cung cấp để giữ các liên kết nhập hàng và hóa đơn.

Tệp bổ sung: quanly.html, quanly.css, quanly.js (giao diện), quanly-data.js (đọc/lưu SQL). Các API /api/quan-ly, /api/quan-ly/thuoc, /api/quan-ly/loai và /api/quan-ly/nha-cung-cap đều yêu cầu quyền nhân viên. Phần cập nhật trạng thái/ảnh bổ sung HOADON.TRANGTHAI và THUOC.ANH; các trường dữ liệu gốc được giữ nguyên.

Kiểm tra dữ liệu: `node kiemtra-quanly.cjs`. Bài kiểm tra tạo mã ngẫu nhiên, đối chiếu SQL/API, kiểm tra tính tồn và giá hóa đơn cũ rồi dọn đúng các dòng thử; không đổi danh mục/giá/tồn gốc. Có thể thêm `--giaodien` khi Playwright đã được cài riêng tại TEMP/codex-pharmacy-check để kiểm tra thêm form trên Chrome ở kích thước máy tính và điện thoại.

## Mã hóa đơn thống nhất
Hóa đơn đặt mới dùng dạng HD01, HD02... HD11, HD12... Khi hết 2 chữ số sẽ tiếp tục HD100, không cắt số. Máy chủ đọc số lớn nhất của các mã HD có phần sau là chữ số và cấp số tiếp theo trong cùng giao dịch lưu đơn. Khóa giao dịch tránh trùng mã khi hai người cùng đặt hàng. Mã được dùng thống nhất ở HOADON, CHITIETHOADON, thông báo đặt hàng và trang quản lý đơn.

Theo yêu cầu đồng nhất mã, đã chuyển W000000002 → HD12 và W000000003 → HD13 bằng doi-ma-hoadon.cjs; đồng thời cập nhật CHITIETHOADON và PHANCONG trong cùng giao dịch. Đã đối chiếu số dòng, dữ liệu khách hàng/ngày/thuốc/số lượng/giá/phân công và tồn kho trước khi lưu. Mã khách hàng đã được đồng bộ bằng doi-ma-khach.cjs sang 011, 012, 013; đơn mới tiếp tục dãy số. Mã khách hàng và mã hóa đơn vẫn là hai loại mã riêng. Nếu nhân viên tự thêm hóa đơn trong SSMS thì mã tự thêm phải duy nhất, đơn web sau đó sẽ lấy số HD lớn nhất cộng 1. Kiểm tra bằng node kiemtra-mahoadon.cjs (tạo và dọn đúng các đơn thử, giữ nguyên tồn kho gốc).
## Dược sĩ và phân công hóa đơn
- Đăng nhập nhân viên, bấm **Dược sĩ** hoặc mở http://localhost:3000/duocsi.html. Có thể tìm theo mã/tên dược sĩ, mã/tên thuốc; thêm mới và sửa họ tên, thuốc phụ trách.
- Dữ liệu lưu trực tiếp trong dbo.DUOCSI_CHUYENTHUOC. MADUOCSI tối đa 10 ký tự, TENDUOCSI tối đa 50 ký tự. Mã giữ nguyên khi sửa. MATHUOC cho phép NULL nên có lựa chọn Chưa phân thuốc.
- Theo khóa chính hiện tại, mỗi dược sĩ chỉ có một dòng và tối đa một thuốc phụ trách. Không thay đổi cấu trúc bảng để thêm nhiều thuốc cho một dược sĩ. Cột Hóa đơn phân công là số dòng PHANCONG liên quan, không phải số đơn đã hoàn thành.
- Vào **Đơn hàng**, mở một hóa đơn. Phần **Dược sĩ được phân công** hiển thị các dược sĩ hiện có trong PHANCONG. Chọn dược sĩ rồi bấm **Phân công** để thêm; bấm **Bỏ phân công** để gỡ đúng cặp hóa đơn/dược sĩ. Có thể phân công nhiều dược sĩ cho một hóa đơn; không được thêm trùng cặp.
- Bỏ phân công không xóa dược sĩ, hóa đơn hoặc chi tiết thuốc; không đổi số lượng, tồn kho và tiền của đơn. Phân công được đọc riêng, không nối trực tiếp với chi tiết thuốc để tránh nhân đôi tổng tiền khi có nhiều dược sĩ.
- Dược sĩ chuyên trách là dữ liệu nghiệp vụ, chưa liên kết với tài khoản đăng nhập nhân viên. Phân công do nhân viên lựa chọn, không tự động giới hạn theo thuốc phụ trách hoặc phát sinh chẩn đoán/y lệnh.
- API /api/duoc-si (GET/POST) và /api/phan-cong (POST) yêu cầu quyền nhân viên. Trang /duocsi.html cũng được bảo vệ ở máy chủ.
- Các tệp mới: duocsi.html, duocsi.js, duocsi-data.js. Giao diện dùng chung quanly.css; đơn hàng được bổ sung vào donhang.js, donhang-data.js và donhang.css.
- Kiểm tra: node kiemtra-duocsi.cjs. Thêm --giaodien nếu có Playwright tại TEMP/codex-pharmacy-check. Kiểm tra tạo mã riêng, thử phân công đồng thời và nhiều dược sĩ, đối chiếu tiền/số dòng thuốc, rồi dọn dữ liệu thử và xác nhận dược sĩ/phân công/tồn kho gốc không đổi.

## Thống kê bán hàng theo ngày/tháng
- Nhân viên mở http://localhost:3000/thongke.html hoặc chọn **Thống kê** trên menu. Trang mặc định chọn tháng hiện tại theo giờ Việt Nam.
- Chọn Từ ngày, Đến ngày, thống kê theo Ngày hoặc Tháng, rồi bấm Xem thống kê. Ngày đầu và ngày cuối đều được tính. Chỉ liệt kê các ngày/tháng có hóa đơn; khi chọn một phần tháng, dòng của tháng đó chỉ tính hóa đơn trong khoảng ngày đã chọn.
- Nguồn dữ liệu: HOADON.NGAY và CHITIETHOADON.SOLUONG/DONGIA. Mỗi hóa đơn được gom trước; không nối PHANCONG nên nhiều dược sĩ không làm tăng số đơn, số lượng hay tiền.
- Tiền tính được là tổng số lượng nhân đơn giá đã lưu của những dòng có giá >= 0 và số lượng > 0. SQL/API giữ đơn vị nghìn đồng, giao diện hiển thị đồng. Không dùng giá hiện tại của THUOC để bù giá hóa đơn cũ.
- Hóa đơn thiếu giá/số lượng, có giá âm/số lượng không hợp lệ hoặc chưa có thuốc được đánh dấu chưa đủ dữ liệu. Nếu không có dòng nào tính được tiền, web hiện Chưa tính được, không diễn giải là doanh thu 0. Nếu chỉ tính được một phần, có cảnh báo tổng tiền chưa đầy đủ. Hóa đơn thiếu ngày được đếm riêng và không gộp vào kỳ.
- Số lượng bán cộng các số lượng dương đã lưu, kể cả khi dòng đó chưa có giá. Vì hệ thống chưa có trạng thái thanh toán, số tiền theo hóa đơn chưa khẳng định là tiền đã thu; đây chưa phải thống kê lợi nhuận.
- Trang và GET /api/thong-ke được bảo vệ bằng quyền nhân viên; chỉ đọc dữ liệu, không thay đổi cấu trúc bảng hoặc bản ghi bán hàng.
- Tệp mới: thongke.html, thongke.css, thongke.js, thongke-data.js. Kiểm tra: node kiemtra-thongke.cjs; thêm --giaodien nếu có Playwright tại TEMP/codex-pharmacy-check. Dữ liệu mẫu nằm trong giao dịch được hủy; tài khoản thử được dọn riêng.

## Tìm phiếu nhập ngay trong trang Nhập kho
- Mở Nhập kho, cuộn tới Lịch sử phiếu nhập. Nhập toàn bộ hoặc một phần mã phiếu; không phân biệt chữ hoa/thường. Kết quả lọc ngay khi nhập.
- Có thể chọn Từ ngày, Đến ngày hoặc cả hai. Ngày đầu và cuối đều được tính. Khi lọc ngày, phiếu chưa có ngày nhập không được đưa vào kết quả. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
- Mã và khoảng ngày được kết hợp: phiếu phải thỏa mãn cả hai. Xóa bộ lọc để xem tất cả. Dòng Hiển thị x/y cho biết số phiếu khớp trên tổng lịch sử.
- API GET /api/nhap-kho đã bỏ TOP (20), đọc toàn bộ phiếu và chi tiết từ SQL. JavaScript lọc danh sách đã tải, phù hợp dữ liệu bài tập hiện tại.
- Tải lại danh sách giữ nguyên bộ lọc, phiếu đang mở và thông tin phiếu mới đang nhập. Sau khi lưu phiếu, bộ lọc vẫn được giữ; xóa bộ lọc nếu muốn xem tất cả phiếu vừa thêm.
- Kiểm tra: node kiemtra-timphieu.cjs; thêm --giaodien nếu có Playwright tại TEMP/codex-pharmacy-check. Kiểm tra 21 phiếu thử trong giao dịch hủy để chứng minh tra được phiếu cũ hơn 20 dòng; không để lại dữ liệu thử. Kiểm tra lưu nhập kho: node kiemtra-kho.cjs.
## Trạng thái đơn hàng và hoàn tồn kho
- Đơn đặt qua web có trạng thái Chờ xử lý. Thuốc được giữ ngay khi lưu đơn, nên tồn khả dụng đã trừ số lượng đặt.
- Trong Đơn hàng có bộ lọc trạng thái. Mở chi tiết rồi chọn Hoàn thành đơn hoặc Hủy đơn. Hủy có bước xác nhận; hệ thống giữ nguyên hóa đơn, chi tiết thuốc, đơn giá và phân công để tra cứu.
- Khi hủy, tồn kho tự tăng lại vì công thức tồn không còn trừ các đơn có TRANGTHAI=da_huy. Không tạo phiếu nhập giả và không xóa thuốc khỏi hóa đơn. Khóa giao dịch đảm bảo hai yêu cầu hủy cùng lúc không hoàn tồn hai lần. Gửi lại cùng trạng thái trả kết quả đã xử lý, không tác động thêm.
- Đơn hoàn thành và đơn hủy đều là trạng thái kết thúc; không mở lại hoặc chuyển qua nhau. Chưa có quy trình trả hàng sau khi hoàn thành.
- Hóa đơn đã tồn tại trước cập nhật giữ TRANGTHAI=NULL và hiện Đơn cũ. Không tự coi là đã hoàn thành hoặc đã hủy. Nhân viên có thể xử lý sau khi kiểm tra thực tế; thiếu giá cũ vẫn giữ nguyên, nhưng đơn thiếu thuốc hoặc số lượng không hợp lệ bị chặn xử lý.
- Thống kê bán hàng tính các đơn hoàn thành cùng dữ liệu đơn cũ để bảo toàn lịch sử. Đơn chờ xử lý và đơn hủy được đếm riêng, không tính vào tiền/số lượng bán. Đây chưa phải chứng từ xác nhận đã thanh toán.
- POST /api/trang-thai-don chỉ cho nhân viên. Thay đổi lưu vào HOADON.TRANGTHAI; public API sản phẩm, quản lý tồn kho và AI đều đọc tồn theo công thức mới.

## Tải ảnh khi thêm/sửa thuốc
- Vào Thuốc & tồn kho, bấm Thêm thuốc hoặc Sửa. Chọn ảnh JPG, PNG hoặc WebP tối đa 3 MB; có xem trước. Bấm Lưu thuốc để lưu thông tin và tải ảnh. Để trống ô ảnh khi sửa để giữ ảnh hiện tại.
- Máy chủ kiểm tra dữ liệu ảnh, đặt tên UUID riêng và lưu tại images/uploads; đường dẫn lưu trong THUOC.ANH. Không dùng tên tệp người dùng làm đường dẫn. Không nhận SVG/HTML. Ảnh được phục vụ đúng MIME với nosniff.
- Nếu lưu thuốc thất bại, ảnh vừa ghi trong lần đó được dọn. Ảnh cũ sau khi thay được giữ trên đĩa để không làm hỏng các trang đang mở; không tự xóa ảnh minh họa gốc. Khi sao lưu, cần giữ cả SQL và thư mục images/uploads.
- anhthuoc.js dùng chung bản đồ ảnh minh họa cũ cho trang bán hàng và quản lý. Ảnh tải lên được ưu tiên, ảnh cũ vẫn giữ khi chưa chọn ảnh thay. Tải lại trang bán hàng sau khi sửa ảnh để nhận ảnh mới.
- bo-sung-don-anh.sql bổ sung hai cột theo cách chạy lại được. server.js tự chạy khi khởi động; ketnoi-qlbanthuoc.sql cũng có phần cấu trúc tương ứng. Không sửa đơn giá, khách hàng hoặc số lượng cũ.
- Kiểm tra: node kiemtra-trangthai-anh.cjs --giaodien (Playwright cài riêng tại TEMP/codex-pharmacy-check). Bài kiểm tra dùng đơn/thuốc/ảnh thử riêng, kiểm tra hủy đồng thời, hoàn tồn một lần, đơn kết thúc, thống kê, tải ảnh và hiển thị ngoài trang bán hàng; sau đó dọn đúng dữ liệu thử. Có thể bỏ --giaodien để chỉ kiểm tra API/SQL.
- **Cập nhật luồng bán hàng:** các hướng dẫn chờ xử lý/hoàn thành/hủy bên dưới là luồng cũ, đã được thay thế. Bấm Thanh toán sẽ lưu hóa đơn với trạng thái Hoàn thành và trừ tồn kho ngay. Hóa đơn trước đây chưa có trạng thái hoặc đang chờ đã được chuyển sang Hoàn thành; đơn đã hủy trước đây vẫn giữ nguyên để không thay đổi tồn kho.
- Nhân viên mở chi tiết đơn để dùng **Xóa hóa đơn**. Có xác nhận trước khi xóa vĩnh viễn hóa đơn, chi tiết thuốc và phân công trong một giao dịch SQL. Hồ sơ khách hàng vẫn giữ. Vì tồn kho và doanh thu tính từ hóa đơn, xóa sẽ hoàn lại lượng thuốc đã bán và loại doanh thu đó khỏi thống kê. Không dùng xóa để chỉ dọn giao diện sau khi đã giao thuốc thực tế.
- `SoHoaDonWeb` ghi nhớ số hóa đơn đã cấp để không tái sử dụng mã khi xóa hóa đơn cuối. Mã hóa đơn và mã khách hàng là hai dãy độc lập, không bảo đảm có cùng phần số. Kiểm tra luồng mới bằng `node kiemtra-xoadon.cjs`; bài kiểm tra trạng thái cũ `kiemtra-trangthai-anh.cjs` không còn áp dụng cho luồng đơn hàng hiện tại.

- **Phân công tự động khi thanh toán:** sau khi lưu các dòng thuốc, web nối `CHITIETHOADON.MATHUOC` với `DUOCSI_CHUYENTHUOC.MATHUOC` để thêm các cặp `SOHD, MADUOCSI` vào `PHANCONG`, trong cùng giao dịch với hóa đơn. Nhiều dược sĩ phụ trách cùng thuốc sẽ đều được phân công; thuốc chưa có dược sĩ thì không tự gán người khác. Có thể điều chỉnh thủ công khi cần. Script `dongbo-phancong.sql` chỉ bổ sung cặp còn thiếu cho hóa đơn cũ chưa hủy, không xóa phân công hiện có. Đổi thuốc phụ trách sau này không tự viết lại phân công lịch sử.

- **Xóa dược sĩ:** nút Xóa trong bảng Dược sĩ yêu cầu xác nhận. Chỉ xóa được bản ghi chưa có dòng nào trong PHANCONG; máy chủ kiểm tra lại và khóa ngoại vẫn bảo vệ lịch sử nếu dữ liệu thay đổi cùng lúc. Không tự xóa phân công hoặc hóa đơn để xóa dược sĩ.

- **Xóa thuốc:** nút Xóa cạnh Sửa trong Thuốc & tồn kho có xác nhận. Chỉ xóa được thuốc chưa có chi tiết hóa đơn, chi tiết phiếu nhập và chưa được dược sĩ phụ trách. Máy chủ kiểm tra và khóa ngoại bảo vệ các liên kết; không tự xóa lịch sử nhập/bán hoặc gỡ thuốc khỏi dược sĩ. Ảnh trên ổ đĩa được giữ nguyên khi xóa bản ghi thuốc.

- **Xóa phiếu nhập:** mở chi tiết phiếu và bấm Xóa phiếu nhập, sau đó xác nhận. Chỉ nhân viên được thao tác. Máy chủ xóa chi tiết và phiếu trong một giao dịch, kiểm tra tồn kho thực của từng thuốc sau xóa; nếu bất kỳ thuốc nào âm thì hủy toàn bộ giao dịch và giữ nguyên phiếu. Không xóa thuốc, nhà cung cấp hoặc hóa đơn liên quan. Tồn kho giảm theo lượng của phiếu đã xóa. Kiểm tra bằng `node kiemtra-xoaphieu.cjs`.

- **Menu mới:** phần tài khoản tách khỏi thanh điều hướng. Nhân viên có các mục Bán hàng, Hóa đơn, Thuốc & tồn kho, Phiếu nhập, Dược sĩ, Thống kê theo cùng thứ tự trên các trang. Khách thấy Trang chủ, Sản phẩm, Giỏ hàng và liên kết Đăng nhập nhân viên. Trên điện thoại bấm Menu để mở/đóng; chọn mục hoặc nhấn Escape sẽ đóng menu. Trang hiện tại được tô xanh. Phân quyền máy chủ giữ nguyên.

