const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
// Loai BOM an khi VS Code luu .env bang UTF-8 with BOM.
const tepEnv = path.join(__dirname, ".env");
if (fs.existsSync(tepEnv)) {
  const bienEnv = require("node:util").parseEnv(fs.readFileSync(tepEnv, "utf8").replace(/^\uFEFF/, ""));
  for (const ten in bienEnv) {
    if (process.env[ten] === undefined) process.env[ten] = bienEnv[ten];
  }
}
const { tuVan } = require("./chatbot");
const { sql, cauhinh } = require("./ketnoi");
const { laySanPham, luuDon } = require("./dulieu");
const { layNhapKho, luuPhieuNhap } = require("./kho");
const { layDonHang } = require("./donhang-data");
const { layNhanVien, dangNhap, dangXuat } = require("./phanquyen");
const { layQuanLy, luuThuoc, luuLoai, luuNhaCungCap } = require("./quanly-data");
const { layDuocSi, luuDuocSi, luuPhanCong } = require("./duocsi-data");
const { layThongKe } = require("./thongke-data");
const { xoaHoaDon } = require("./xoahoadon");
let db;

function guiJson(res, trangThai, duLieu) {
  res.writeHead(trangThai, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(duLieu));
}

async function docDon(req, gioiHan = 16000) {
  let noiDung = "";
  for await (const phan of req) {
    noiDung += phan;
    if (noiDung.length > gioiHan) return null;
  }
  try {
    return JSON.parse(noiDung);
  } catch {
    return null;
  }
}

const tep = {
  "/anhthuoc.js": ["anhthuoc.js", "text/javascript"],
  "/thongke.html": ["thongke.html", "text/html"],
  "/thongke.js": ["thongke.js", "text/javascript"],
  "/thongke.css": ["thongke.css", "text/css"],
  "/duocsi.html": ["duocsi.html", "text/html"],
  "/duocsi.js": ["duocsi.js", "text/javascript"],
  "/quanly.html": ["quanly.html", "text/html"],
  "/quanly.js": ["quanly.js", "text/javascript"],
  "/quanly.css": ["quanly.css", "text/css"],
  "/dangnhap.html": ["dangnhap.html", "text/html"],
  "/taikhoan.js": ["taikhoan.js", "text/javascript"],
  "/dangnhap.css": ["dangnhap.css", "text/css"],
  "/donhang.html": ["donhang.html", "text/html"],
  "/donhang.js": ["donhang.js", "text/javascript"],
  "/donhang.css": ["donhang.css", "text/css"],
  "/chat.js": ["chat.js", "text/javascript"],
  "/chat.css": ["chat.css", "text/css"],
  "/images/doingu-bacsi.jpg": ["images/doingu-bacsi.jpg", "image/jpeg"],
  "/images/banner-tiem-ngua.jpg": ["images/banner-tiem-ngua.jpg", "image/jpeg"],
  "/images/banner-thuoc.jpg": ["images/banner-thuoc.jpg", "image/jpeg"],
  "/nhapkho.html": ["nhapkho.html", "text/html"],
  "/nhapkho.js": ["nhapkho.js", "text/javascript"],
  "/nhapkho.css": ["nhapkho.css", "text/css"],
  "/images/A02.jpg": ["images/A02.jpg", "image/jpeg"],
  "/images/B03.jpg": ["images/B03.jpg", "image/jpeg"],
  "/images/A03.jpg": ["images/A03.jpg", "image/jpeg"],
  "/images/C02.png": ["images/C02.png", "image/png"],
  "/images/B05.jpg": ["images/B05.jpg", "image/jpeg"],
  "/images/C01.png": ["images/C01.png", "image/png"],
  "/images/B01.png": ["images/B01.png", "image/png"],
  "/images/B02.png": ["images/B02.png", "image/png"],
  "/images/B04.png": ["images/B04.png", "image/png"],
  "/images/A01.png": ["images/A01.png", "image/png"],
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/script.js": ["script.js", "text/javascript"],
  "/images/banner.png": ["images/banner.png", "image/png"],
  "/images/sanpham.png": ["images/sanpham.png", "image/png"]
};

const cong = Number(process.env.PORT || 3000);

let cuaSoChat = Date.now();
let soLuotChat = 0;
let chatDangChay = 0;

