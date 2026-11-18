const { sql } = require("./ketnoi");
const { docAnh, ghiAnh, xoaAnhThu } = require("./anh-upload");

async function layQuanLy(db) {
  const thuoc = await db.request().query(`
    SELECT RTRIM(t.MATHUOC) AS id, t.TENTHUOC AS ten, t.DONGIA AS gia, t.ANH AS anh,
      RTRIM(t.MALOAI) AS maLoai, l.TENLOAI AS nhom,
      COALESCE(n.soLuong, 0) AS daNhap, COALESCE(b.soLuong, 0) AS daBan,
      COALESCE(n.soLuong, 0) - COALESCE(b.soLuong, 0) AS ton
    FROM dbo.THUOC t
    LEFT JOIN dbo.LOAITHUOC l ON l.MALOAI=t.MALOAI
    LEFT JOIN (SELECT MATHUOC, SUM(CONVERT(BIGINT, SOLUONGNHAP)) AS soLuong
      FROM dbo.CHITIETPHIEUNHAP GROUP BY MATHUOC) n ON n.MATHUOC=t.MATHUOC
    LEFT JOIN (SELECT c.MATHUOC, SUM(CONVERT(BIGINT, c.SOLUONG)) AS soLuong
      FROM dbo.CHITIETHOADON c JOIN dbo.HOADON h ON h.SOHD=c.SOHD
      WHERE h.TRANGTHAI IS NULL OR h.TRANGTHAI <> 'da_huy'
      GROUP BY c.MATHUOC) b ON b.MATHUOC=t.MATHUOC
    ORDER BY t.MATHUOC`);
  const loai = await db.request().query(`
    SELECT RTRIM(MALOAI) AS id, TENLOAI AS ten FROM dbo.LOAITHUOC ORDER BY MALOAI`);
  const ncc = await db.request().query(`
    SELECT RTRIM(MANCC) AS id, TENNCC AS ten, DIACHI AS diaChi, SDT AS dienThoai
    FROM dbo.NHACUNGCAP ORDER BY MANCC`);
  return {
    thuoc: thuoc.recordset.map(function (dong) {
      return { ...dong, gia: Number(dong.gia), daNhap: Number(dong.daNhap),
        daBan: Number(dong.daBan), ton: Number(dong.ton) };
    }),
    loai: loai.recordset,
    nhaCungCap: ncc.recordset
  };
}

function maHopLe(ma) {
  return typeof ma === "string" && /^[A-Z0-9_-]{1,10}$/.test(ma);
}
function chuHopLe(chu, toiDa) {
  return typeof chu === "string" && chu.trim().length > 0 && chu.length <= toiDa;
}
function ketQua(trangThai, noiDung) {
  return { trangThai, duLieu: trangThai < 400 ? { thongBao: noiDung } : { loi: noiDung } };
}
function loiDuLieu(loi) {
  const ma = loi.number || loi.originalError?.info?.number;
  if (ma === 2601 || ma === 2627) return ketQua(409, "Mã đã tồn tại. Hãy dùng mã khác hoặc chọn Sửa.");
  if (ma === 547) return ketQua(400, "Dữ liệu liên quan không tồn tại. Hãy tải lại danh sách.");
  throw loi;
}

