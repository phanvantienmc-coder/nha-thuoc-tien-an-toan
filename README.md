# Nhà thuốc Tiến An Toàn

Website bài tập bán hàng và quản lý nhà thuốc, viết bằng HTML, CSS, JavaScript thuần và Node.js. Dữ liệu dùng SQL Server với cơ sở dữ liệu `QLBANTHUOC`.

## Chức năng

- Xem, tìm thuốc, giỏ hàng và ghi nhận thanh toán.
- Quản lý hóa đơn, tự phân công dược sĩ theo thuốc phụ trách.
- Quản lý thuốc, loại thuốc, nhà cung cấp và dược sĩ.
- Nhập kho, tra cứu và xóa phiếu nhập nếu không làm âm tồn kho.
- Thống kê bán hàng theo ngày hoặc tháng.
- Đăng nhập nhân viên và phân quyền tại máy chủ.
- Chatbot Gemini khi đã cấu hình API key riêng.

## Chạy trên máy Windows

1. Cài Node.js, SQL Server và ODBC Driver 17 for SQL Server.
2. Khôi phục cơ sở dữ liệu bài học `QLBANTHUOC` của bạn. Repository này không chứa bản sao dữ liệu SQL Server, tài khoản hoặc mật khẩu của người dùng.
3. Chỉnh kết nối Windows Authentication trong `ketnoi.js` nếu SQL Server của bạn không phải `(local)`.
4. Chạy `ketnoi-qlbanthuoc.sql` và `phanquyen.sql` trong SQL Server Management Studio để bổ sung các cột và bảng phục vụ web.
5. Cài thư viện: `npm install`.
6. Nếu dùng chatbot, sao chép `.env.example` thành `.env` và tự điền API key. Không đưa `.env` lên GitHub.
7. Tạo tài khoản nhân viên riêng bằng `node tao-nhanvien.cjs ten_tai_khoan`. Mật khẩu ngẫu nhiên chỉ được hiện một lần khi tạo.
8. Chạy `npm start`, rồi mở `http://localhost:3000`.

Máy chủ tự chạy `bo-sung-don-anh.sql` khi khởi động. Script này cần được giữ cùng mã nguồn.

Mở trực tiếp `index.html` hoặc dùng Live Server không chạy được các API và cơ sở dữ liệu.

## Dữ liệu và ảnh

- Giá trong SQL Server/API dùng nghìn đồng; giao diện hiển thị đồng Việt Nam.
- Nút Thanh toán ghi nhận giao dịch trong cơ sở dữ liệu; chưa tích hợp cổng thu tiền trực tuyến.
- Nguồn ảnh minh họa được ghi trong các file `images/nguon-*.json` và trên giao diện.
- Nếu đã tải ảnh sản phẩm mới, sao lưu riêng cả thư mục `images/uploads/` cùng cơ sở dữ liệu.
- Xem thêm [hướng dẫn dự án](HUONGDAN.md). Các mục cập nhật mới ở cuối hướng dẫn thay thế mô tả luồng cũ.

GitHub lưu mã nguồn; đẩy repository lên GitHub không tự triển khai website hoặc sao lưu SQL Server.