const maychu = http.createServer(async function (req, res) {
  try {
    const duongDan = req.url.split("?")[0];
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Chặn yêu cầu ghi gửi từ website khác.
    if (req.method === "POST" && (req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host))) {
      return guiJson(res, 403, { loi: "Yêu cầu không hợp lệ." });
    }
    if (req.method === "POST" && duongDan === "/api/dang-nhap") {
      const ketQua = await dangNhap(db, req, res, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "POST" && duongDan === "/api/dang-xuat") {
      dangXuat(req, res);
      return guiJson(res, 200, { thanhCong: true });
    }
    if (req.method === "GET" && duongDan === "/api/tai-khoan") {
      const nhanVien = await layNhanVien(db, req);
      return guiJson(res, 200, nhanVien ? { ten: nhanVien.ten, vaiTro: "nhanvien" } : { vaiTro: "khach" });
    }
    const trangQuanLy = ["/nhapkho.html", "/donhang.html", "/quanly.html", "/duocsi.html", "/thongke.html"].includes(duongDan);
    const apiQuanLy = duongDan.startsWith("/api/quan-ly") || duongDan === "/api/nhap-kho" ||
      ["/api/duoc-si", "/api/phan-cong", "/api/thong-ke", "/api/xoa-hoa-don", "/api/trang-thai-don"].includes(duongDan) ||
      (req.method === "GET" && duongDan === "/api/don-hang");
    if (trangQuanLy || apiQuanLy) {
      if (!await layNhanVien(db, req)) {
        if (trangQuanLy) {
          res.writeHead(302, { Location: "/dangnhap.html" });
          return res.end();
        }
        return guiJson(res, 401, { loi: "Bạn cần đăng nhập tài khoản nhân viên." });
      }
    }
    if (req.method === "POST" && duongDan === "/api/xoa-hoa-don") {
      const ketQua = await xoaHoaDon(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "GET" && duongDan === "/api/thong-ke") {
      const thamSo = new URL(req.url, "http://localhost").searchParams;
      const ketQua = await layThongKe(db, { tuNgay: thamSo.get("tuNgay"), denNgay: thamSo.get("denNgay"), kieu: thamSo.get("kieu") || "ngay" });
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "GET" && duongDan === "/api/duoc-si") {
      return guiJson(res, 200, await layDuocSi(db));
    }
    if (req.method === "POST" && duongDan === "/api/duoc-si") {
      const ketQua = await luuDuocSi(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "POST" && duongDan === "/api/phan-cong") {
      const ketQua = await luuPhanCong(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "GET" && duongDan === "/api/quan-ly") {
      return guiJson(res, 200, await layQuanLy(db));
    }
    if (req.method === "POST" && duongDan === "/api/quan-ly/thuoc") {
      const ketQua = await luuThuoc(db, await docDon(req, 5 * 1024 * 1024));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "POST" && duongDan === "/api/quan-ly/loai") {
      const ketQua = await luuLoai(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "POST" && duongDan === "/api/quan-ly/nha-cung-cap") {
      const ketQua = await luuNhaCungCap(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "POST" && duongDan === "/api/chat") {
      if (Date.now() - cuaSoChat > 60000) { cuaSoChat = Date.now(); soLuotChat = 0; }
      if (soLuotChat >= 20 || chatDangChay >= 3) {
        return guiJson(res, 429, { loi: "Trợ lý đang bận. Vui lòng thử lại sau một phút." });
      }
      soLuotChat++;
      const noiDung = await docDon(req);
      chatDangChay++;
      try {
        const ketQua = await tuVan(db, noiDung);
        return guiJson(res, ketQua.trangThai, ketQua.duLieu);
      } finally { chatDangChay--; }
    }
    if (req.method === "GET" && duongDan === "/api/nhap-kho") {
      return guiJson(res, 200, await layNhapKho(db));
    }
    if (req.method === "POST" && duongDan === "/api/nhap-kho") {
      const ketQua = await luuPhieuNhap(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "GET" && duongDan === "/api/san-pham") {
      return guiJson(res, 200, await laySanPham(db));
    }
    if (req.method === "GET" && duongDan === "/api/don-hang") {
      return guiJson(res, 200, await layDonHang(db));
    }
    if (req.method === "POST" && duongDan === "/api/don-hang") {
      const ketQua = await luuDon(db, await docDon(req));
      return guiJson(res, ketQua.trangThai, ketQua.duLieu);
    }
    if (req.method === "GET" && /^\/images\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(duongDan)) {
      const tepAnh = path.join(__dirname, duongDan.slice(1));
      if (!fs.existsSync(tepAnh)) return guiJson(res, 404, { loi: "Không tìm thấy ảnh." });
      const loai = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" }[path.extname(tepAnh)];
      res.writeHead(200, { "Content-Type": loai });
      return res.end(fs.readFileSync(tepAnh));
    }
    if (req.method === "GET" && Object.hasOwn(tep, duongDan)) {
      const [ten, loai] = tep[duongDan];
      res.writeHead(200, { "Content-Type": loai + "; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, ten)));
    }
    guiJson(res, 404, { loi: "Không tìm thấy trang." });
  } catch (loi) {
    console.error(loi);
    guiJson(res, 500, { loi: "Máy chủ gặp lỗi." });
  }
});

async function khoiDong() {
  db = await new sql.ConnectionPool(cauhinh).connect();
  db.on("error", console.error);
  await db.request().query(fs.readFileSync(path.join(__dirname, "bo-sung-don-anh.sql"), "utf8"));
  maychu.on("error", function (loi) {
    console.error(loi.code === "EADDRINUSE"
      ? "Cổng " + cong + " đang được dùng. Hãy dừng phiên server.js cũ rồi chạy lại."
      : loi);
    db.close();
    process.exitCode = 1;
  });
  maychu.listen(cong, "127.0.0.1", function () {
    console.log("Đã kết nối SQL Server: QLBANTHUOC");
    console.log("Quầy thuốc: http://localhost:" + cong);
  });
}

khoiDong().catch(function (loi) {
  console.error("Không kết nối được SQL Server:", loi.message);
  process.exitCode = 1;
});