async function luuThuoc(db, duLieu) {
  const { hanhDong, id, ten, gia, maLoai } = duLieu || {};
  if (hanhDong === 'xoa') {
    if (!maHopLe(id)) return ketQua(400, 'Mã thuốc không hợp lệ.');
    try {
      const xoa = await db.request().input('id', sql.NChar(10), id).query(`
        DELETE dbo.THUOC WHERE MATHUOC=@id
          AND NOT EXISTS(SELECT 1 FROM dbo.CHITIETHOADON WHERE MATHUOC=@id)
          AND NOT EXISTS(SELECT 1 FROM dbo.CHITIETPHIEUNHAP WHERE MATHUOC=@id)
          AND NOT EXISTS(SELECT 1 FROM dbo.DUOCSI_CHUYENTHUOC WHERE MATHUOC=@id);`);
      if (xoa.rowsAffected[0]) return ketQua(200, 'Đã xóa thuốc ' + id + '.');
      const con = await db.request().input('id', sql.NChar(10), id)
        .query('SELECT MATHUOC FROM dbo.THUOC WHERE MATHUOC=@id');
      return con.recordset.length
        ? ketQua(409, 'Thuốc đã có trong hóa đơn, phiếu nhập hoặc đang được dược sĩ phụ trách nên không thể xóa.')
        : ketQua(404, 'Thuốc không còn tồn tại. Hãy tải lại danh sách.');
    } catch (loi) {
      if ((loi.number || loi.originalError?.info?.number) === 547)
        return ketQua(409, 'Thuốc đang được sử dụng trong dữ liệu liên quan nên không thể xóa.');
      throw loi;
    }
  }
  if (!["them", "sua"].includes(hanhDong) || !maHopLe(id) ||
      !chuHopLe(ten, 50) || !maHopLe(maLoai) || typeof gia !== "number" ||
      !Number.isFinite(gia) || gia < 0 || gia > 999999999.99 ||
      Math.abs(gia * 100 - Math.round(gia * 100)) > 0.0001) {
    return ketQua(400, "Kiểm tra mã thuốc, tên (tối đa 50 ký tự), loại và giá bán. Giá phải không âm, là bội số của 10 đồng.");
  }
  const anh = duLieu.anhMoi === undefined ? null : docAnh(duLieu.anhMoi);
  if (duLieu.anhMoi !== undefined && !anh) return ketQua(400, "Ảnh phải là JPG, PNG hoặc WebP hợp lệ, tối đa 3 MB.");
  let daGhiAnh = false;
  try {
    const loai = await db.request().input("maLoai", sql.NChar(10), maLoai)
      .query("SELECT MALOAI FROM dbo.LOAITHUOC WHERE MALOAI=@maLoai");
    if (!loai.recordset.length) return ketQua(400, "Loại thuốc không tồn tại. Hãy thêm loại hoặc tải lại danh sách.");
    const yeuCau = db.request().input("id", sql.NChar(10), id)
      .input("ten", sql.NVarChar(50), ten.trim()).input("gia", sql.Money, gia)
      .input("maLoai", sql.NChar(10), maLoai).input("anh", sql.NVarChar(255), anh ? anh.duongDan : null);
    if (anh) { ghiAnh(anh); daGhiAnh = true; }
    // Không sửa mã thuốc, tồn kho hoặc chi tiết hóa đơn cũ khi đổi giá bán.
    const luu = await yeuCau.query(hanhDong === "them"
      ? "INSERT dbo.THUOC(MATHUOC,TENTHUOC,DONGIA,MALOAI,ANH) VALUES (@id,@ten,@gia,@maLoai,@anh)"
      : "UPDATE dbo.THUOC SET TENTHUOC=@ten,DONGIA=@gia,MALOAI=@maLoai,ANH=COALESCE(@anh,ANH) WHERE MATHUOC=@id");
    if (!luu.rowsAffected[0]) {
      if (daGhiAnh) xoaAnhThu(anh);
      return ketQua(404, "Thuốc không còn tồn tại. Hãy tải lại danh sách.");
    }
    return ketQua(hanhDong === "them" ? 201 : 200, hanhDong === "them"
      ? "Đã thêm thuốc. Hãy lập phiếu nhập kho để có hàng bán."
      : "Đã cập nhật thuốc và giá bán.");
  } catch (loi) {
    if (daGhiAnh) { try { xoaAnhThu(anh); } catch {} }
    return loiDuLieu(loi);
  }
}

async function luuLoai(db, duLieu) {
  const { hanhDong, id, ten } = duLieu || {};
  if (!["them", "sua"].includes(hanhDong) || !maHopLe(id) || !chuHopLe(ten, 50)) {
    return ketQua(400, "Mã loại tối đa 10 ký tự; tên loại từ 1 đến 50 ký tự.");
  }
  try {
    const yeuCau = db.request().input("id", sql.NChar(10), id).input("ten", sql.NVarChar(50), ten.trim());
    const luu = await yeuCau.query(hanhDong === "them"
      ? "INSERT dbo.LOAITHUOC(MALOAI,TENLOAI) VALUES (@id,@ten)"
      : "UPDATE dbo.LOAITHUOC SET TENLOAI=@ten WHERE MALOAI=@id");
    if (!luu.rowsAffected[0]) return ketQua(404, "Loại thuốc không còn tồn tại.");
    return ketQua(hanhDong === "them" ? 201 : 200, "Đã lưu loại thuốc.");
  } catch (loi) { return loiDuLieu(loi); }
}

async function luuNhaCungCap(db, duLieu) {
  const { hanhDong, id, ten, diaChi, dienThoai } = duLieu || {};
  if (!["them", "sua"].includes(hanhDong) || !maHopLe(id) || !chuHopLe(ten, 100) ||
      typeof diaChi !== "string" || diaChi.length > 100 ||
      typeof dienThoai !== "string" || (dienThoai !== "" && !/^\+?\d{8,14}$/.test(dienThoai))) {
    return ketQua(400, "Kiểm tra mã, tên (tối đa 100 ký tự), địa chỉ (tối đa 100 ký tự) và số điện thoại (8–14 chữ số, có thể bắt đầu bằng +).");
  }
  try {
    const yeuCau = db.request().input("id", sql.NChar(10), id).input("ten", sql.NVarChar(100), ten.trim())
      .input("diaChi", sql.NVarChar(100), diaChi.trim() || null).input("dienThoai", sql.VarChar(15), dienThoai || null);
    const luu = await yeuCau.query(hanhDong === "them"
      ? "INSERT dbo.NHACUNGCAP(MANCC,TENNCC,DIACHI,SDT) VALUES (@id,@ten,@diaChi,@dienThoai)"
      : "UPDATE dbo.NHACUNGCAP SET TENNCC=@ten,DIACHI=@diaChi,SDT=@dienThoai WHERE MANCC=@id");
    if (!luu.rowsAffected[0]) return ketQua(404, "Nhà cung cấp không còn tồn tại.");
    return ketQua(hanhDong === "them" ? 201 : 200, "Đã lưu nhà cung cấp.");
  } catch (loi) { return loiDuLieu(loi); }
}

module.exports = { layQuanLy, luuThuoc, luuLoai, luuNhaCungCap };
